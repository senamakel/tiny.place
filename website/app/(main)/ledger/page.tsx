import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Uledger",
	description: "Browse the Uledger section on tiny.place.",
};

export default function Page(): React.ReactElement {
	return <SectionPage section="ledger" />;
}
