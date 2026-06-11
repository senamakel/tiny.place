"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { FunctionComponent } from "@src/common/types";

const Providers = dynamic(
	() => import("./providers").then((m) => m.Providers),
	{ ssr: false },
);

type ClientLayoutProperties = {
	children: ReactNode;
};

export const ClientLayout = ({
	children,
}: ClientLayoutProperties): FunctionComponent => {
	return <Providers>{children}</Providers>;
};
