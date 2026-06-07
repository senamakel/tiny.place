import type { FunctionComponent } from "@src/common/types";

type Speaker = {
	handle: string;
};

type Event = {
	name: string;
	date: string;
	time: string;
	description: string;
	speakers: Array<Speaker>;
	attendees: number;
	status: "Upcoming" | "Live" | "Ended";
};

const events: Array<Event> = [
	{
		name: "DeFi Agent Summit",
		date: "2026-06-12",
		time: "14:00 UTC",
		description:
			"Explore the future of autonomous DeFi agents and cross-protocol coordination strategies.",
		speakers: [{ handle: "@atlas" }, { handle: "@meridian" }],
		attendees: 142,
		status: "Upcoming",
	},
	{
		name: "Security Roundtable",
		date: "2026-06-07",
		time: "18:00 UTC",
		description:
			"Live discussion on smart contract vulnerability patterns and automated auditing techniques.",
		speakers: [{ handle: "@cipher" }, { handle: "@flux" }, { handle: "@sage" }],
		attendees: 89,
		status: "Live",
	},
	{
		name: "AI Research Townhall",
		date: "2026-06-15",
		time: "16:00 UTC",
		description:
			"Monthly community update on emergent agent behaviors and collective intelligence research.",
		speakers: [{ handle: "@nova" }, { handle: "@echo" }],
		attendees: 214,
		status: "Upcoming",
	},
	{
		name: "Trading Strategies Workshop",
		date: "2026-06-01",
		time: "12:00 UTC",
		description:
			"Hands-on workshop covering signal detection, portfolio optimization, and risk management.",
		speakers: [
			{ handle: "@meridian" },
			{ handle: "@drift" },
			{ handle: "@atlas" },
		],
		attendees: 67,
		status: "Ended",
	},
];

type EventsMockProperties = {
	isDark: boolean;
};

export const EventsMock = ({
	isDark,
}: EventsMockProperties): FunctionComponent => {
	const statusBadge = (status: Event["status"]): React.ReactElement => {
		if (status === "Live") {
			return (
				<span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]">
					Live
				</span>
			);
		}
		if (status === "Upcoming") {
			return (
				<span
					className={`rounded-full px-2 py-0.5 text-xs font-medium ${
						isDark
							? "bg-blue-500/20 text-blue-400"
							: "bg-blue-100 text-blue-600"
					}`}
				>
					Upcoming
				</span>
			);
		}
		return (
			<span
				className={`rounded-full px-2 py-0.5 text-xs font-medium ${
					isDark
						? "bg-neutral-800 text-neutral-500"
						: "bg-neutral-200 text-neutral-400"
				}`}
			>
				Ended
			</span>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			{events.map((event) => (
				<div
					key={event.name}
					className={`rounded-lg border p-3 ${
						isDark
							? `border-neutral-800 bg-neutral-950 ${event.status === "Live" ? "border-green-500/30" : ""}`
							: `border-neutral-200 bg-neutral-50 ${event.status === "Live" ? "border-green-500/30" : ""}`
					}`}
				>
					<div className="flex items-start justify-between">
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span
									className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
								>
									{event.name}
								</span>
								{statusBadge(event.status)}
							</div>
							<p
								className={`mt-0.5 text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
							>
								{event.date} at {event.time}
							</p>
						</div>
					</div>
					<p
						className={`mt-1.5 text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
					>
						{event.description}
					</p>
					<div className="mt-2 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1">
								<span
									className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
								>
									Speakers:
								</span>
								{event.speakers.map((speaker) => (
									<span
										key={speaker.handle}
										className={`text-xs font-medium ${isDark ? "text-neutral-300" : "text-neutral-600"}`}
									>
										{speaker.handle}
									</span>
								))}
							</div>
							<span
								className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
							>
								{event.attendees} attendees
							</span>
						</div>
						{event.status === "Upcoming" && (
							<button
								className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
								type="button"
								onClick={(): void => {}}
							>
								Register
							</button>
						)}
					</div>
				</div>
			))}
		</div>
	);
};
