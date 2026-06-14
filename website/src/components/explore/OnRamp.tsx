"use client";

import { MoonPayBuyWidget, MoonPaySellWidget } from "@moonpay/moonpay-react";
import { useWallet } from "@solana/wallet-adapter-react";

import type { FunctionComponent } from "@src/common/types";
import {
	MOONPAY_BASE_CURRENCY_CODE,
	MOONPAY_USDC_SOLANA_CURRENCY_CODE,
} from "@src/common/moonpay";
import { Chip } from "@src/components/ui/Chip";
import { useTabRoute } from "@src/hooks/use-tab-route";

const tabs = ["onramp", "offramp"] as const;

type Tab = (typeof tabs)[number];

const tabLabels: Record<Tab, string> = {
	onramp: "On-ramp",
	offramp: "Off-ramp",
};

type WidgetProperties = {
	isDark: boolean;
	walletAddress?: string;
};

// Funds the connected SOL wallet with USDC (fiat → USDC on Solana).
const OnRampWidget = ({
	walletAddress,
}: WidgetProperties): FunctionComponent => (
	<MoonPayBuyWidget
		visible
		baseCurrencyCode={MOONPAY_BASE_CURRENCY_CODE}
		defaultCurrencyCode={MOONPAY_USDC_SOLANA_CURRENCY_CODE}
		variant="embedded"
		walletAddress={walletAddress}
	/>
);

// Cashes USDC on Solana out to fiat, refunding to the connected SOL wallet.
const OffRampWidget = ({
	walletAddress,
}: WidgetProperties): FunctionComponent => (
	<MoonPaySellWidget
		visible
		baseCurrencyCode={MOONPAY_USDC_SOLANA_CURRENCY_CODE}
		quoteCurrencyCode={MOONPAY_BASE_CURRENCY_CODE}
		refundWalletAddress={walletAddress}
		variant="embedded"
	/>
);

type OnRampProperties = {
	isDark: boolean;
};

export const OnRamp = ({ isDark }: OnRampProperties): FunctionComponent => {
	const { publicKey } = useWallet();
	const walletAddress = publicKey?.toBase58();
	const { activeTab, setTab } = useTabRoute<Tab>(tabs, "onramp");

	return (
		<div className="space-y-3">
			<div>
				<h2
					className={`text-lg font-bold ${isDark ? "text-white" : "text-black"}`}
				>
					On-ramp / Off-ramp
				</h2>
				<p
					className={`mt-1 text-sm ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
				>
					Buy or sell USDC on Solana for your wallet, powered by MoonPay.
				</p>
			</div>

			{walletAddress ? (
				<p
					className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
				>
					Wallet: {walletAddress}
				</p>
			) : (
				<p
					className={`rounded-lg border p-3 text-sm ${
						isDark
							? "border-neutral-800 bg-neutral-950 text-neutral-400"
							: "border-neutral-200 bg-neutral-50 text-neutral-500"
					}`}
				>
					Connect your wallet to prefill the destination address. You can also
					enter one manually in the widget below.
				</p>
			)}

			<div className="flex gap-1">
				{tabs.map((tab) => (
					<Chip
						key={tab}
						active={activeTab === tab}
						isDark={isDark}
						onClick={(): void => {
							setTab(tab);
						}}
					>
						{tabLabels[tab]}
					</Chip>
				))}
			</div>

			{activeTab === "onramp" ? (
				<OnRampWidget isDark={isDark} walletAddress={walletAddress} />
			) : (
				<OffRampWidget isDark={isDark} walletAddress={walletAddress} />
			)}
		</div>
	);
};
