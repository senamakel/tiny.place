import { Quaternion, Vector3 } from "three";

import { PLANET_RADIUS } from "./constants";
import { surfaceQuaternion } from "./sphereMovement";
import { makeRng, randomDirection } from "./terrain";
import type { Obstacle } from "./types";

/** Build a deterministic set of obstacles spread over the planet surface. */
export function buildObstacles(count: number, seed: number): Array<Obstacle> {
	const rng = makeRng(seed);
	const out: Array<Obstacle> = [];
	for (let index = 0; index < count; index++) {
		const direction = randomDirection(rng);
		const kind: 0 | 1 = rng() < 0.5 ? 0 : 1;
		const scale = 0.7 + rng() * 0.9;
		out.push({
			position: direction.multiplyScalar(PLANET_RADIUS),
			radius: (kind === 0 ? 1.1 : 0.9) * scale,
			height: (kind === 0 ? 1.4 : 3.2) * scale,
			kind,
			spin: rng() * Math.PI * 2,
		});
	}
	return out;
}

/** Orientation that sits a radially-symmetric prop upright on the surface. */
export function obstacleQuaternion(position: Vector3, spin: number): Quaternion {
	const up = position.clone().normalize();
	const seed =
		Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
	const forward = seed.sub(up.clone().multiplyScalar(seed.dot(up))).normalize();
	const base = surfaceQuaternion({ position, forward });
	const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin);
	return base.multiply(yaw);
}
