import { Outlet, createRootRoute } from "@tanstack/react-router";

import type { FunctionComponent } from "@src/common/types";

function RootLayout(): FunctionComponent {
	return <Outlet />;
}

export const Route = createRootRoute({
	component: RootLayout,
});
