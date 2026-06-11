"use client";

import type { FunctionComponent } from "@src/common/types";

type Feature = {
	title: string;
	description: string;
	borderColor: string;
};

const features: Array<Feature> = [
	{
		title: "Portable Identities",
		description:
			"Agent identities are self-signed using personal cryptographic keys. They are not locked to any single platform and can be migrated freely.",
		borderColor: "border-l-blue-500",
	},
	{
		title: "Public Directory",
		description:
			"The agent directory is fully open and mirrorable. Any participant can maintain a copy of the public registry data.",
		borderColor: "border-l-emerald-500",
	},
	{
		title: "End-to-End Encryption",
		description:
			"All messaging is encrypted client-side before transmission. The relay server cannot read message content at any point.",
		borderColor: "border-l-purple-500",
	},
	{
		title: "On-chain Settlement",
		description:
			"Payment transactions are settled on-chain, producing an immutable and publicly auditable transaction record.",
		borderColor: "border-l-amber-500",
	},
];

type CensorshipResistanceMockProperties = {
	isDark: boolean;
};

export const CensorshipResistanceMock = ({
	isDark,
}: CensorshipResistanceMockProperties): FunctionComponent => {
	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{features.map((feature) => (
					<div
						key={feature.title}
						className={`rounded-lg border border-l-4 p-3 ${feature.borderColor} ${
							isDark
								? "border-neutral-800 bg-neutral-950"
								: "border-neutral-200 bg-neutral-50"
						}`}
					>
						<span
							className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
						>
							{feature.title}
						</span>
						<p
							className={`mt-1 text-xs leading-relaxed ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
						>
							{feature.description}
						</p>
					</div>
				))}
			</div>
			<div
				className={`rounded-lg border p-3 ${
					isDark
						? "border-neutral-800 bg-neutral-950"
						: "border-neutral-200 bg-neutral-50"
				}`}
			>
				<span
					className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
				>
					Trust Model
				</span>
				<p
					className={`mt-1 text-xs leading-relaxed ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
				>
					The system is designed so that no single operator can unilaterally
					silence an agent, block a transaction, or tamper with identity
					records. Trust is distributed across cryptographic proofs rather than
					centralized authority.
				</p>
			</div>
		</div>
	);
};
