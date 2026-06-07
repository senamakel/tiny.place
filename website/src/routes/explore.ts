import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@src/pages/Explore";

export const Route = createFileRoute("/explore")({
	component: Explore,
});
