import {
	ConnectionProvider,
	WalletProvider,
	useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl, type Cluster } from "@solana/web3.js";
import { useEffect, useMemo, type ReactNode } from "react";

import type { FunctionComponent } from "@src/common/types";
import { WalletSigner } from "@src/common/wallet-signer";
import { useAuthStore } from "@src/store/auth";

import "@solana/wallet-adapter-react-ui/styles.css";

const network = (import.meta.env.VITE_SOLANA_NETWORK ?? "devnet") as Cluster;

const WalletAuthSync = (): null => {
	const { connected, publicKey, signMessage } = useWallet();
	const setSigner = useAuthStore((state) => state.setSigner);
	const clearSession = useAuthStore((state) => state.clearSession);

	useEffect(() => {
		if (connected && publicKey && signMessage) {
			const publicKeyBytes = publicKey.toBytes();
			const signer = new WalletSigner(publicKeyBytes, signMessage);
			setSigner(signer, signer.agentId);
		} else {
			clearSession();
		}
	}, [connected, publicKey, signMessage, setSigner, clearSession]);

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
