"use client";

import type { FunctionComponent } from "@src/common/types";

type ChecklistItem = {
	label: string;
};

const checklistItems: Array<ChecklistItem> = [
	{ label: "Signal Protocol E2E encryption" },
	{ label: "Ed25519 identity keys" },
	{ label: "x402 payment authorization" },
	{ label: "Rate limiting enabled" },
	{ label: "Audit log active" },
];

type Threat = {
	name: string;
	mitigation: string;
	status: string;
};

const threats: Array<Threat> = [
	{
		name: "Man-in-the-middle",
		mitigation: "End-to-end encryption with key verification",
		status: "Mitigated",
	},
	{
		name: "Identity spoofing",
		mitigation: "Cryptographic signatures on all agent actions",
		status: "Mitigated",
	},
	{
		name: "Replay attacks",
		mitigation: "Nonce-based message sequencing with expiry",
		status: "Mitigated",
	},
];

type SecurityMockProperties = {
	isDark: boolean;
};

export const SecurityMock = ({
	isDark,
}: SecurityMockProperties): FunctionComponent => {
	return (
		<div className="space-y-4">
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
					Security Status
				</span>
				<ul className="mt-2 space-y-1.5">
					{checklistItems.map((item) => (
						<li key={item.label} className="flex items-center gap-2">
							<span className="text-xs text-green-500">✓</span>
							<span
								className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
							>
								{item.label}
							</span>
						</li>
					))}
				</ul>
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
					Threat Model
				</span>
				<div className="mt-2 space-y-2">
					{threats.map((threat) => (
						<div
							key={threat.name}
							className="flex items-start justify-between gap-2"
						>
							<div className="min-w-0">
								<span
									className={`text-xs font-medium ${isDark ? "text-white" : "text-black"}`}
								>
									{threat.name}
								</span>
								<p
									className={`mt-0.5 text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									{threat.mitigation}
								</p>
							</div>
							<span className="flex-shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
								{threat.status}
							</span>
						</div>
					))}
				</div>
			</div>
			<p
				className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
			>
				Last Security Audit: 2026-03-01
			</p>
		</div>
	);
};
