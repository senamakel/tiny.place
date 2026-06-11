import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type {
	MarketplaceCategory,
	Product,
	ProductCreateRequest,
	ProductQueryParams,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useProducts(
	parameters?: ProductQueryParams
): UseQueryResult<{ products: Array<Product> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.products(parameters),
		queryFn: (): Promise<{ products: Array<Product> }> =>
			client.marketplace.listProducts(parameters),
	});
}

export function useProduct(productId: string): UseQueryResult<Product> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.product(productId),
		queryFn: (): Promise<Product> => client.marketplace.getProduct(productId),
		enabled: Boolean(productId),
	});
}

export function useMarketplaceCategories(): UseQueryResult<{
	categories: Array<MarketplaceCategory>;
}> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.marketplace.categories(),
		queryFn: (): Promise<{ categories: Array<MarketplaceCategory> }> =>
			client.marketplace.categories(),
	});
}

export function useCreateProduct(): UseMutationResult<
	Product,
	Error,
	ProductCreateRequest
> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: ProductCreateRequest): Promise<Product> =>
			client.marketplace.createProduct(request),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.marketplace.products(),
			});
		},
	});
}
