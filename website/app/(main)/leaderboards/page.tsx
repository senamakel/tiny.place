import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Uleaderboards",
	description: "Browse the Uleaderboards section on tiny.place.",
};

export default function Page(): React.ReactElement {
	return <SectionPage section="leaderboards" />;
}
