// Browser shim for node:crypto used by the SDK.
// webcrypto maps directly to the browser's Web Crypto API.
// createHash is only called by sha256Hex during request signing — for
// unauthenticated API calls this code path is never reached.
export const webcrypto = globalThis.crypto;

interface HashInstance {
	update: (data: Uint8Array | string) => HashInstance;
	digest: (encoding: string) => string;
}

export function createHash(...arguments_: Array<unknown>): HashInstance {
	void arguments_;
	throw new Error(
		"node:crypto createHash is not available in the browser. " +
			"Use Web Crypto API or a browser-compatible hashing library.",
	);
}
