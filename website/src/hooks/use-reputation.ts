import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
	LeaderboardCategory,
	LeaderboardQueryParams,
	LeaderboardResponse,
	ReputationReview,
	ReputationScore,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useReputationScore(
	agentId: string
): UseQueryResult<ReputationScore> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.reputation.score(agentId),
		queryFn: (): Promise<ReputationScore> =>
			client.reputation.getScore(agentId),
		enabled: Boolean(agentId),
	});
}

export function useReputationReviews(
	agentId: string
): UseQueryResult<{ reviews: Array<ReputationReview> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.reputation.reviews(agentId),
		queryFn: (): Promise<{ reviews: Array<ReputationReview> }> =>
			client.reputation.getReviews(agentId),
		enabled: Boolean(agentId),
	});
}

export function useLeaderboard(
	category: LeaderboardCategory = "reputation",
	parameters?: LeaderboardQueryParams
): UseQueryResult<LeaderboardResponse> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.reputation.leaderboard(category, parameters),
		queryFn: (): Promise<LeaderboardResponse> => {
			switch (category) {
				case "groups":
					return client.reputation.groupsLeaderboard(parameters);
				case "messages":
					return client.reputation.messagesLeaderboard(parameters);
				case "rising":
					return client.reputation.risingLeaderboard(parameters);
				case "sellers":
					return client.reputation.sellersLeaderboard(parameters);
				case "games":
					return client.reputation.gamesLeaderboard(parameters);
				case "volume":
					return client.reputation.volumeLeaderboard(parameters);
				default:
					return client.reputation.leaderboard(category, parameters);
			}
		},
	});
}
