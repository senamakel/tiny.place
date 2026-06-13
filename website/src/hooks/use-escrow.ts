import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type {
	Escrow,
	EscrowCreateRequest,
	EscrowQueryParams,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

function useEscrowAction<TVariables extends { escrowId: string }>(
	mutationFn: (variables: TVariables) => Promise<Escrow>
): UseMutationResult<Escrow, Error, TVariables> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: (escrow): void => {
			void queryClient.invalidateQueries({ queryKey: ["escrow", "list"] });
			void queryClient.invalidateQueries({
				queryKey: queryKeys.escrow.detail(escrow.escrowId),
			});
		},
	});
}

export function useEscrows(
	parameters?: EscrowQueryParams
): UseQueryResult<{ escrows: Array<Escrow> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.escrow.list(parameters),
		queryFn: async (): Promise<{ escrows: Array<Escrow> }> => {
			const result = await client.escrow.list(parameters);
			return { escrows: result.escrows ?? [] };
		},
	});
}

export function useEscrow(escrowId: string): UseQueryResult<Escrow> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.escrow.detail(escrowId),
		queryFn: (): Promise<Escrow> => client.escrow.get(escrowId),
		enabled: Boolean(escrowId),
	});
}

export function useCreateEscrow(): UseMutationResult<
	Escrow,
	Error,
	EscrowCreateRequest
> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request): Promise<Escrow> => client.escrow.create(request),
		onSuccess: (escrow): void => {
			void queryClient.invalidateQueries({ queryKey: ["escrow", "list"] });
			void queryClient.invalidateQueries({
				queryKey: queryKeys.escrow.detail(escrow.escrowId),
			});
		},
	});
}

export function useAcceptEscrow(): UseMutationResult<
	Escrow,
	Error,
	{ actor: string; escrowId: string }
> {
	const client = useApiClient();
	return useEscrowAction(
		({ actor, escrowId }): Promise<Escrow> =>
			client.escrow.accept(escrowId, actor)
	);
}

export function useCancelEscrow(): UseMutationResult<
	Escrow,
	Error,
	{ actor: string; escrowId: string }
> {
	const client = useApiClient();
	return useEscrowAction(
		({ actor, escrowId }): Promise<Escrow> =>
			client.escrow.cancel(escrowId, actor)
	);
}

export function useDeliverEscrow(): UseMutationResult<
	Escrow,
	Error,
	{ actor: string; description: string; escrowId: string }
> {
	const client = useApiClient();
	return useEscrowAction(
		({ actor, description, escrowId }): Promise<Escrow> =>
			client.escrow.deliver(escrowId, { actor, description })
	);
}
