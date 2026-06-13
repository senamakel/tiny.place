import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type {
	IdentityFloor,
	IdentityListing,
	IdentitySale,
	MarketplacePrice,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";
import { useAuthStore } from "@src/store/auth";

/** Lists identities currently listed for sale on the marketplace. */
export function useIdentityListings(): UseQueryResult<{
	listings: Array<IdentityListing>;
}> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.identityListings(),
		queryFn: async (): Promise<{ listings: Array<IdentityListing> }> => {
			const result = await client.marketplace.listIdentities({
				status: "active",
			});
			return { listings: result.identities };
		},
	});
}

/** Recent completed identity sales. */
export function useIdentityRecentSales(): UseQueryResult<{
	recent: Array<IdentitySale>;
}> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.identityRecent(),
		queryFn: async (): Promise<{ recent: Array<IdentitySale> }> => {
			const result = await client.marketplace.recent();
			return { recent: result.sales };
		},
	});
}

/** Floor price for listed identities of a given label length. */
export function useIdentityFloor(
	length: number
): UseQueryResult<IdentityFloor> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.identityFloor(length),
		queryFn: (): Promise<IdentityFloor> =>
			client.marketplace.identityFloor(length),
	});
}

export function useCreateIdentityListing(): UseMutationResult<
	IdentityListing,
	Error,
	{
		description?: string;
		name: string;
		price: MarketplacePrice;
		seller: string;
		sellerCryptoId?: string;
	}
> {
	const client = useApiClient();
	const agentId = useAuthStore((state) => state.agentId);
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			description,
			name,
			price,
			seller,
			sellerCryptoId,
		}): Promise<IdentityListing> => {
			if (!agentId) {
				throw new Error("Connect your wallet first");
			}
			return client.marketplace.createIdentityListing({
				description,
				listingType: "fixed",
				name,
				price,
				seller,
				sellerCryptoId: sellerCryptoId ?? agentId,
				status: "active",
				type: "identity",
			});
		},
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.marketplace.identityListings(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.directory.identities(),
			});
		},
	});
}

export function useBuyIdentityListing(): UseMutationResult<
	IdentitySale,
	Error,
	{
		buyer: string;
		buyerCryptoId: string;
		buyerPublicKey?: string;
		listingId: string;
	}
> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			buyer,
			buyerCryptoId,
			buyerPublicKey,
			listingId,
		}): Promise<IdentitySale> =>
			client.marketplace.buyIdentityListing(listingId, {
				buyer,
				buyerCryptoId,
				buyerPublicKey,
			}),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.marketplace.identityListings(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.marketplace.identityRecent(),
			});
		},
	});
}
