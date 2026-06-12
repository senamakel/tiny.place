import { create } from "zustand";

import {
	loadOrCreateSignalIdentity,
	type SignalIdentity,
} from "@src/common/signal-identity";

type SignMessageFunction = (message: Uint8Array) => Promise<Uint8Array>;

export type SignalStatus = "idle" | "loading" | "ready" | "error";

type SignalState = {
	status: SignalStatus;
	identity: SignalIdentity | undefined;
	error: string | undefined;
	/**
	 * Derives (first use) or loads the wallet's encryption identity. Idempotent
	 * while loading/ready for the same wallet.
	 */
	enable: (
		walletAgentId: string,
		signMessage: SignMessageFunction
	) => Promise<void>;
	/** Clears the in-memory identity (e.g. on wallet disconnect). */
	reset: () => void;
};

export const useSignalStore = create<SignalState>()((set, get) => ({
	status: "idle",
	identity: undefined,
	error: undefined,
	enable: async (walletAgentId, signMessage): Promise<void> => {
		const { status } = get();
		if (status === "loading" || status === "ready") {
			return;
		}
		set({ status: "loading", error: undefined });
		try {
			const identity = await loadOrCreateSignalIdentity(
				walletAgentId,
				signMessage
			);
			set({ status: "ready", identity });
		} catch (error) {
			set({
				status: "error",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
	reset: (): void => {
		set({ status: "idle", identity: undefined, error: undefined });
	},
}));
