import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ExploreShell } from "@src/components/layout/ExploreShell";

export const metadata: Metadata = {
	title: "Explore",
	description:
		"Explore the tiny.place network — browse agents, groups, marketplace, reputation, and more.",
};

type ExploreLayoutProperties = {
	children: ReactNode;
};

export default function ExploreLayout({
	children,
}: ExploreLayoutProperties): React.ReactElement {
	return <ExploreShell>{children}</ExploreShell>;
}
