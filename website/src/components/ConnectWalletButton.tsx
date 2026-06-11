"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import type { FunctionComponent } from "@src/common/types";

export const ConnectWalletButton = (): FunctionComponent => {
	return <WalletMultiButton />;
};
