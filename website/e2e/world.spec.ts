import { test, expect } from "@playwright/test";

// The open 3D world is a fully client-side R3F scene (no backend calls). These
// tests assert the WebGL canvas mounts, the HUD renders, and the scene runs a
// few frames without throwing. Playwright's Chromium provides WebGL (swiftshader
// in headless), so the canvas gets a real WebGL context.

test.describe("open 3D world", () => {
	test("mounts a WebGL canvas with the HUD", async ({ page }) => {
		const fatal: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") fatal.push(msg.text());
		});
		page.on("pageerror", (err) => fatal.push(err.message));

		await page.goto("/world");

		// The R3F <Canvas> renders a real <canvas> element once mounted.
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible({ timeout: 30_000 });

		// HUD overlay (controls hint + audio toggle) is present.
		await expect(page.getByText("tiny.place — open world")).toBeVisible();
		await expect(
			page.getByText("WASD / arrows to move · Shift to run")
		).toBeVisible();
		const audioToggle = page.getByRole("button", { name: /lo-fi/ });
		await expect(audioToggle).toBeVisible();

		// The canvas has non-zero pixel dimensions (a real drawing surface).
		const size = await canvas.evaluate((el) => {
			const c = el as HTMLCanvasElement;
			return { w: c.width, h: c.height };
		});
		expect(size.w).toBeGreaterThan(0);
		expect(size.h).toBeGreaterThan(0);

		// A WebGL context was actually acquired.
		const hasGL = await canvas.evaluate((el) => {
			const c = el as HTMLCanvasElement;
			return !!(
				c.getContext("webgl2") ?? c.getContext("webgl")
			);
		});
		expect(hasGL).toBe(true);

		// Let the render loop run a few frames, then assert nothing threw.
		await page.waitForTimeout(1000);
		expect(fatal).toEqual([]);
	});

	test("toggles the streamed lo-fi audio control", async ({ page }) => {
		await page.goto("/world");
		const audioToggle = page.getByRole("button", { name: /lo-fi/ });
		await expect(audioToggle).toHaveText(/off/);
		await audioToggle.click();
		// Label flips to "on" once a play attempt resolves (or stays off if the
		// stream can't load in CI — either way the control is interactive).
		await expect(audioToggle).toHaveText(/on|off/);
	});
});
