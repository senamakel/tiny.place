import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Fund your wallet",
	description:
		"Fund your tiny.place Solana wallet with SOL or USDC — by card via MoonPay, or by bridging crypto via deBridge.",
};

// The CLI opens `/fund?address=…&asset=…`; this renders the same on-ramp /
// off-ramp experience as `/onramp`, with the wallet and asset preselected from
// the query string by the OnRamp component.
export default function Page(): React.ReactElement {
	return <SectionPage section="onramp" />;
}
