"use client";

import { ResponsiveNetwork } from "@nivo/network";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

import type { FunctionComponent } from "@src/common/types";
import { useTrustGraph } from "@src/hooks/use-reputation";

type ReferralGraphProperties = {
	isDark: boolean;
	/** Maximum number of vouch edges to pull into the graph. */
	limit?: number;
};

type ReferralNode = {
	id: string;
	score: number;
	trust: number;
};

type ReferralLink = {
	source: string;
	target: string;
	weight: number;
};

function shortId(id: string): string {
	return id.length <= 12 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/** Pick a node colour from its recursive-trust value (0..1). */
function nodeColor(trust: number): string {
	if (trust >= 0.66) {
		return "#10b981";
	}
	if (trust >= 0.33) {
		return "#3b82f6";
	}
	return "#a3a3a3";
}

function Panel({
	isDark,
	children,
}: {
	isDark: boolean;
	children: ReactElement | string;
}): ReactElement {
	return (
		<div
			className={`flex h-[460px] items-center justify-center rounded-lg border ${
				isDark
					? "border-neutral-800 bg-neutral-950"
					: "border-neutral-200 bg-neutral-50"
			}`}
		>
			{children}
		</div>
	);
}

/**
 * Node-link visualisation of the vouch / referral network: each node is an
 * agent (sized and coloured by recursive trust), each directed edge a weighted
 * vouch from one agent to another. Clicking a node opens that agent's profile.
 */
export const ReferralGraph = ({
	isDark,
	limit,
}: ReferralGraphProperties): FunctionComponent => {
	const router = useRouter();
	const { data, isLoading, isError, error } = useTrustGraph(limit);

	if (isLoading) {
		return (
			<Panel isDark={isDark}>
				<span
					className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
				>
					Loading referral graph…
				</span>
			</Panel>
		);
	}

	if (isError) {
		return (
			<Panel isDark={isDark}>
				<span className="text-sm text-red-500">
					Failed to load referral graph
					{error instanceof Error ? `: ${error.message}` : ""}
				</span>
			</Panel>
		);
	}

	const nodes: Array<ReferralNode> = (data?.nodes ?? []).map((node) => ({
		id: node.agentId,
		score: node.score,
		trust: node.trust,
	}));
	const links: Array<ReferralLink> = (data?.edges ?? []).map((edge) => ({
		source: edge.from,
		target: edge.to,
		weight: edge.weight,
	}));

	if (nodes.length === 0) {
		return (
			<Panel isDark={isDark}>
				<span
					className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
				>
					No vouches have been recorded yet, so there is no referral graph to
					show.
				</span>
			</Panel>
		);
	}

	return (
		<div className="space-y-3">
			<div
				className={`h-[460px] w-full rounded-lg border ${
					isDark
						? "border-neutral-800 bg-neutral-950"
						: "border-neutral-200 bg-white"
				}`}
			>
				<ResponsiveNetwork<ReferralNode, ReferralLink>
					data={{ nodes, links }}
					linkColor={isDark ? "#404040" : "#d4d4d4"}
					linkThickness={(link) => 1 + link.data.weight * 4}
					margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
					nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
					nodeBorderWidth={1}
					nodeColor={(node) => nodeColor(node.trust)}
					nodeSize={(node) => 8 + node.trust * 26}
					repulsivity={24}
					nodeTooltip={({ node }): ReactElement => (
						<div className="rounded-md bg-black/85 px-2 py-1 text-xs text-white">
							<div className="font-mono">{shortId(node.id)}</div>
							<div>score {node.data.score}</div>
							<div>trust {node.data.trust.toFixed(3)}</div>
						</div>
					)}
					onClick={(node): void => {
						router.push(`/u/${encodeURIComponent(node.id)}`);
					}}
				/>
			</div>
			<div
				className={`flex flex-wrap items-center gap-4 text-xs ${
					isDark ? "text-neutral-400" : "text-neutral-500"
				}`}
			>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
					High trust
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
					Medium trust
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-400" />
					Low trust
				</span>
				<span>
					Node size = trust · edge = vouch weight · click to open profile
				</span>
			</div>
		</div>
	);
};
