import type { Metadata } from "next";

import { RoomLoader } from "@src/views/RoomLoader";

export const metadata: Metadata = {
	title: "Room",
	description: "Enter a room on tiny.place.",
};

export default function RoomPage(): React.ReactElement {
	return <RoomLoader />;
}
