import React from "react";
import { isProduction } from "@src/common/utilities";

export const TanStackRouterDevelopmentTools = isProduction
	? (): null => null
	: React.lazy(() =>
			import("@tanstack/router-devtools").then((result) => ({
				default: result.TanStackRouterDevtools,
			}))
		);
