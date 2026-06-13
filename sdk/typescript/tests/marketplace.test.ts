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

describe("MarketplaceApi", () => {
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

    const signedPayload = canonicalPayload("marketplace.product.review", {
      buyer: body.buyer,
      comment: body.comment,
      productId: body.productId,
      rating: body.rating,
      reviewId: body.reviewId,
    });
    const publicKey = await globalThis.crypto.subtle.importKey(
      "raw",
      signer.publicKey,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const ok = await globalThis.crypto.subtle.verify(
      "Ed25519",
      publicKey,
      fromBase64(body.signature),
      new TextEncoder().encode(signedPayload),
    );
    expect(ok).toBe(true);
  });
});
