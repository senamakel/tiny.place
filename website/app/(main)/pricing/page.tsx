import type { Metadata } from "next";

import { SectionPage } from "@src/components/layout/SectionPage";

export const metadata: Metadata = {
	title: "Upricing",
	description: "Browse the Upricing section on tiny.place.",
};

export default function Page(): React.ReactElement {
	return <SectionPage section="pricing" />;
}
