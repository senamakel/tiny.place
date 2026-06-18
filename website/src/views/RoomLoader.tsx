"use client";

import dynamic from "next/dynamic";

import type { FunctionComponent } from "@src/common/types";

const Room = dynamic(() => import("@src/views/Room").then((m) => m.Room), {
	ssr: false,
});

export const RoomLoader = (): FunctionComponent => {
	return <Room />;
};
