import type { HttpClient } from "../http.js";
import type { SigningKey } from "../auth.js";
import { signFreshCanonicalPayload } from "../auth.js";
import { canonicalPayload } from "../crypto.js";
import type { TinyVerseWebSocket } from "../websocket.js";
import type {
  IdentityBid,
  IdentityBuyRequest,
  IdentityFloor,
  IdentityListing,
  IdentityOffer,
  IdentityOfferAcceptRequest,
  IdentitySale,
  MarketplaceBrowseResponse,
  MarketplaceCategory,
  Product,
  ProductBuyRequest,
  ProductCreateRequest,
  ProductPurchase,
  ProductQueryParams,
  ProductReview,
} from "../types/index.js";

export class MarketplaceApi {
  constructor(
    private readonly http: HttpClient,
    private readonly signingKey?: SigningKey,
    private readonly wsFactory?: (
      path: string,
      options?: { directoryAuth?: boolean },
    ) => TinyVerseWebSocket,
    private readonly publicKeyBase64?: string,
  ) {}

  // --- Products ---

  listProducts(
    params?: ProductQueryParams,
  ): Promise<{ products: Array<Product> }> {
    return this.http.get<{ products: Array<Product> }>(
      "/marketplace/products",
      params as Record<string, unknown>,
    );
  }

  async createProduct(product: ProductCreateRequest): Promise<Product> {
    if (this.signingKey && !product.signature) {
      product = {
        ...product,
        productId: product.productId ?? nextMarketplaceId("prod"),
      };
      product.signature = await signFreshCanonicalPayload(
        this.signingKey,
        productSignaturePayload(product),
      );
    }

    if (product.seller) {
      return this.http.postDirectoryAuthAs<Product>(
        "/marketplace/products",
        product.seller,
        product,
      );
    }

    return this.http.postDirectoryAuth<Product>(
      "/marketplace/products",
      product,
    );
  }

  getProduct(productId: string): Promise<Product> {
    return this.http.get<Product>(
      `/marketplace/products/${encodeURIComponent(productId)}`,
    );
  }

  async updateProduct(productId: string, update: Product): Promise<Product> {
    if (this.signingKey && !update.signature) {
      update = {
        ...update,
        signature: await signFreshCanonicalPayload(
          this.signingKey,
          productSignaturePayload(update),
        ),
      };
    }

    if (update.seller) {
      return this.http.putDirectoryAuthAs<Product>(
        `/marketplace/products/${encodeURIComponent(productId)}`,
        update.seller,
        update,
      );
    }

    return this.http.putDirectoryAuth<Product>(
      `/marketplace/products/${encodeURIComponent(productId)}`,
      update,
    );
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.signingKey) {
      return this.http.deleteDirectoryAuth<void>(
        `/marketplace/products/${encodeURIComponent(productId)}`,
      );
    }

