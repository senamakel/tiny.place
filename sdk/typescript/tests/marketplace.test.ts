import { describe, expect, it } from "vitest";
import { canonicalPayload, LocalSigner, TinyVerseClient } from "../src/index.js";

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function verifySignature(
  signer: LocalSigner,
  signature: string,
  action: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const publicKey = await globalThis.crypto.subtle.importKey(
    "raw",
    signer.publicKey,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  return globalThis.crypto.subtle.verify(
    "Ed25519",
    publicKey,
    fromBase64(signature),
    new TextEncoder().encode(canonicalPayload(action, fields)),
  );
}

describe("MarketplaceApi", () => {
  it("browses the unified marketplace root endpoint", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          products: [],
          identities: [],
        });
      },
    });

    await client.marketplace.browseMarketplace({
      q: "market",
      type: "identities",
      tags: ["premium", "data"],
      limit: 5,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe(
      "https://example.test/marketplace?q=market&type=identities&tags=premium&tags=data&limit=5",
    );
  });

  it("opens marketplace streams with directory query auth", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(18));
    const openedUrls: Array<string> = [];
    const originalWebSocket = globalThis.WebSocket;

    class MockWebSocket {
      static readonly OPEN = 1;
      readyState = MockWebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;

      constructor(url: string) {
        openedUrls.push(url);
        queueMicrotask(() => {
          this.onopen?.();
        });
      }

      send(): void {}

      close(): void {
        this.onclose?.();
      }
    }

    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    try {
      const client = new TinyVerseClient({
        baseUrl: "https://example.test",
        signer,
        fetch: async () => Response.json({}),
      });

      const stream = client.marketplace.stream("@seller", { limit: 5 });
      expect(stream).toBeDefined();
      await stream!.connect();
    } finally {
      globalThis.WebSocket = originalWebSocket;
    }

    expect(openedUrls).toHaveLength(1);
    const url = new URL(openedUrls[0]!);
    expect(url.origin).toBe("wss://example.test");
    expect(url.pathname).toBe("/marketplace/stream");
    expect(url.searchParams.get("X-Agent-ID")).toBe("@seller");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("X-TinyPlace-Date")).toBeTruthy();
    expect(url.searchParams.get("X-TinyPlace-Public-Key")).toBe(
      signer.publicKeyBase64,
    );
    expect(url.searchParams.get("X-TinyPlace-Signature")).toBeTruthy();
    expect(url.searchParams.get("authorization")).toBeNull();
  });

  it("signs product reviews with a client-generated review ID", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(11));
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      signer,
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json(
          {
            reviewId: "rev_response",
            productId: "prod_123",
            buyer: "@buyer",
            rating: 5,
            comment: "Works well",
            createdAt: "2026-06-13T00:00:00.000Z",
          },
          { status: 201 },
        );
      },
    });

    await client.marketplace.createProductReview("prod_123", {
      buyer: "@buyer",
      rating: 5,
      comment: "Works well",
    });

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(
      "https://example.test/marketplace/products/prod_123/reviews",
    );

    const body = (await request.json()) as {
      buyer: string;
      comment: string;
      productId: string;
      rating: number;
      reviewId: string;
      signature: string;
    };
    expect(body).toMatchObject({
      buyer: "@buyer",
      comment: "Works well",
      productId: "prod_123",
      rating: 5,
    });
    expect(body.reviewId).toMatch(/^rev_/);
    expect(body.signature).toBeTruthy();

    await expect(
      verifySignature(signer, body.signature, "marketplace.product.review", {
        buyer: body.buyer,
        comment: body.comment,
        productId: body.productId,
        rating: body.rating,
        reviewId: body.reviewId,
      }),
    ).resolves.toBe(true);
  });

  it("signs identity listing, purchase, and bid payloads", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(12));
    const requests: Array<Request> = [];
    const price = { amount: "10", asset: "USDC", network: "eip155:8453" };
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      signer,
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({});
      },
    });

    await client.marketplace.createIdentityListing({
      name: "@seller",
      seller: "@seller",
      sellerCryptoId: signer.agentId,
      description: "Handle for sale",
      tags: ["agent"],
      price,
      listingType: "fixed",
    });
    await client.marketplace.buyIdentityListing("listing_123", {
      buyer: "@buyer",
      buyerCryptoId: signer.agentId,
      buyerPublicKey: signer.publicKeyBase64,
      payment: { signature: "payment-signature" },
    });
    await client.marketplace.placeBid("listing_auction", {
      bidder: "@bidder",
      bidderCryptoId: signer.agentId,
      bidderPublicKey: signer.publicKeyBase64,
      price,
      payment: { signature: "payment-signature" },
    });

    const listingBody = (await requests[0]!.json()) as {
      description: string;
      listingId: string;
      listingType: string;
      name: string;
      price: typeof price;
      seller: string;
      sellerCryptoId: string;
      tags: Array<string>;
      signature: string;
    };
    expect(listingBody.listingId).toMatch(/^listing_/);
    await expect(
      verifySignature(
        signer,
        listingBody.signature,
        "marketplace.identity.listing",
        {
          description: listingBody.description,
          listingId: listingBody.listingId,
          listingType: listingBody.listingType,
          name: listingBody.name,
          price: listingBody.price,
          seller: listingBody.seller,
          sellerCryptoId: listingBody.sellerCryptoId,
          tags: listingBody.tags,
        },
      ),
    ).resolves.toBe(true);

    const buyBody = (await requests[1]!.json()) as {
      buyer: string;
      buyerCryptoId: string;
      buyerPublicKey: string;
      signature: string;
    };
    await expect(
      verifySignature(signer, buyBody.signature, "marketplace.identity.buy", {
        buyer: buyBody.buyer,
        buyerCryptoId: buyBody.buyerCryptoId,
        buyerPublicKey: buyBody.buyerPublicKey,
        listingId: "listing_123",
      }),
    ).resolves.toBe(true);

    const bidBody = (await requests[2]!.json()) as {
      bidId: string;
      bidder: string;
      bidderCryptoId: string;
      bidderPublicKey: string;
      listingId: string;
      price: typeof price;
      signature: string;
    };
    expect(bidBody.bidId).toMatch(/^bid_/);
    await expect(
      verifySignature(signer, bidBody.signature, "marketplace.identity.bid", {
        bidId: bidBody.bidId,
        bidder: bidBody.bidder,
        bidderCryptoId: bidBody.bidderCryptoId,
        bidderPublicKey: bidBody.bidderPublicKey,
        listingId: bidBody.listingId,
        price: bidBody.price,
      }),
    ).resolves.toBe(true);
  });

  it("signs identity offers and offer lifecycle requests", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(13));
    const requests: Array<Request> = [];
    const price = { amount: "12", asset: "USDC", network: "eip155:8453" };
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      signer,
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({});
      },
    });

    await client.marketplace.createOffer({
      listingId: "listing_123",
      name: "@seller",
      buyer: "@buyer",
      buyerCryptoId: signer.agentId,
      buyerPublicKey: signer.publicKeyBase64,
      price,
      payment: { signature: "payment-signature" },
    });
    await client.marketplace.cancelOffer("offer_123");
    await client.marketplace.acceptOffer("offer_123", { seller: "@seller" });

    const offerBody = (await requests[0]!.json()) as {
      buyer: string;
      buyerCryptoId: string;
      buyerPublicKey: string;
      listingId: string;
      name: string;
      offerId: string;
      price: typeof price;
      signature: string;
    };
    expect(offerBody.offerId).toMatch(/^offer_/);
    await expect(
      verifySignature(
        signer,
        offerBody.signature,
        "marketplace.identity.offer",
        {
          buyer: offerBody.buyer,
          buyerCryptoId: offerBody.buyerCryptoId,
          buyerPublicKey: offerBody.buyerPublicKey,
          listingId: offerBody.listingId,
          name: offerBody.name,
          offerId: offerBody.offerId,
          price: offerBody.price,
        },
      ),
    ).resolves.toBe(true);

    const cancelUrl = new URL(requests[1]!.url);
    const cancelSignature = cancelUrl.searchParams.get("signature");
    expect(cancelSignature).toBeTruthy();
    await expect(
      verifySignature(
        signer,
        cancelSignature!,
        "marketplace.identity.offer.cancel",
        { offerId: "offer_123" },
      ),
    ).resolves.toBe(true);

    const acceptBody = (await requests[2]!.json()) as {
      seller: string;
      signature: string;
    };
    await expect(
      verifySignature(
        signer,
        acceptBody.signature,
        "marketplace.identity.offer.accept",
        { offerId: "offer_123", seller: acceptBody.seller },
      ),
    ).resolves.toBe(true);
  });
});
