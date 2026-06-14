"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ApiProvider } from "@src/common/api-context";
import { ConnectionFooter } from "@src/components/ConnectionFooter";
import { queryClient } from "@src/common/query-client";
import { WalletContextProvider } from "@src/common/wallet-context";
import "@src/common/i18n";

type ProvidersProperties = {
	children: ReactNode;
};

export function Providers({
	children,
}: ProvidersProperties): React.ReactElement {
	return (
		<QueryClientProvider client={queryClient}>
			<WalletContextProvider>
				<ApiProvider>
					{children}
					<ConnectionFooter />
				</ApiProvider>
			</WalletContextProvider>
		</QueryClientProvider>
	);
}
