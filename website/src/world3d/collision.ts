import { Raycaster, type Mesh, type Vector3 } from "three";

import {
	GROUND_RAY_LENGTH,
	GROUND_RAY_START,
	PLANET_RADIUS,
} from "./constants";
import type { Collider } from "./types";

/**
 * Great-circle (arc) distance between two sea-level surface points on a sphere
 * of the given radius. Pure — used for obstacle blocking and unit-tested.
 */
export function arcDistance(a: Vector3, b: Vector3, radius = PLANET_RADIUS): number {
	const da = a.clone().normalize();
	const db = b.clone().normalize();
	const cos = Math.min(1, Math.max(-1, da.dot(db)));
	return Math.acos(cos) * radius;
}

/**
 * True if a sea-level surface position lies inside any obstacle's blocking
 * radius (plus the player's collider radius). Pure & deterministic.
 */
export function isBlocked(
	position: Vector3,
	obstacles: Array<Collider>,
	playerRadius: number
): boolean {
	for (const o of obstacles) {
		if (arcDistance(position, o.position) < o.radius + playerRadius) {
			return true;
		}
	}
	return false;
}

// Reused across frames so we don't allocate a Raycaster every tick.
const groundRay = new Raycaster();
groundRay.firstHitOnly = true;

/**
 * Raycast inward (toward planet centre) from above `position` to find the
 * terrain surface point. Returns null if the ray misses (shouldn't happen on a
 * closed planet, but callers fall back to sea level).
 */
export function groundPoint(mesh: Mesh, position: Vector3): Vector3 | null {
	const up = position.clone().normalize();
	const origin = up.clone().multiplyScalar(PLANET_RADIUS + GROUND_RAY_START);
	groundRay.set(origin, up.clone().multiplyScalar(-1));
	groundRay.far = GROUND_RAY_LENGTH;
	const hits = groundRay.intersectObject(mesh, false);
	const hit = hits[0];
	return hit ? hit.point.clone() : null;
}
