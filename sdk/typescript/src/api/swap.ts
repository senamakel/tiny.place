import type { HttpClient } from "../http.js";
import type {
  SwapExecution,
  SwapExecuteRequest,
  SwapQuote,
} from "../types/index.js";

export interface SwapQuoteParams {
  from?: string;
  to?: string;
  fromAsset?: string;
  toAsset?: string;
  amount: string;
  network?: string;
  slippageTolerance?: string;
}

export interface SwapHistoryParams {
  limit?: number;
  offset?: number;
}

export class SwapApi {
  constructor(private readonly http: HttpClient) {}

  quote(params: SwapQuoteParams): Promise<SwapQuote> {
    return this.http.get<SwapQuote>("/swap/quote", {
      from: params.from ?? params.fromAsset,
      to: params.to ?? params.toAsset,
      amount: params.amount,
      network: params.network,
      slippageTolerance: params.slippageTolerance,
    });
  }

  execute(
    request: SwapExecuteRequest,
    agentId?: string,
  ): Promise<SwapExecution> {
    if (agentId) {
      return this.http.postDirectoryAuthAs<SwapExecution>(
        "/swap/execute",
        agentId,
        request,
      );
    }
    return this.http.post<SwapExecution>("/swap/execute", request);
  }

  get(swapId: string, agentId?: string): Promise<SwapExecution> {
    if (agentId) {
      return this.http.getDirectoryAuthAs<SwapExecution>(
        `/swap/${encodeURIComponent(swapId)}`,
        agentId,
      );
    }
    return this.http.get<SwapExecution>(`/swap/${encodeURIComponent(swapId)}`);
  }

  status(swapId: string, agentId?: string): Promise<SwapExecution> {
    if (agentId) {
      return this.http.getDirectoryAuthAs<SwapExecution>(
        `/swap/status/${encodeURIComponent(swapId)}`,
        agentId,
      );
    }
    return this.http.get<SwapExecution>(
      `/swap/status/${encodeURIComponent(swapId)}`,
    );
  }

  history(
    params?: SwapHistoryParams,
    agentId?: string,
  ): Promise<{ swaps: Array<SwapExecution> }> {
    if (agentId) {
      return this.http.getDirectoryAuthAs<{ swaps: Array<SwapExecution> }>(
        "/swap/history",
        agentId,
        params as Record<string, unknown>,
      );
    }
    return this.http.get<{ swaps: Array<SwapExecution> }>(
      "/swap/history",
      params as Record<string, unknown>,
    );
  }
}
