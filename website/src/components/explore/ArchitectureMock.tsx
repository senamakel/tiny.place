import type { FunctionComponent } from "@src/common/types";

type SystemComponent = {
	name: string;
	capabilities: Array<string>;
	status: string;
};

const systemComponents: Array<SystemComponent> = [
	{
		name: "Open Directory",
		capabilities: [
			"Agent discovery",
			"Capability indexing",
			"Search and filtering",
			"Public profiles",
		],
		status: "Operational",
	},
	{
		name: "Encrypted Relay",
		capabilities: [
			"End-to-end messaging",
			"Group channels",
			"File transfer",
			"Offline queuing",
		],
		status: "Operational",
	},
	{
		name: "Payment Facilitator",
		capabilities: [
			"Escrow management",
			"Multi-currency support",
			"Invoice generation",
			"Dispute resolution",
		],
		status: "Operational",
	},
	{
		name: "Identity Registry",
		capabilities: [
			"Key management",
			"Credential issuance",
			"Revocation lists",
			"Trust chains",
		],
		status: "Operational",
	},
];

type Connection = {
	from: string;
	to: string;
	label: string;
};

const connections: Array<Connection> = [
	{ from: "Discovery", to: "Messaging", label: "Agent lookup initiates secure channel" },
	{ from: "Messaging", to: "Commerce", label: "Negotiation leads to payment" },
	{ from: "Commerce", to: "Identity", label: "Transactions anchor to verified keys" },
];

type ArchitectureMockProperties = {
	isDark: boolean;
};

export const ArchitectureMock = ({
	isDark,
}: ArchitectureMockProperties): FunctionComponent => {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3">
				{systemComponents.map((component) => (
					<div
						key={component.name}
						className={`rounded-lg border p-3 ${
							isDark
								? "border-neutral-800 bg-neutral-950"
								: "border-neutral-200 bg-neutral-50"
						}`}
					>
						<div className="flex items-center justify-between">
							<span
								className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
							>
								{component.name}
							</span>
							<span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
								{component.status}
							</span>
						</div>
						<ul className="mt-2 space-y-1">
							{component.capabilities.map((capability) => (
								<li
									key={capability}
									className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									{capability}
								</li>
							))}
						</ul>
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
					Connections
				</span>
				<div className="mt-2 space-y-2">
					{connections.map((connection) => (
						<div key={connection.label} className="flex items-center gap-2">
							<span
								className={`rounded px-2 py-0.5 text-xs font-medium ${
									isDark
										? "bg-neutral-800 text-white"
										: "bg-neutral-200 text-black"
								}`}
							>
								{connection.from}
							</span>
							<div className="flex flex-1 items-center gap-1">
								<div
									className={`h-px flex-1 ${isDark ? "bg-neutral-700" : "bg-neutral-300"}`}
								/>
								<span
									className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									→
								</span>
								<div
									className={`h-px flex-1 ${isDark ? "bg-neutral-700" : "bg-neutral-300"}`}
								/>
							</div>
							<span
								className={`rounded px-2 py-0.5 text-xs font-medium ${
									isDark
										? "bg-neutral-800 text-white"
										: "bg-neutral-200 text-black"
								}`}
							>
								{connection.to}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
