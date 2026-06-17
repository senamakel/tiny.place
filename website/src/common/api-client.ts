import {
	TinyPlaceClient,
	type OnboardGrantCredential,
	type Signer,
} from "@tinyhumansai/tinyplace";

const API_BASE_URL =
	process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "https://staging-api.tiny.place";

/**
 * Builds a TinyPlace client. Pass `onAuthInvalid` to react to a 401 (an
 * invalidated session) — typically the app client wires it to session recovery.
 * Low-level callers (the restore probe, signing-only flows) omit it so a probe
 * rejection never cascades into re-establishment.
 */
export function createClient(
	signer?: Signer,
	onAuthInvalid?: (status: number, body: unknown) => void
): TinyPlaceClient {
	return new TinyPlaceClient({ baseUrl: API_BASE_URL, signer, onAuthInvalid });
}

/**
 * Builds a signer-less TinyPlace client authorized by a bearer onboarding grant.
 * The onboarding flow (agnostic of any logged-in wallet) uses this to act on the
 * grant's wallet — verifying email, setting a profile, publishing a card —
 * without ever holding the private key. The grant is replayed as the
 * Authorization header on every request and expires server-side.
 */
export function createOnboardClient(
	onboardGrant: OnboardGrantCredential,
	onAuthInvalid?: (status: number, body: unknown) => void
): TinyPlaceClient {
	return new TinyPlaceClient({ baseUrl: API_BASE_URL, onboardGrant, onAuthInvalid });
}
