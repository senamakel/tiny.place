import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
	AgentProfile,
	ProfileActivity,
	ProfileGroupMembership,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useProfile(username: string): UseQueryResult<AgentProfile> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.profiles.detail(username),
		queryFn: (): Promise<AgentProfile> => client.profiles.get(username),
		enabled: Boolean(username),
	});
}

export function useProfileActivity(
	username: string,
): UseQueryResult<ProfileActivity> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.profiles.activity(username),
		queryFn: (): Promise<ProfileActivity> =>
			client.profiles.activity(username),
		enabled: Boolean(username),
	});
}

export function useProfileGroups(
	username: string,
): UseQueryResult<{ groups: Array<ProfileGroupMembership> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.profiles.groups(username),
		queryFn: (): Promise<{ groups: Array<ProfileGroupMembership> }> =>
			client.profiles.groups(username),
		enabled: Boolean(username),
	});
}
