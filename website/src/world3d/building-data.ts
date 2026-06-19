import { Vector3 } from "three";

import { PLANET_RADIUS } from "./constants";
import { makeRng, randomDirection } from "./terrain";
import type { Building } from "./types";

const HOUSE_COLORS = ["#e8d3b0", "#dcc6a0", "#f0e0c8", "#d8c0a8", "#efe4cf"];
const HOUSE_ROOFS = ["#9c4a3c", "#7d3b32", "#a85a44", "#6f4e37"];
const TOWER_COLORS = ["#9fb3c8", "#b9c6d6", "#8ea3bb", "#cfd8e3"];
const TOWER_ROOFS = ["#5a6b7d", "#46555f", "#6b7d8f"];
const SHOP_COLORS = ["#e0a87a", "#d98c6a", "#e8b894", "#cf7d5a"];
const SHOP_ROOFS = ["#5b8266", "#496b54", "#3f7d5a"];

function pick<T>(rng: () => number, items: ReadonlyArray<T>): T {
	return items[Math.floor(rng() * items.length)] ?? items[0]!;
}

/** Orthonormal tangent basis (u, v) at a unit direction on the sphere. */
function tangentBasis(center: Vector3): { u: Vector3; v: Vector3 } {
	const seed =
		Math.abs(center.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
	const u = seed.clone().sub(center.clone().multiplyScalar(seed.dot(center))).normalize();
	const v = new Vector3().crossVectors(center, u).normalize();
	return { u, v };
}

function makeBuilding(rng: () => number, direction: Vector3): Building {
	const roll = rng();
	const kind: 0 | 1 | 2 = roll < 0.55 ? 0 : roll < 0.82 ? 1 : 2;
	const scale = 0.8 + rng() * 0.7;
	const footprint =
		(kind === 1 ? 2.4 : kind === 2 ? 3.2 : 2.8) * scale;
	const depth = footprint * (0.8 + rng() * 0.5);
	const height =
		kind === 1
			? (10 + rng() * 14) * scale // towers
			: kind === 2
				? (4 + rng() * 2) * scale // shops (squat)
				: (5 + rng() * 4) * scale; // houses
	const colors =
		kind === 1 ? TOWER_COLORS : kind === 2 ? SHOP_COLORS : HOUSE_COLORS;
	const roofs = kind === 1 ? TOWER_ROOFS : kind === 2 ? SHOP_ROOFS : HOUSE_ROOFS;
	return {
		position: direction.clone().multiplyScalar(PLANET_RADIUS),
		radius: Math.hypot(footprint, depth) * 1.15,
		footprint,
		depth,
		height,
		kind,
		spin: rng() * Math.PI * 2,
		color: pick(rng, colors),
		roof: pick(rng, roofs),
	};
}

/**
 * Lay out a town: a few districts of clustered buildings plus a scattering of
 * lone estates across the planet. Deterministic for a given seed. Buildings are
 * spaced apart with a simple rejection test so they don't overlap.
 */
export function placeBuildings(seed: number): Array<Building> {
	const rng = makeRng(seed);
	const out: Array<Building> = [];

	const tooClose = (b: Building): boolean =>
		out.some(
			(other) =>
				b.position.clone().sub(other.position).length() <
				(b.radius + other.radius) * 1.25
		);

	const tryAdd = (direction: Vector3): void => {
		const b = makeBuilding(rng, direction);
		if (!tooClose(b)) out.push(b);
	};

	// Districts: a handful of cluster centres, each a little neighbourhood.
	const districts = 4;
	for (let d = 0; d < districts; d++) {
		// First district sits near the spawn point (north pole) so there's
		// real estate right where the player starts.
		const center =
			d === 0
				? new Vector3(0.06, 1, 0.04).normalize()
				: randomDirection(rng);
		const { u, v } = tangentBasis(center);
		const lots = 8 + Math.floor(rng() * 7);
		const spread = 0.16 + rng() * 0.05;
		for (let index = 0; index < lots; index++) {
			const a = (rng() * 2 - 1) * spread;
			const b = (rng() * 2 - 1) * spread;
			const direction = center
				.clone()
				.add(u.clone().multiplyScalar(a))
				.add(v.clone().multiplyScalar(b))
				.normalize();
			tryAdd(direction);
		}
	}

	// Lone scattered estates.
	for (let index = 0; index < 16; index++) {
		tryAdd(randomDirection(rng));
	}

	return out;
}
