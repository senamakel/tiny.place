import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { Signer } from "@tinyhumansai/tinyplace";
import { describe, expect, it, vi } from "vitest";

import { ApiProvider } from "@src/common/api-context";

import { useCreateChannel } from "./use-channels";

const createChannel = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() =>
	vi.fn((signer: Signer | undefined) => {
		void signer;
		return { channels: { create: createChannel } };
	})
);

vi.mock("@src/common/api-client", () => ({
	createClient: (signer?: Signer): unknown => createClient(signer),
}));

function wrapper({
	children,
}: {
	children: React.ReactNode;
}): React.ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	return (
		<QueryClientProvider client={queryClient}>
			<ApiProvider>{children}</ApiProvider>
		</QueryClientProvider>
	);
}

describe("useCreateChannel", () => {
	it("creates a plaintext public channel via the channels endpoint", async () => {
		createChannel.mockResolvedValueOnce({
			channelId: "chan_1",
			name: "Open Desk",
			creator: "@alice",
		});

		const { result } = renderHook(() => useCreateChannel(), { wrapper });

		result.current.mutate({
			creator: "@alice",
			name: "Open Desk",
			description: "anyone can read",
			tags: ["explore"],
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Public groups must go through the channel (plaintext) backend, NOT the
		// encrypted group fanout.
		expect(createChannel).toHaveBeenCalledTimes(1);
		expect(createChannel).toHaveBeenCalledWith({
			name: "Open Desk",
			description: "anyone can read",
			creator: "@alice",
			tags: ["explore"],
			category: undefined,
		});
	});
});
