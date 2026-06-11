import { TinyVerseClient, type Signer } from "@tinyhumansai/tinyplace";

const API_BASE_URL =
	process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "https://staging-api.tiny.place";

export function createClient(signer?: Signer): TinyVerseClient {
	return new TinyVerseClient({ baseUrl: API_BASE_URL, signer });
}
