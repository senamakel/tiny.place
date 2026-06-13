import type { HttpClient } from "../http.js";
import type { SigningKey } from "../auth.js";
import { signCanonicalPayload } from "../auth.js";
import { canonicalPayload } from "../crypto.js";
import type {
  IdentityBid,
  IdentityBuyRequest,
  IdentityFloor,
  IdentityListing,
  IdentityOffer,
  IdentityOfferAcceptRequest,
  IdentitySale,
  MarketplaceCategory,
  Product,
  ProductCreateRequest,
  ProductPurchase,
  ProductQueryParams,
  ProductReview,
} from "../types/index.js";

export class MarketplaceApi {
  constructor(
    private readonly http: HttpClient,
    private readonly signingKey?: SigningKey,
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
      product.signature = await signCanonicalPayload(
        this.signingKey,
        productSignaturePayload(product),
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

  updateProduct(productId: string, update: Partial<Product>): Promise<Product> {
    return this.http.putDirectoryAuth<Product>(
      `/marketplace/products/${encodeURIComponent(productId)}`,
      update,
    );
  }

  deleteProduct(productId: string): Promise<void> {
    return this.http.deleteDirectoryAuth<void>(
      `/marketplace/products/${encodeURIComponent(productId)}`,
    );
  }

  buyProduct(
    productId: string,
    payment: Record<string, string>,
  ): Promise<ProductPurchase> {
    return this.http.postDirectoryAuth<ProductPurchase>(
      `/marketplace/products/${encodeURIComponent(productId)}/buy`,
      payment,
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
      review.signature = await signCanonicalPayload(
        this.signingKey,
        productReviewSignaturePayload(review),
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
      listing.signature = await signCanonicalPayload(
        this.signingKey,
        identityListingSignaturePayload(listing),
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

    const signature = await signCanonicalPayload(
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
        signature: await signCanonicalPayload(
          this.signingKey,
          identityBuySignaturePayload(listingId, request),
        ),
      };
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
      bid.signature = await signCanonicalPayload(
        this.signingKey,
        identityBidSignaturePayload(bid),
      );
    }

    return this.http.postDirectoryAuth<IdentityListing>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/bids`,
      bid,
    );
  }

  closeListing(listingId: string): Promise<IdentitySale> {
    return this.http.postDirectoryAuth<IdentitySale>(
      `/marketplace/identities/${encodeURIComponent(listingId)}/close`,
    );
  }

  setDefaultIdentityListing(
    listingId: string,
    request?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
      offer.signature = await signCanonicalPayload(
        this.signingKey,
        identityOfferSignaturePayload(offer),
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

    const signature = await signCanonicalPayload(
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
        signature: await signCanonicalPayload(
          this.signingKey,
          identityOfferAcceptSignaturePayload(offerId, request.seller),
        ),
      };
    }

    return this.http.postDirectoryAuth<IdentitySale>(
      `/marketplace/offers/${encodeURIComponent(offerId)}/accept`,
      request,
    );
  }

  // --- Browsing ---

  categories(): Promise<{ categories: Array<MarketplaceCategory> }> {
    return this.http.get<{ categories: Array<MarketplaceCategory> }>(
      "/marketplace/categories",
    );
  }

  featured(): Promise<{ items: Array<unknown> }> {
    return this.http.get<{ items: Array<unknown> }>("/marketplace/featured");
  }

  recent(): Promise<{ sales: Array<IdentitySale> }> {
    return this.http.get<{ sales: Array<IdentitySale> }>(
      "/marketplace/recent",
    );
  }
}

function productSignaturePayload(product: ProductCreateRequest): string {
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

function productReviewSignaturePayload(
  review: Partial<ProductReview>,
): string {
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

function identityOfferSignaturePayload(
  offer: Partial<IdentityOffer>,
): string {
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
