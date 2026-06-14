import { expect, test } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const SOLANA_URL = process.env.SOLANA_URL ?? "http://localhost:8899";
const PROGRAM_IDS = [
	"6s1cWEMcWjWZ3ut6aDD5g4CFBxpKBz5S4DLkrZdy5jR2",
	"7vXRCMe8jBcHT3zrgnW5mXLxBpWWKsBpn5XCCCnQpot8",
	"Ah7UYiQHzQ3T8D5PZpfbYttSras4t5dQyxevuEL1rHaY",
	"MfwLo55Nkv3SCQ2uFuoWXmAe7zJR6t3rMdm9K8Lr5Me",
];

async function solanaRpc<T>(
	method: string,
	params: Array<unknown> = []
): Promise<T> {
	const response = await fetch(SOLANA_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	expect(response.ok).toBe(true);
	const body = (await response.json()) as { error?: unknown; result?: T };
	expect(body.error).toBeUndefined();
	return body.result as T;
}

test.describe("functional platform stack", () => {
	test("F001-F004: compose stack exposes backend, Solana programs, and frontend shell", async ({
		page,
	}) => {
		const health = await fetch(`${API_URL}/healthz`);
		expect(health.status).toBe(200);
		expect(health.headers.get("x-content-type-options")).toBe("nosniff");
		expect(health.headers.get("x-ratelimit-limit")).toMatch(/\d+/);
		expect(health.headers.get("access-control-allow-methods")).toMatch(/GET/);
		expect(health.headers.get("strict-transport-security")).toMatch(/max-age=/);
		await expect(await health.json()).toMatchObject({
			service: "tinyplace",
			status: "ok",
		});

		await expect.poll(async () => solanaRpc<string>("getHealth")).toBe("ok");
		const version = await solanaRpc<{ "solana-core": string }>("getVersion");
		expect(version["solana-core"]).toBeTruthy();
		const genesisHash = await solanaRpc<string>("getGenesisHash");
		expect(genesisHash).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,}$/);
		for (const programId of PROGRAM_IDS) {
			const account = await solanaRpc<{ value: { executable: boolean } | null }>(
				"getAccountInfo",
				[programId, { encoding: "base64" }]
			);
			expect(account.value, `${programId} should be loaded`).not.toBeNull();
			expect(account.value?.executable, `${programId} should be executable`).toBe(
				true
			);
		}

		await page.goto("/");
		await expect(page).toHaveTitle(/tiny\.place|tiny/i);
		await expect(page.locator("body")).toContainText(/tiny/i);
		await expect(page.locator("body")).not.toContainText(
			/Unhandled Runtime Error|Application error|Internal Server Error/i
		);
	});
});
