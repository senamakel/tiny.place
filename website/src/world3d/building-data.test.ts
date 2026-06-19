import { describe, expect, it } from "vitest";

import { placeBuildings } from "./building-data";
import { arcDistance } from "./collision";
import { PLANET_RADIUS } from "./constants";

describe("placeBuildings", () => {
	it("is deterministic for a given seed", () => {
		const a = placeBuildings(5);
		const b = placeBuildings(5);
		expect(a.length).toBe(b.length);
		expect(a[0]?.position.toArray()).toEqual(b[0]?.position.toArray());
	});

	it("places every building on the sphere surface with a valid kind", () => {
		for (const b of placeBuildings(11)) {
			expect(b.position.length()).toBeCloseTo(PLANET_RADIUS);
			expect(b.radius).toBeGreaterThan(0);
			expect(b.height).toBeGreaterThan(0);
			expect([0, 1, 2]).toContain(b.kind);
		}
	});

	it("does not overlap buildings (footprints stay apart)", () => {
		const buildings = placeBuildings(3);
		for (let index = 0; index < buildings.length; index++) {
			for (let index_ = index + 1; index_ < buildings.length; index_++) {
				const a = buildings[index]!;
				const b = buildings[index_]!;
				// Rejection test in placement keeps centres beyond the summed radii.
				expect(arcDistance(a.position, b.position)).toBeGreaterThan(
					a.radius + b.radius
				);
			}
		}
	});

	it("builds a starter district near the north pole spawn", () => {
		const pole = PLANET_RADIUS; // y at the north pole
		const near = placeBuildings(7).filter((b) => b.position.y > pole * 0.9);
		expect(near.length).toBeGreaterThan(0);
	});
});
