import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { ApiProvider } from "@src/common/api-context";
import { queryClient } from "@src/common/query-client";
import { WalletContextProvider } from "@src/common/wallet-context";
import type { FunctionComponent } from "@src/common/types";
import type { TanstackRouter } from "@src/main";
import { TanStackRouterDevelopmentTools } from "@src/components/utils/development-tools/TanStackRouterDevelopmentTools";

type AppProps = { router: TanstackRouter };

const App = ({ router }: AppProps): FunctionComponent => {
	return (
		<QueryClientProvider client={queryClient}>
			<WalletContextProvider>
				<ApiProvider>
					<RouterProvider router={router} />
					<TanStackRouterDevelopmentTools
						initialIsOpen={false}
						position="bottom-left"
						router={router}
					/>
					<ReactQueryDevtools initialIsOpen={false} position="bottom" />
				</ApiProvider>
			</WalletContextProvider>
		</QueryClientProvider>
	);
};

export default App;
