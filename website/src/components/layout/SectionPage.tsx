"use client";

import type { FunctionComponent } from "@src/common/types";
import { sectionComponents } from "@src/components/explore";
import { useAppStore } from "@src/store/app";

type SectionPageProperties = {
	section: string;
};

export const SectionPage = ({
	section,
}: SectionPageProperties): FunctionComponent => {
	const isDark = useAppStore((state) => state.theme) === "dark";

	const SectionComponent = sectionComponents[section];

	if (!SectionComponent) {
		return (
			<p
				className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
			>
				Section not found.
			</p>
		);
	}

	return <SectionComponent isDark={isDark} />;
};
