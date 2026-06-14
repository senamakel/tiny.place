import type { ReactNode } from "react";

import { ExploreShell } from "@src/components/layout/ExploreShell";

type MainLayoutProperties = {
	children: ReactNode;
};

export default function MainLayout({
	children,
}: MainLayoutProperties): React.ReactElement {
	return <ExploreShell>{children}</ExploreShell>;
}
