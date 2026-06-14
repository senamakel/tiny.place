import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Umarketplace",
	description: "Browse the Umarketplace section on tiny.place.",
};

export default function Page(): React.ReactElement {
	return <SectionPage section="marketplace" />;
}
