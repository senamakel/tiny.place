import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
	Channel,
	ChannelCategory,
	ChannelMessage,
	ChannelQueryParams,
} from "@tinyhumansai/tinyplace";

import { useApiClient } from "@src/common/api-context";
import { queryKeys } from "@src/common/query-keys";

export function useChannels(
	parameters?: ChannelQueryParams
): UseQueryResult<{ channels: Array<Channel> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.channels.list(parameters),
		queryFn: (): Promise<{ channels: Array<Channel> }> =>
			client.channels.list(parameters),
	});
}

export function useChannel(channelId: string): UseQueryResult<Channel> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.channels.detail(channelId),
		queryFn: (): Promise<Channel> => client.channels.get(channelId),
		enabled: Boolean(channelId),
	});
}

export function useChannelMessages(
	channelId: string,
	parameters?: { limit?: number; offset?: number }
): UseQueryResult<{ messages: Array<ChannelMessage> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.channels.messages(channelId),
		queryFn: (): Promise<{ messages: Array<ChannelMessage> }> =>
			client.channels.listMessages(channelId, parameters),
		enabled: Boolean(channelId),
	});
}

export function useTrendingChannels(
	limit?: number
): UseQueryResult<{ channels: Array<Channel> }> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.channels.trending(),
		queryFn: (): Promise<{ channels: Array<Channel> }> =>
			client.channels.trending(limit),
	});
}

export function useChannelCategories(): UseQueryResult<{
	categories: Array<ChannelCategory>;
}> {
	const client = useApiClient();
	return useQuery({
		queryKey: queryKeys.channels.categories(),
		queryFn: (): Promise<{ categories: Array<ChannelCategory> }> =>
			client.channels.categories(),
	});
}
