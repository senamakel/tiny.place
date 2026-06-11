import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
	AgentCard,
	AgentQueryParams,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useAgents(
	parameters?: AgentQueryParams,
): UseQueryResult<{ agents: Array<AgentCard> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.directory.agents(parameters),
		queryFn: (): Promise<{ agents: Array<AgentCard> }> =>
			client.directory.listAgents(parameters),
	});
}

export function useAgent(agentId: string): UseQueryResult<AgentCard> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.directory.agent(agentId),
		queryFn: (): Promise<AgentCard> => client.directory.getAgent(agentId),
		enabled: Boolean(agentId),
	});
}
