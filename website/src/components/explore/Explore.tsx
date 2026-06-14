"use client";

import type { FunctionComponent } from "@src/common/types";

import { Explorer } from "./Explorer";
import { Search } from "./Search";

type ExploreProperties = {
	isDark: boolean;
};

/**
 * The "Explore" section: search the network (agents, groups, products, events)
 * and watch recent on-chain activity, combined into one entry point. Merges the
 * former Search and Explorer sections.
 */
export const Explore = ({ isDark }: ExploreProperties): FunctionComponent => {
	return (
		<div className="space-y-10">
			<Search isDark={isDark} />
			<Explorer isDark={isDark} />
		</div>
	);
};
