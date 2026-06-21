"use client";

import { MoonPayProvider } from "@moonpay/moonpay-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";

import { ApiProvider } from "@src/common/api-context";
import { ConnectionFooter } from "@src/components/ConnectionFooter";
import { E2EAuthBridge } from "@src/components/E2EAuthBridge";
import { ExploreShell } from "@src/components/layout/ExploreShell";
import { ThemeController } from "@src/components/ThemeController";
import { WebOnboardingGate } from "@src/components/onboard/WebOnboardingGate";
import { MOONPAY_API_KEY } from "@src/common/moonpay";
import { queryClient } from "@src/common/query-client";
import { useHydrated } from "@src/common/use-hydrated";
import { WalletContextProvider } from "@src/common/wallet-context";
import "@src/common/i18n";
import "@src/common/sentry";

type ProvidersProperties = {
	children: ReactNode;
};

/**
 * MoonPay's SDK is browser-only and is consumed solely by the on-ramp tab, so
 * we keep its provider off the server render: `children` render unwrapped during
 * SSR and the first paint, then the provider mounts client-side. This keeps the
 * rest of the app server-renderable for SEO without pulling MoonPay into the
 * critical path.
 */
function ClientMoonPayProvider({
	children,
}: ProvidersProperties): React.ReactElement {
	const mounted = useHydrated();

	if (!mounted) {
		return <>{children}</>;
	}
	return <MoonPayProvider apiKey={MOONPAY_API_KEY}>{children}</MoonPayProvider>;
}

export function Providers({
	children,
}: ProvidersProperties): React.ReactElement {
	return (
		<QueryClientProvider client={queryClient}>
			<WalletContextProvider>
				<ApiProvider>
					<ThemeController />
					{/* Reads useSearchParams; a Suspense boundary keeps static
					    prerendering from bailing the whole route to CSR. */}
					<Suspense fallback={null}>
						<WebOnboardingGate />
					</Suspense>
					<ClientMoonPayProvider>
						<ExploreShell>{children}</ExploreShell>
					</ClientMoonPayProvider>
					<ConnectionFooter />
					<E2EAuthBridge />
				</ApiProvider>
			</WalletContextProvider>
		</QueryClientProvider>
	);
}
