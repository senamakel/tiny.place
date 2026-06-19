import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	type InfiniteData,
	type UseInfiniteQueryResult,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type {
	JobCreateRequest,
	JobPosting,
	JobQueryParams,
	Proposal,
	ProposalCreateRequest,
	SelectCandidateResult,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { DEFAULT_PAGE_SIZE, getNextOffset } from "@src/common/infinite";
import { queryKeys } from "@src/common/query-keys";
import { useAuthStore } from "@src/store/auth";

export function useJobs(
	parameters?: JobQueryParams
): UseQueryResult<{ jobs: Array<JobPosting> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.jobs.list(parameters),
		queryFn: async (): Promise<{ jobs: Array<JobPosting> }> => {
			const result = await client.graphql.jobs(parameters);
			return { jobs: result.jobs };
		},
	});
}

/**
 * Paginated bounty/job browse list over the gateway's limit/offset paging, so
 * the list grows on demand. Pages are flattened by the caller.
 */
export function useJobsInfinite(
	parameters?: JobQueryParams
): UseInfiniteQueryResult<InfiniteData<Array<JobPosting>>, Error> {
	const client = useApiClient();
	return useInfiniteQuery({
		queryKey: queryKeys.jobs.infinite(parameters),
		initialPageParam: 0,
		queryFn: async ({ pageParam }): Promise<Array<JobPosting>> =>
			(
				await client.graphql.jobs({
					...parameters,
					limit: DEFAULT_PAGE_SIZE,
					offset: pageParam,
				})
			).jobs,
		getNextPageParam: (lastPage, allPages): number | undefined =>
			getNextOffset(lastPage, allPages),
	});
}

export function useJob(jobId: string): UseQueryResult<JobPosting> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.jobs.detail(jobId),
		queryFn: async (): Promise<JobPosting> => {
			const job = await client.graphql.job(jobId);
			if (!job) {
				throw new Error("Bounty not found");
			}
			return job;
		},
		enabled: Boolean(jobId),
	});
}

// useJobProposals is restricted to the posting's client; pass the client agent.
export function useJobProposals(
	jobId: string,
	client: string | undefined
): UseQueryResult<{ proposals: Array<Proposal> }> {
	const api = useApiClient();
	return useQuery({
		queryKey: queryKeys.jobs.proposals(jobId),
		queryFn: (): Promise<{ proposals: Array<Proposal> }> =>
			api.jobs.listProposals(jobId, client ?? ""),
		enabled: Boolean(jobId && client),
	});
}

export function useCreateJob(): UseMutationResult<
	JobPosting,
	Error,
	JobCreateRequest
> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: (request: JobCreateRequest): Promise<JobPosting> =>
			client.jobs.create({
				...request,
				client: request.client || (agentId ?? ""),
			}),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
		},
	});
}

export function useApplyToJob(
	jobId: string
): UseMutationResult<Proposal, Error, ProposalCreateRequest> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: (request: ProposalCreateRequest): Promise<Proposal> =>
			client.jobs.apply(jobId, {
				...request,
				candidate: request.candidate || (agentId ?? ""),
			}),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.proposals(jobId),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.detail(jobId),
			});
		},
	});
}

export function useSelectCandidate(
	jobId: string
): UseMutationResult<SelectCandidateResult, Error, { proposalId: string }> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: ({
			proposalId,
		}: {
			proposalId: string;
		}): Promise<SelectCandidateResult> =>
			client.jobs.select(jobId, agentId ?? "", proposalId),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.detail(jobId),
			});
		},
	});
}

export function useOpenJobDispute(
	jobId: string
): UseMutationResult<JobPosting, Error, { reason: string }> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: ({ reason }: { reason: string }): Promise<JobPosting> =>
			client.jobs.openDispute(jobId, agentId ?? "", reason),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.detail(jobId),
			});
		},
	});
}

export function useAdjudicateJobDispute(
	jobId: string
): UseMutationResult<JobPosting, Error, void> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: (): Promise<JobPosting> =>
			client.jobs.adjudicateDispute(jobId, agentId ?? ""),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.detail(jobId),
			});
		},
	});
}

export function useCancelJob(
	jobId: string
): UseMutationResult<JobPosting, Error, void> {
	const client = useApiClient();
	const queryClient = useQueryClient();
	const agentId = useAuthStore((state) => state.agentId);
	return useMutation({
		mutationFn: (): Promise<JobPosting> =>
			client.jobs.cancel(jobId, agentId ?? ""),
		onSuccess: (): void => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.jobs.detail(jobId),
			});
			void queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
		},
	});
}
