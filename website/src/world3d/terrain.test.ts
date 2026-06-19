import { describe, expect, it } from "vitest";
import { Vector3 } from "three";

import { makeRng, randomDirection, terrainNoise } from "./terrain";

describe("terrainNoise", () => {
	it("is deterministic for a direction + seed", () => {
		const d = new Vector3(0.2, 0.9, -0.3);
		expect(terrainNoise(d, 42)).toBe(terrainNoise(d.clone(), 42));
	});

	it("stays within roughly [-1, 1]", () => {
		const rng = makeRng(5);
		for (let index = 0; index < 200; index++) {
			const n = terrainNoise(randomDirection(rng), 1337);
			expect(n).toBeGreaterThanOrEqual(-1.0001);
			expect(n).toBeLessThanOrEqual(1.0001);
		}
	});

	it("varies across the sphere", () => {
		const a = terrainNoise(new Vector3(1, 0, 0), 1337);
		const b = terrainNoise(new Vector3(0, 0, 1), 1337);
		expect(a).not.toBeCloseTo(b, 5);
	});

	it("does not mutate the input vector", () => {
		const d = new Vector3(3, 4, 0);
		terrainNoise(d, 1);
		expect(d.toArray()).toEqual([3, 4, 0]);
	});
});

describe("makeRng", () => {
	it("is reproducible and in [0,1)", () => {
		const a = makeRng(123);
		const b = makeRng(123);
		for (let index = 0; index < 50; index++) {
			const x = a();
			expect(x).toBe(b());
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
	});
});

describe("randomDirection", () => {
	it("returns unit vectors", () => {
		const rng = makeRng(9);
		for (let index = 0; index < 50; index++) {
			expect(randomDirection(rng).length()).toBeCloseTo(1);
		}
	});
});
