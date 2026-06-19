import { describe, expect, it } from "vitest";
import { Vector3 } from "three";

import {
	localUp,
	stepForward,
	surfaceQuaternion,
	tangentForward,
	turn,
	type SurfaceState,
} from "./sphereMovement";

const R = 50;

function start(): SurfaceState {
	return {
		position: new Vector3(0, R, 0),
		forward: new Vector3(1, 0, 0),
	};
}

describe("localUp", () => {
	it("is the outward radial direction", () => {
		const up = localUp(new Vector3(0, R, 0));
		expect(up.x).toBeCloseTo(0);
		expect(up.y).toBeCloseTo(1);
		expect(up.z).toBeCloseTo(0);
	});
});

describe("tangentForward", () => {
	it("projects an off-tangent heading back onto the tangent plane", () => {
		const pos = new Vector3(0, R, 0);
		// forward with a vertical (radial) component → should be removed.
		const f = tangentForward(pos, new Vector3(1, 5, 0));
		expect(f.dot(localUp(pos))).toBeCloseTo(0);
		expect(f.length()).toBeCloseTo(1);
	});

	it("falls back to a valid tangent when heading is parallel to up", () => {
		const pos = new Vector3(0, R, 0);
		const f = tangentForward(pos, new Vector3(0, 1, 0));
		expect(f.dot(localUp(pos))).toBeCloseTo(0);
		expect(f.length()).toBeCloseTo(1);
	});
});

describe("stepForward", () => {
	it("stays on the sphere surface", () => {
		const next = stepForward(start(), 12.3, R);
		expect(next.position.length()).toBeCloseTo(R);
	});

	it("keeps the heading tangent after moving", () => {
		const next = stepForward(start(), 9, R);
		expect(next.forward.dot(localUp(next.position))).toBeCloseTo(0);
		expect(next.forward.length()).toBeCloseTo(1);
	});

	it("moves toward the heading direction", () => {
		// From north pole facing +x, a small step should increase x.
		const next = stepForward(start(), 1, R);
		expect(next.position.x).toBeGreaterThan(0);
		expect(next.position.y).toBeLessThan(R);
	});

	it("a full great circle (2*pi*R) returns to the start", () => {
		const s = start();
		const next = stepForward(s, 2 * Math.PI * R, R);
		expect(next.position.x).toBeCloseTo(s.position.x, 3);
		expect(next.position.y).toBeCloseTo(s.position.y, 3);
		expect(next.position.z).toBeCloseTo(s.position.z, 3);
	});

	it("is reversible: forward then back returns to the start", () => {
		const s = start();
		const fwd = stepForward(s, 7, R);
		const back = stepForward(fwd, -7, R);
		expect(back.position.distanceTo(s.position)).toBeLessThan(1e-6);
	});
});

describe("turn", () => {
	it("rotates the heading without moving", () => {
		const s = start();
		const t = turn(s, Math.PI / 2);
		expect(t.position.distanceTo(s.position)).toBeCloseTo(0);
		// 90° turn from +x around +y up → heading points along -z.
		expect(t.forward.x).toBeCloseTo(0);
		expect(Math.abs(t.forward.z)).toBeCloseTo(1);
		expect(t.forward.dot(localUp(t.position))).toBeCloseTo(0);
	});

	it("a full turn returns to the original heading", () => {
		const s = start();
		const t = turn(s, Math.PI * 2);
		expect(t.forward.distanceTo(s.forward)).toBeLessThan(1e-6);
	});
});

describe("surfaceQuaternion", () => {
	it("orients +Y onto local up and +Z onto forward", () => {
		const s = start();
		const q = surfaceQuaternion(s);
		const up = new Vector3(0, 1, 0).applyQuaternion(q);
		const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
		expect(up.distanceTo(localUp(s.position))).toBeLessThan(1e-6);
		expect(fwd.distanceTo(s.forward)).toBeLessThan(1e-6);
	});
});
