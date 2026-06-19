import { describe, expect, it } from "vitest";
import { Vector3 } from "three";

import { arcDistance, isBlocked } from "./collision";
import { buildObstacles } from "./obstacles";
import type { Obstacle } from "./types";

const R = 50;

describe("arcDistance", () => {
	it("is zero for the same point", () => {
		const p = new Vector3(0, R, 0);
		expect(arcDistance(p, p, R)).toBeCloseTo(0);
	});

	it("is a quarter circumference for orthogonal points", () => {
		const a = new Vector3(0, R, 0);
		const b = new Vector3(R, 0, 0);
		expect(arcDistance(a, b, R)).toBeCloseTo((Math.PI / 2) * R);
	});

	it("is half the circumference for antipodal points", () => {
		const a = new Vector3(0, R, 0);
		const b = new Vector3(0, -R, 0);
		expect(arcDistance(a, b, R)).toBeCloseTo(Math.PI * R);
	});
});

describe("isBlocked", () => {
	const obstacle = (pos: Vector3, radius: number): Obstacle => ({
		position: pos,
		radius,
		height: 1,
		kind: 0,
		spin: 0,
	});

	it("blocks when inside an obstacle's footprint", () => {
		const o = obstacle(new Vector3(0, R, 0), 2);
		// A point ~1 unit of arc away, with player radius 0.8 → 1 < 2 + 0.8.
		const near = new Vector3(0, R, 0);
		expect(isBlocked(near, [o], 0.8)).toBe(true);
	});

	it("does not block when clear of every obstacle", () => {
		const o = obstacle(new Vector3(0, R, 0), 2);
		const far = new Vector3(R, 0, 0); // a quarter way around
		expect(isBlocked(far, [o], 0.8)).toBe(false);
	});

	it("is false with no obstacles", () => {
		expect(isBlocked(new Vector3(0, R, 0), [], 0.8)).toBe(false);
	});
});

describe("buildObstacles", () => {
	it("is deterministic for a given seed", () => {
		const a = buildObstacles(20, 99);
		const b = buildObstacles(20, 99);
		expect(a).toHaveLength(20);
		expect(a[0]?.position.toArray()).toEqual(b[0]?.position.toArray());
	});

	it("places every obstacle on the sphere surface", () => {
		for (const o of buildObstacles(30, 7)) {
			expect(o.position.length()).toBeCloseTo(R);
			expect(o.radius).toBeGreaterThan(0);
			expect([0, 1]).toContain(o.kind);
		}
	});

	it("differs across seeds", () => {
		const a = buildObstacles(10, 1);
		const b = buildObstacles(10, 2);
		expect(a[0]?.position.toArray()).not.toEqual(b[0]?.position.toArray());
	});
});
