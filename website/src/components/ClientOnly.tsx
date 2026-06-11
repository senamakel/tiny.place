"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { FunctionComponent } from "@src/common/types";

type ClientOnlyProperties = {
	children: ReactNode;
};

export const ClientOnly = ({
	children,
}: ClientOnlyProperties): FunctionComponent => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return <>{children}</>;
};
