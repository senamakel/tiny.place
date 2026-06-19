import type {
	AgentCard,
	Comment,
	GqlAgentCard,
	GqlComment,
	GqlIdentityBid,
	GqlIdentityListing,
	GqlIdentityOffer,
	GqlIdentitySale,
	GqlLedgerTransaction,
	GqlPost,
	GqlProduct,
	GqlProfile,
	IdentityBid,
	IdentityListing,
	IdentityOffer,
	IdentitySale,
	LedgerTransaction,
	Post,
	Product,
	AgentProfile,
} from "@tinyhumansai/tinyplace";

export function postFromGql(post: GqlPost): Post {
	return {
		...post,
		author: post.author.handle,
		authorCryptoId: post.author.cryptoId,
		likedByMe: post.viewerHasLiked,
	};
}

export function commentFromGql(comment: GqlComment): Comment {
	return {
		...comment,
		author: comment.author.handle,
		authorCryptoId: comment.author.cryptoId,
	};
}

export function productFromGql(product: GqlProduct): Product {
	return {
		...product,
		seller: product.seller.handle,
		sellerCryptoId: product.seller.cryptoId,
	} as Product;
}

/**
 * Map a GraphQL agent card onto the REST {@link AgentCard} shape used across the
 * directory UI, preserving the server-resolved `viewerIsFollowing` edge. The
 * required `createdAt`/`updatedAt` are coerced from the optional GraphQL fields.
 */
export function agentFromGql(agent: GqlAgentCard): AgentCard {
	return {
		...agent,
		createdAt: agent.createdAt ?? "",
		updatedAt: agent.updatedAt ?? "",
	};
}

export function identityBidFromGql(bid: GqlIdentityBid): IdentityBid {
	return {
		...bid,
		bidder: bid.bidder.handle,
		bidderCryptoId: bid.bidderCryptoId || bid.bidder.cryptoId,
	};
}

export function identityListingFromGql(
	listing: GqlIdentityListing
): IdentityListing {
	return {
		...listing,
		seller: listing.seller.handle,
		sellerCryptoId: listing.sellerCryptoId || listing.seller.cryptoId,
		highestBid: listing.highestBid
			? identityBidFromGql(listing.highestBid)
			: undefined,
	};
}

export function identityOfferFromGql(offer: GqlIdentityOffer): IdentityOffer {
	return {
		...offer,
		buyer: offer.buyer.handle,
		buyerCryptoId: offer.buyerCryptoId || offer.buyer.cryptoId,
	};
}

export function identitySaleFromGql(sale: GqlIdentitySale): IdentitySale {
	return {
		...sale,
		seller: sale.seller.handle,
		buyer: sale.buyer.handle,
		buyerCryptoId: sale.buyerCryptoId || sale.buyer.cryptoId,
	};
}

export function ledgerTransactionFromGql(
	transaction: GqlLedgerTransaction
): LedgerTransaction {
	return {
		...transaction,
		metadata: transaction.metadata
			? Object.fromEntries(
					Object.entries(transaction.metadata).map(([key, value]) => [
						key,
						String(value),
					])
				)
			: undefined,
	};
}

export function profileFromGql(
	profile: GqlProfile,
	username: string
): AgentProfile {
	const assets = (profile.identities ?? []).map((identity) => ({
		type: "domain",
		name: identity.username,
		primary: Boolean(identity.primary),
		status: identity.status,
		expiresAt: identity.expiresAt,
	}));
	return {
		username:
			assets.find((asset) => asset.primary)?.name ||
			assets[0]?.name ||
			username,
		cryptoId: profile.cryptoId,
		actorType: profile.actorType as AgentProfile["actorType"],
		displayName: profile.displayName,
		bio: profile.bio,
		link: profile.link,
		tags: profile.tags,
		registeredAt: profile.createdAt,
		status: profile.private ? "private" : "active",
		reputation: {
			agentId: profile.cryptoId,
			username,
			score: 0,
			breakdown: {},
			updatedAt: profile.updatedAt,
		},
		profileVisibility: {
			activity: true,
			groups: true,
			broadcasts: true,
			attestations: true,
			agentCard: Boolean(profile.agentCard),
			searchEngineIndexing: !profile.private,
		},
		assets,
		attestations: profile.attestations.map((attestation) => ({
			platform: attestation.platform,
			handle: attestation.handle,
			status: attestation.status,
		})),
		agentCard: profile.agentCard
			? {
					name: profile.agentCard.name,
					description: profile.agentCard.description,
					url: profile.agentCard.url,
					skills: profile.agentCard.skills,
				}
			: undefined,
	};
}
