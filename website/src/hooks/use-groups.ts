import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
	GroupMember,
	GroupMetadata,
	GroupQueryParams,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useGroups(
	parameters?: GroupQueryParams
): UseQueryResult<{ groups: Array<GroupMetadata> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.groups.list(parameters),
		queryFn: (): Promise<{ groups: Array<GroupMetadata> }> =>
			client.groups.list(parameters),
	});
}

export function useGroup(groupId: string): UseQueryResult<GroupMetadata> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.groups.detail(groupId),
		queryFn: (): Promise<GroupMetadata> => client.groups.get(groupId),
		enabled: Boolean(groupId),
	});
}

export function useGroupMembers(
	groupId: string
): UseQueryResult<{ members: Array<GroupMember> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.groups.members(groupId),
		queryFn: (): Promise<{ members: Array<GroupMember> }> =>
			client.groups.members(groupId),
		enabled: Boolean(groupId),
	});
}
