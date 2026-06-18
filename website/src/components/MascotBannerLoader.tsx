"use client";

import dynamic from "next/dynamic";

import type { FunctionComponent } from "@src/common/types";

// Phaser touches `window` at import time, so the banner must never load on the
// server. Mirror RoomLoader and pull it in client-only.
const MascotBanner = dynamic(
	() => import("@src/components/MascotBanner").then((m) => m.MascotBanner),
	{ ssr: false }
);

export const MascotBannerLoader = (): FunctionComponent => {
	return <MascotBanner />;
};
