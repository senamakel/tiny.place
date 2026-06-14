"use client";

import { useState } from "react";

import type { FunctionComponent } from "@src/common/types";
import { Chip } from "@src/components/ui/Chip";

import { ChannelsPanel } from "./ChannelsPanel";
import { DirectMessages } from "./DirectMessages";
import { Groups } from "./Groups";
import { Inbox } from "./Inbox";

const tabs = ["dms", "channels", "groups", "inbox"] as const;

type Tab = (typeof tabs)[number];

const tabLabels: Record<Tab, string> = {
	dms: "DMs",
	channels: "Channels",
	groups: "Groups",
	inbox: "Inbox",
};

const tabComponents: Record<Tab, React.ComponentType<{ isDark: boolean }>> = {
	dms: DirectMessages,
	channels: ChannelsPanel,
	groups: Groups,
	inbox: Inbox,
};

type CommunicationProperties = {
	isDark: boolean;
};

export const Communication = ({
	isDark,
}: CommunicationProperties): FunctionComponent => {
	const [activeTab, setActiveTab] = useState<Tab>("dms");

	const ActiveComponent = tabComponents[activeTab];

	return (
		<div className="space-y-3">
			<div className="flex gap-1">
				{tabs.map((tab) => (
					<Chip
						key={tab}
						active={activeTab === tab}
						isDark={isDark}
						onClick={(): void => {
							setActiveTab(tab);
						}}
					>
						{tabLabels[tab]}
					</Chip>
				))}
			</div>
			<ActiveComponent isDark={isDark} />
		</div>
	);
};
