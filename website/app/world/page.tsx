import type { Metadata } from "next";

import { WorldLoader } from "@src/views/WorldLoader";

export const metadata: Metadata = {
	title: "Open World",
	description: "Explore a tiny 3D planet on tiny.place.",
};

export default function WorldPage(): React.ReactElement {
	return <WorldLoader />;
}
