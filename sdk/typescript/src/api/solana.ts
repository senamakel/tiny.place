import type { HttpClient } from "../http.js";
import type { SupportedAsset } from "../types/index.js";

export interface SolanaRPCInfo {
  url: string;
  rateLimitPerMin: number;
  fallbacks: boolean;
}

export interface SolanaChainInfo {
  network: string;
  name: string;
  kind: "solana";
  nativeAsset: string;
  explorerUrl: string;
  confirmations: number;
  assets: Array<SupportedAsset>;
  rpc: SolanaRPCInfo;
}

export type SolanaRPCID = string | number | null;

export interface SolanaRPCRequest {
  jsonrpc: "2.0";
  id?: SolanaRPCID;
  method: string;
  params?: unknown;
}

export interface SolanaRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface SolanaRPCResponse<T = unknown> {
  jsonrpc: "2.0";
  id?: SolanaRPCID;
  result?: T;
  error?: SolanaRPCError;
}

export type SolanaRPCBatchResponse<T = unknown> = Array<SolanaRPCResponse<T>>;

export class SolanaApi {
  constructor(private readonly http: HttpClient) {}

  info(): Promise<SolanaChainInfo> {
    return this.http.get<SolanaChainInfo>("/solana");
  }

  rpc<T = unknown>(
    request: SolanaRPCRequest,
  ): Promise<SolanaRPCResponse<T>>;
  rpc<T = unknown>(
    request: Array<SolanaRPCRequest>,
  ): Promise<SolanaRPCBatchResponse<T>>;
  rpc<T = unknown>(
    request: SolanaRPCRequest | Array<SolanaRPCRequest>,
  ): Promise<SolanaRPCResponse<T> | SolanaRPCBatchResponse<T>> {
    return this.http.postPublic<
      SolanaRPCResponse<T> | SolanaRPCBatchResponse<T>
    >("/solana/rpc", request);
  }

  async call<T = unknown>(
    method: string,
    params?: unknown,
    id: SolanaRPCID = method,
  ): Promise<T> {
    const response = await this.rpc<T>({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    if (Array.isArray(response)) {
      throw new Error("Solana JSON-RPC batch response returned for single call");
    }
    if (response.error) {
      throw new Error(
        `Solana JSON-RPC ${response.error.code}: ${response.error.message}`,
      );
    }
    return response.result as T;
  }
}
