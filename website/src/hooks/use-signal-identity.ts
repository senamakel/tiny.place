"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect } from "react";

import type { SignalIdentity } from "@src/common/signal-identity";
import { useAuthStore } from "@src/store/auth";
import { useSignalStore, type SignalStatus } from "@src/store/signal";

type UseSignalIdentityResult = {
	status: SignalStatus;
	identity: SignalIdentity | undefined;
	error: string | undefined;
	/** True once the encryption identity is derived and ready to use. */
	isReady: boolean;
	/** True while the wallet is connected and can derive an identity. */
	canEnable: boolean;
	/**
	 * Derives or loads the encryption identity for the connected wallet. Prompts
	 * for a wallet signature only on first use; subsequent calls load from
	 * IndexedDB. Resolves to the identity, or `undefined` if no wallet/signer.
	 */
	enable: () => Promise<SignalIdentity | undefined>;
};

/**
 * Manages the wallet's end-to-end encryption identity (separate from the wallet
 * auth signer). Resets the identity automatically when the wallet disconnects.
 */
export function useSignalIdentity(): UseSignalIdentityResult {
	const { connected, signMessage } = useWallet();
	const agentId = useAuthStore((state) => state.agentId);
	const status = useSignalStore((state) => state.status);
	const identity = useSignalStore((state) => state.identity);
	const error = useSignalStore((state) => state.error);
	const enableIdentity = useSignalStore((state) => state.enable);
	const reset = useSignalStore((state) => state.reset);

	useEffect(() => {
		if (!connected) {
			reset();
		}
	}, [connected, reset]);

	const canEnable = connected && Boolean(signMessage) && Boolean(agentId);

	const enable = useCallback(async (): Promise<SignalIdentity | undefined> => {
		if (!agentId || !signMessage) {
			return undefined;
		}
		await enableIdentity(agentId, signMessage);
		return useSignalStore.getState().identity;
	}, [agentId, signMessage, enableIdentity]);

	return {
		status,
		identity,
		error,
		isReady: status === "ready",
		canEnable,
		enable,
	};
}
