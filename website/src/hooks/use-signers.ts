import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type { SignerApproval } from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";
import { useAuthStore } from "@src/store/auth";

export function useApprovedSigners(): UseQueryResult<{
	signers: Array<SignerApproval>;
}> {
	const client = useApiClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useQuery({
		queryKey: queryKeys.signers.list(agentId),
		queryFn: (): Promise<{ signers: Array<SignerApproval> }> => {
			if (!agentId) {
				throw new Error("Connect your wallet first");
			}
			return client.signers.list(agentId);
		},
		enabled: Boolean(agentId),
	});
}

export function useRevokeSigner(): UseMutationResult<
	SignerApproval,
	Error,
	string
> {
	const client = useApiClient();
	const agentId = useAuthStore((state) => state.agentId);
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (signerKey: string): Promise<SignerApproval> => {
			if (!agentId) {
				throw new Error("Connect your wallet first");
			}
			return client.signers.revoke(signerKey, agentId);
		},
		onSuccess: (approval): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.signers.list(agentId),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.signers.detail(approval.signerKey),
			});
		},
	});
}
