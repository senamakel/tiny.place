"use client";

import dynamic from "next/dynamic";

import type { FunctionComponent } from "@src/common/types";

// Three.js / R3F + the wallet adapter break under SSR, so load client-only.
const World = dynamic(() => import("@src/views/World").then((m) => m.World), {
	ssr: false,
});

export const WorldLoader = (): FunctionComponent => {
	return <World />;
};
