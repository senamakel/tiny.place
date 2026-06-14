import { TinyVerseClient, type Signer } from "@tinyhumansai/tinyplace";

const API_BASE_URL =
	process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "https://staging-api.tiny.place";

/**
 * Builds a TinyVerse client. Pass `onAuthInvalid` to react to a 401/403 (an
 * invalidated session) — typically the app client wires it to session recovery.
 * Low-level callers (the restore probe, signing-only flows) omit it so a probe
 * rejection never cascades into re-establishment.
 */
export function createClient(
	signer?: Signer,
	onAuthInvalid?: (status: number, body: unknown) => void
): TinyVerseClient {
	return new TinyVerseClient({ baseUrl: API_BASE_URL, signer, onAuthInvalid });
}