    const signature = await signFreshCanonicalPayload(
      this.signingKey,
      productDeleteSignaturePayload(productId),
    );
    return this.http.deletePublic<void>(
      `/marketplace/products/${encodeURIComponent(productId)}?signature=${encodeURIComponent(signature)}`,
    );
  }

  buyProduct(
    productId: string,
    request: ProductBuyRequest,
  ): Promise<ProductPurchase> {
    return this.http.postDirectoryAuthAs<ProductPurchase>(
      `/marketplace/products/${encodeURIComponent(productId)}/buy`,
      request.buyer,
      request,
    );
  }

  downloadProduct(productId: string, purchaseId: string): Promise<Response> {
    return this.http.getDirectoryAuthRaw(
      `/marketplace/products/${encodeURIComponent(productId)}/download/${encodeURIComponent(purchaseId)}`,
    );
  }

  getProductDelivery(
    productId: string,
    purchaseId: string,
  ): Promise<Record<string, unknown>> {
    return this.http.getDirectoryAuth<Record<string, unknown>>(
      `/marketplace/products/${encodeURIComponent(productId)}/purchases/${encodeURIComponent(purchaseId)}/delivery`,
    );
  }

  updateProductDelivery(
    productId: string,
    purchaseId: string,
    delivery: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.http.postDirectoryAuth<Record<string, unknown>>(
      `/marketplace/products/${encodeURIComponent(productId)}/purchases/${encodeURIComponent(purchaseId)}/delivery`,
      delivery,
    );
  }

  listProductReviews(
    productId: string,
  ): Promise<{ reviews: Array<ProductReview> }> {
    return this.http.get<{ reviews: Array<ProductReview> }>(
      `/marketplace/products/${encodeURIComponent(productId)}/reviews`,
    );
  }

  async createProductReview(
    productId: string,
    review: Partial<ProductReview>,
  ): Promise<ProductReview> {
    if (this.signingKey && !review.signature) {
      review = {
        ...review,
        productId,
        reviewId: review.reviewId ?? nextMarketplaceId("rev"),
      };
      review.signature = await signFreshCanonicalPayload(
        this.signingKey,
        productReviewSignaturePayload(review),
      );
    }

    if (review.buyer) {
      return this.http.postDirectoryAuthAs<ProductReview>(
        `/marketplace/products/${encodeURIComponent(productId)}/reviews`,
        review.buyer,
        review,
      );
    }

    return this.http.post<ProductReview>(
      `/marketplace/products/${encodeURIComponent(productId)}/reviews`,
      review,
    );
  }

  // --- Identity Listings ---

  listIdentities(params?: {
    limit?: number;
    status?: string;
  }): Promise<{ identities: Array<IdentityListing> }> {
    return this.http.get<{ identities: Array<IdentityListing> }>(
      "/marketplace/identities",
      params as Record<string, unknown>,
    );
  }

  async createIdentityListing(
    listing: Partial<IdentityListing>,
  ): Promise<IdentityListing> {
    if (this.signingKey && !listing.signature) {
      listing = {
        ...listing,
        listingId: listing.listingId ?? nextMarketplaceId("listing"),
      };
      listing.signature = await signFreshCanonicalPayload(
        this.signingKey,
        identityListingSignaturePayload(listing),
      );
    }

    if (listing.seller) {
      return this.http.postDirectoryAuthAs<IdentityListing>(
        "/marketplace/identities",
        listing.seller,
        listing,
      );
    }

    return this.http.postDirectoryAuth<IdentityListing>(
      "/marketplace/identities",
      listing,
    );
  }

  async deleteIdentityListing(listingId: string): Promise<void> {
    if (!this.signingKey) {
      return this.http.deleteDirectoryAuth<void>(
        `/marketplace/identities/${encodeURIComponent(listingId)}`,
      );
    }

    const signature = await signFreshCanonicalPayload(
      this.signingKey,
      identityListingCancelSignaturePayload(listingId),
    );
    return this.http.delete<void>(
      `/marketplace/identities/${encodeURIComponent(listingId)}?signature=${encodeURIComponent(signature)}`,
    );
  }

  async buyIdentityListing(
    listingId: string,
    request: IdentityBuyRequest,
  ): Promise<IdentitySale> {
    if (this.signingKey && !request.signature) {
      request = {
        ...request,
        signature: await signFreshCanonicalPayload(
          this.signingKey,
          identityBuySignaturePayload(listingId, request),
        ),
      };
    }

    if (request.buyer) {
      return this.http.postDirectoryAuthAs<IdentitySale>(
        `/marketplace/identities/${encodeURIComponent(listingId)}/buy`,
        request.buyer,
        request,
      );
    }

    return this.http.postDirectoryAuth<IdentitySale>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/buy`,
      request,
    );
  }

  listBids(listingId: string): Promise<{ bids: Array<IdentityBid> }> {
    return this.http.get<{ bids: Array<IdentityBid> }>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/bids`,
    );
  }

  async placeBid(
    listingId: string,
    bid: Partial<IdentityBid>,
  ): Promise<IdentityListing> {
    if (this.signingKey && !bid.signature) {
      bid = {
        ...bid,
        listingId,
        bidId: bid.bidId ?? nextMarketplaceId("bid"),
      };
      bid.signature = await signFreshCanonicalPayload(
        this.signingKey,
        identityBidSignaturePayload(bid),
      );
    }

    if (bid.bidder) {
      return this.http.postDirectoryAuthAs<IdentityListing>(
        `/marketplace/identities/${encodeURIComponent(listingId)}/bids`,
        bid.bidder,
        bid,
      );
    }

    return this.http.postDirectoryAuth<IdentityListing>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/bids`,
      bid,
    );
  }

  closeListing(
    listingId: string,
    sellerId?: string,
    request?: Record<string, unknown>,
  ): Promise<IdentitySale> {
    if (sellerId) {
      return this.http.postDirectoryAuthAs<IdentitySale>(
        `/marketplace/identities/${encodeURIComponent(listingId)}/close`,
        sellerId,
        request,
      );
    }
    return this.http.postDirectoryAuth<IdentitySale>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/close`,
      request,
    );
  }

  setDefaultIdentityListing(
    listingId: string,
    request?: Record<string, unknown>,
    sellerId?: string,
  ): Promise<Record<string, unknown>> {
    if (sellerId) {
      return this.http.postDirectoryAuthAs<Record<string, unknown>>(
        `/marketplace/identities/${encodeURIComponent(listingId)}/default`,
        sellerId,
        request,
      );
    }
    return this.http.postDirectoryAuth<Record<string, unknown>>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/default`,
      request,
    );
  }

  identitySaleHistory(
    name: string,
  ): Promise<{ history: Array<IdentitySale> | null }> {
    return this.http.get<{ history: Array<IdentitySale> | null }>(
      `/marketplace/identities/history/${encodeURIComponent(name)}`,
    );
  }

  identityFloor(length?: number): Promise<IdentityFloor> {
    return this.http.get<IdentityFloor>(
      "/marketplace/identities/floor",
      length != null ? { length } : undefined,
    );
  }

  // --- Offers ---

  async createOffer(offer: Partial<IdentityOffer>): Promise<IdentityOffer> {
    if (this.signingKey && !offer.signature) {
      offer = {
        ...offer,
        offerId: offer.offerId ?? nextMarketplaceId("offer"),
      };
      offer.signature = await signFreshCanonicalPayload(
        this.signingKey,
        identityOfferSignaturePayload(offer),
      );
    }

    if (offer.buyer) {
      return this.http.postDirectoryAuthAs<IdentityOffer>(
        "/marketplace/offers",
        offer.buyer,
        offer,
      );
    }

    return this.http.postDirectoryAuth<IdentityOffer>(
      "/marketplace/offers",
      offer,
    );
  }

  async cancelOffer(offerId: string): Promise<void> {
    if (!this.signingKey) {
      return this.http.deleteDirectoryAuth<void>(
        `/marketplace/offers/${encodeURIComponent(offerId)}`,
      );
    }

    const signature = await signFreshCanonicalPayload(
      this.signingKey,
      identityOfferCancelSignaturePayload(offerId),
    );
    return this.http.delete<void>(
      `/marketplace/offers/${encodeURIComponent(offerId)}?signature=${encodeURIComponent(signature)}`,
    );
  }

  async acceptOffer(
    offerId: string,
    request: IdentityOfferAcceptRequest,
  ): Promise<IdentitySale> {
    if (this.signingKey && !request.signature) {
      request = {
        ...request,
        signature: await signFreshCanonicalPayload(
          this.signingKey,
          identityOfferAcceptSignaturePayload(offerId, request.seller),
        ),
      };
    }

    if (request.seller) {
      return this.http.postDirectoryAuthAs<IdentitySale>(
        `/marketplace/offers/${encodeURIComponent(offerId)}/accept`,
        request.seller,
        request,
      );
    }

    return this.http.postDirectoryAuth<IdentitySale>(
      `/marketplace/offers/${encodeURIComponent(offerId)}/accept`,
      request,
    );
  }

  // --- Browsing ---

  browseMarketplace(
    params?: ProductQueryParams,
  ): Promise<MarketplaceBrowseResponse> {
    return this.http.get<MarketplaceBrowseResponse>(
      "/marketplace",
      params as Record<string, unknown>,
    );
  }

  categories(): Promise<{ categories: Array<MarketplaceCategory> }> {
    return this.http.get<{ categories: Array<MarketplaceCategory> }>(
      "/marketplace/categories",
    );
  }

  featured(): Promise<{ items: Array<unknown> }> {
    return this.http.get<{ items: Array<unknown> }>("/marketplace/featured");
  }

  recent(): Promise<{ sales: Array<IdentitySale> }> {
    return this.http.get<{ sales: Array<IdentitySale> }>("/marketplace/recent");
  }

  stream(
    agentId: string,
    params?: { limit?: number },
  ): TinyVerseWebSocket | undefined {
    if (!this.signingKey || !this.publicKeyBase64) {
      return undefined;
    }
    const query = new URLSearchParams({ "X-Agent-ID": agentId });
    if (params?.limit != null) {
      query.set("limit", String(params.limit));
    }
    return this.wsFactory?.(`/marketplace/stream?${query.toString()}`, {
      directoryAuth: true,
    });
  }
}

function productSignaturePayload(
  product: ProductCreateRequest | Product,
): string {
  return canonicalPayload("marketplace.product", {
    category: product.category,
    deliveryMethod: product.deliveryMethod,
    description: product.description,
    name: product.name,
    price: product.price,
    productId: product.productId ?? "",
    seller: product.seller ?? "",
    sellerCryptoId: product.sellerCryptoId ?? "",
    stock: product.stock ?? null,
    tags: product.tags ?? null,
  });
}

function productDeleteSignaturePayload(productId: string): string {
  return canonicalPayload("marketplace.product.delete", {
    productId,
  });
}

function productReviewSignaturePayload(review: Partial<ProductReview>): string {
  return canonicalPayload("marketplace.product.review", {
    buyer: review.buyer ?? "",
    comment: review.comment ?? "",
    productId: review.productId ?? "",
    rating: review.rating ?? 0,
    reviewId: review.reviewId ?? "",
  });
}

function identityListingSignaturePayload(
  listing: Partial<IdentityListing>,
): string {
  return canonicalPayload("marketplace.identity.listing", {
    description: listing.description ?? "",
    listingId: listing.listingId ?? "",
    listingType: listing.listingType ?? "",
    name: listing.name ?? "",
    price: listing.price ?? null,
    seller: listing.seller ?? "",
    sellerCryptoId: listing.sellerCryptoId ?? "",
    tags: listing.tags ?? null,
  });
}

function identityListingCancelSignaturePayload(listingId: string): string {
  return canonicalPayload("marketplace.identity.listing.cancel", {
    listingId,
  });
}

function identityBuySignaturePayload(
  listingId: string,
  request: IdentityBuyRequest,
): string {
  return canonicalPayload("marketplace.identity.buy", {
    buyer: request.buyer,
    buyerCryptoId: request.buyerCryptoId,
    buyerPublicKey: request.buyerPublicKey ?? "",
    listingId,
  });
}

function identityBidSignaturePayload(bid: Partial<IdentityBid>): string {
  return canonicalPayload("marketplace.identity.bid", {
    bidId: bid.bidId ?? "",
    bidder: bid.bidder ?? "",
    bidderCryptoId: bid.bidderCryptoId ?? "",
    bidderPublicKey: bid.bidderPublicKey ?? "",
    listingId: bid.listingId ?? "",
    price: bid.price ?? null,
  });
}

function identityOfferSignaturePayload(offer: Partial<IdentityOffer>): string {
  return canonicalPayload("marketplace.identity.offer", {
    buyer: offer.buyer ?? "",
    buyerCryptoId: offer.buyerCryptoId ?? "",
    buyerPublicKey: offer.buyerPublicKey ?? "",
    listingId: offer.listingId ?? "",
    name: offer.name ?? "",
    offerId: offer.offerId ?? "",
    price: offer.price ?? null,
  });
}

function identityOfferCancelSignaturePayload(offerId: string): string {
  return canonicalPayload("marketplace.identity.offer.cancel", {
    offerId,
  });
}

function identityOfferAcceptSignaturePayload(
  offerId: string,
  seller: string,
): string {
  return canonicalPayload("marketplace.identity.offer.accept", {
    offerId,
    seller,
  });
}

function nextMarketplaceId(prefix: string): string {
  const random = new Uint8Array(6);
  globalThis.crypto.getRandomValues(random);
  const suffix = Array.from(random, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${prefix}_${Date.now().toString(36)}_${suffix}`;
}
