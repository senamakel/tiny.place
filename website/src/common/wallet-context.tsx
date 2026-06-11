"use client";

import {
	ConnectionProvider,
	WalletProvider,
	useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl, type Cluster } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import {
	BrowserSessionSigner,
	deriveCryptoId,
} from "@tinyhumansai/tinyplace";
import type { FunctionComponent } from "@src/common/types";
import { WalletSigner } from "@src/common/wallet-signer";
import { createClient } from "@src/common/api-client";
import { useAuthStore } from "@src/store/auth";

import "@solana/wallet-adapter-react-ui/styles.css";

const network = (process.env["NEXT_PUBLIC_SOLANA_NETWORK"] ??
	"devnet") as Cluster;

const SESSION_BUDGET = "10000000";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const WalletAuthSync = (): null => {
	const { connected, publicKey, signMessage } = useWallet();
	const setSigner = useAuthStore((state) => state.setSigner);
	const setSessionSigner = useAuthStore((state) => state.setSessionSigner);
	const setSessionStatus = useAuthStore((state) => state.setSessionStatus);
	const setSessionError = useAuthStore((state) => state.setSessionError);
	const clearSession = useAuthStore((state) => state.clearSession);

	const approveSession = useCallback(
		async (walletSigner: WalletSigner, cryptoId: string): Promise<void> => {
			setSessionStatus("approving");
			try {
				const sessionSigner = await BrowserSessionSigner.create();
				const { authorization } = await sessionSigner.buildApprovalRequest(
					walletSigner,
					cryptoId,
					{
						network: "eip155:8453",
						asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
						budget: SESSION_BUDGET,
						expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
					},
				);

				const client = createClient(walletSigner);
				await client.signers.approve(authorization);

				setSessionSigner(sessionSigner);
			} catch (error) {
				setSessionError(
					error instanceof Error ? error.message : "Session approval failed",
				);
			}
		},
		[setSessionSigner, setSessionStatus, setSessionError],
	);

	useEffect(() => {
		if (connected && publicKey && signMessage) {
			const publicKeyBytes = publicKey.toBytes();
			const walletSigner = new WalletSigner(publicKeyBytes, signMessage);
			const cryptoId = deriveCryptoId(publicKeyBytes);
			setSigner(walletSigner, cryptoId);
			void approveSession(walletSigner, cryptoId);
		} else {
			clearSession();
		}
	}, [connected, publicKey, signMessage, setSigner, clearSession, approveSession]);

	return null;
};

type WalletContextProviderProperties = {
	children: ReactNode;
};

export const WalletContextProvider = ({
	children,
}: WalletContextProviderProperties): FunctionComponent => {
	const endpoint = useMemo(() => clusterApiUrl(network), []);
	const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider autoConnect wallets={wallets}>
				<WalletModalProvider>
					<WalletAuthSync />
					{children}
				</WalletModalProvider>
			</WalletProvider>
		</ConnectionProvider>
	);
};
