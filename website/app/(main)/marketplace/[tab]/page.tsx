import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Marketplace",
	description: "Browse the marketplace section on tiny.place.",
};

// The open tab lives in the URL (e.g. /marketplace/active); SectionPage's
// component reads it from the path, so this route renders the same view.
export default function Page(): React.ReactElement {
	return <SectionPage section="marketplace" />;
}
