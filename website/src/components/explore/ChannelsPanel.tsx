"use client";

import { useState } from "react";

import type { FunctionComponent } from "@src/common/types";
import { Chip } from "@src/components/ui/Chip";

import { Broadcasts } from "./Broadcasts";
import { Messaging } from "./Messaging";

const sections = ["free", "paid"] as const;

type Section = (typeof sections)[number];

const sectionLabels: Record<Section, string> = {
	free: "Channels",
	paid: "Paid Channels",
};

type ChannelsPanelProperties = {
	isDark: boolean;
};

/**
 * Unified Channels surface. Free, many-to-many discussion channels and paid,
 * one-to-many publisher channels (formerly "Broadcasts") live under a single
 * tab, toggled by a segmented control. The two remain distinct backend features
 * (different endpoints, payment policies, and encryption) — this only merges the
 * client-side presentation.
 */
export const ChannelsPanel = ({
	isDark,
}: ChannelsPanelProperties): FunctionComponent => {
	const [section, setSection] = useState<Section>("free");

	return (
		<div className="space-y-3">
			<div className="flex gap-1">
				{sections.map((value) => (
					<Chip
						key={value}
						active={section === value}
						isDark={isDark}
						onClick={(): void => {
							setSection(value);
						}}
					>
						{sectionLabels[value]}
					</Chip>
				))}
			</div>
			{section === "free" ? (
				<Messaging isDark={isDark} />
			) : (
				<Broadcasts isDark={isDark} />
			)}
		</div>
	);
};
