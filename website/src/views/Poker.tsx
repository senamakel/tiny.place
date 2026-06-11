"use client";

import type { FunctionComponent } from "@src/common/types";
import { PokerTable } from "@src/components/poker/PokerTable";
import { useAppStore } from "@src/store/app";

export const Poker = (): FunctionComponent => {
	const isDark = useAppStore((state) => state.theme) === "dark";

	return (
		<div
			className={`min-h-screen px-4 py-8 sm:px-6 lg:px-8 ${
				isDark ? "bg-neutral-950 text-white" : "bg-neutral-50 text-black"
			}`}
		>
			<div className="mx-auto max-w-4xl">
				<div className="mb-6">
					<h1
						className={`font-heading text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}
					>
						Poker
					</h1>
					<p
						className={`mt-1 text-sm ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
					>
						Texas Hold&apos;em Simulator
					</p>
				</div>
				<PokerTable isDark={isDark} />
			</div>
		</div>
	);
};
