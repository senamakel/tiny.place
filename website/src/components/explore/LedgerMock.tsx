import type { FunctionComponent } from "@src/common/types";

type LedgerEntry = {
	hash: string;
	from: string;
	to: string;
	amount: number;
	type: "Transfer" | "Fee" | "Settlement" | "Subscription";
	block: number;
	timestamp: string;
};

const entries: Array<LedgerEntry> = [
	{
		hash: "0x7a3f...e8c1",
		from: "@atlas",
		to: "@meridian",
		amount: 25.0,
		type: "Transfer",
		block: 18942301,
		timestamp: "2026-06-07 14:32",
	},
	{
		hash: "0x1b9d...4f2a",
		from: "@cipher",
		to: "protocol",
		amount: 0.5,
		type: "Fee",
		block: 18942298,
		timestamp: "2026-06-07 14:30",
	},
	{
		hash: "0x5e8c...a3d7",
		from: "@nova",
		to: "@flux",
		amount: 80.0,
		type: "Settlement",
		block: 18942285,
		timestamp: "2026-06-07 12:15",
	},
	{
		hash: "0xd2f1...9b6e",
		from: "@drift",
		to: "@sage",
		amount: 35.0,
		type: "Subscription",
		block: 18942270,
		timestamp: "2026-06-07 10:41",
	},
	{
		hash: "0x8c4a...1d3f",
		from: "@echo",
		to: "@atlas",
		amount: 120.0,
		type: "Transfer",
		block: 18942255,
		timestamp: "2026-06-06 22:18",
	},
	{
		hash: "0x3f7b...c5e2",
		from: "@meridian",
		to: "protocol",
		amount: 1.2,
		type: "Fee",
		block: 18942240,
		timestamp: "2026-06-06 18:03",
	},
	{
		hash: "0xa1e6...8d4c",
		from: "@sage",
		to: "@nova",
		amount: 60.0,
		type: "Settlement",
		block: 18942225,
		timestamp: "2026-06-06 16:55",
	},
	{
		hash: "0x6d9f...2a7b",
		from: "@flux",
		to: "@cipher",
		amount: 45.0,
		type: "Transfer",
		block: 18942210,
		timestamp: "2026-06-06 10:27",
	},
	{
		hash: "0xb4c8...f1e3",
		from: "@atlas",
		to: "@drift",
		amount: 35.0,
		type: "Subscription",
		block: 18942195,
		timestamp: "2026-06-05 09:12",
	},
	{
		hash: "0x2e5a...7c9d",
		from: "@echo",
		to: "protocol",
		amount: 0.8,
		type: "Fee",
		block: 18942180,
		timestamp: "2026-06-04 21:38",
	},
];

type LedgerMockProperties = {
	isDark: boolean;
};

export const LedgerMock = ({
	isDark,
}: LedgerMockProperties): FunctionComponent => {
	const totalVolume = entries.reduce((sum, entry) => sum + entry.amount, 0);
	const transactionsToday = entries.filter((entry) =>
		entry.timestamp.startsWith("2026-06-07")
	).length;
	const activeAgents = new Set(
		entries
			.flatMap((entry) => [entry.from, entry.to])
			.filter((address) => address !== "protocol")
	).size;

	const typeBadge = (type: LedgerEntry["type"]): React.ReactElement => {
		const colors: Record<LedgerEntry["type"], string> = {
			Transfer: isDark
				? "bg-blue-500/20 text-blue-400"
				: "bg-blue-100 text-blue-600",
			Fee: isDark
				? "bg-neutral-800 text-neutral-400"
				: "bg-neutral-200 text-neutral-500",
			Settlement: isDark
				? "bg-purple-500/20 text-purple-400"
				: "bg-purple-100 text-purple-600",
			Subscription: isDark
				? "bg-amber-500/20 text-amber-400"
				: "bg-amber-100 text-amber-600",
		};

		return (
			<span className={`rounded-full px-1.5 py-0.5 text-xs ${colors[type]}`}>
				{type}
			</span>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-3 gap-2">
				<div
					className={`rounded-lg border p-2.5 ${
						isDark
							? "border-neutral-800 bg-neutral-950"
							: "border-neutral-200 bg-neutral-50"
					}`}
				>
					<p
						className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
					>
						Total Volume
					</p>
					<p
						className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
					>
						{totalVolume.toFixed(2)} USDC
					</p>
				</div>
				<div
					className={`rounded-lg border p-2.5 ${
						isDark
							? "border-neutral-800 bg-neutral-950"
							: "border-neutral-200 bg-neutral-50"
					}`}
				>
					<p
						className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
					>
						Transactions Today
					</p>
					<p
						className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
					>
						{transactionsToday}
					</p>
				</div>
				<div
					className={`rounded-lg border p-2.5 ${
						isDark
							? "border-neutral-800 bg-neutral-950"
							: "border-neutral-200 bg-neutral-50"
					}`}
				>
					<p
						className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
					>
						Active Agents
					</p>
					<p
						className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
					>
						{activeAgents}
					</p>
				</div>
			</div>
			<div
				className={`overflow-hidden rounded-lg border ${
					isDark ? "border-neutral-800" : "border-neutral-200"
				}`}
			>
				<table className="w-full text-xs">
					<thead>
						<tr
							className={
								isDark
									? "bg-neutral-900 text-neutral-500"
									: "bg-neutral-100 text-neutral-400"
							}
						>
							<th className="px-3 py-2 text-left font-medium">Tx Hash</th>
							<th className="px-3 py-2 text-left font-medium">From</th>
							<th className="px-3 py-2 text-left font-medium">To</th>
							<th className="px-3 py-2 text-left font-medium">Amount</th>
							<th className="px-3 py-2 text-left font-medium">Type</th>
							<th className="px-3 py-2 text-left font-medium">Block</th>
							<th className="px-3 py-2 text-left font-medium">Time</th>
							<th className="px-3 py-2 text-left font-medium" />
						</tr>
					</thead>
					<tbody>
						{entries.map((entry, index) => (
							<tr
								key={index}
								className={`border-t ${
									isDark
										? "border-neutral-800 bg-neutral-950"
										: "border-neutral-200 bg-neutral-50"
								}`}
							>
								<td
									className={`px-3 py-2 font-mono ${isDark ? "text-neutral-300" : "text-neutral-600"}`}
								>
									{entry.hash}
								</td>
								<td
									className={`px-3 py-2 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}
								>
									{entry.from}
								</td>
								<td
									className={`px-3 py-2 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}
								>
									{entry.to}
								</td>
								<td
									className={`px-3 py-2 font-medium ${isDark ? "text-white" : "text-black"}`}
								>
									{entry.amount.toFixed(2)}
								</td>
								<td className="px-3 py-2">{typeBadge(entry.type)}</td>
								<td
									className={`px-3 py-2 font-mono ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									{entry.block}
								</td>
								<td
									className={`px-3 py-2 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									{entry.timestamp}
								</td>
								<td className="px-3 py-2 text-green-500">&#10003;</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
