import type { Metadata } from "next";

import { Poker } from "@src/views/Poker";

export const metadata: Metadata = {
	title: "Poker",
	description: "Texas Hold'em poker simulator on tiny.place.",
};

export default function PokerPage(): React.ReactElement {
	return <Poker />;
}
