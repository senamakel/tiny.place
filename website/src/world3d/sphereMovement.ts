import { Matrix4, Quaternion, Vector3 } from "three";

/**
 * Pure great-circle movement math for walking on the surface of a planet.
 *
 * The player is modelled as a point constrained to a sphere of radius `R`
 * centred at the origin. "Up" at any point is simply the normalized position
 * vector; gravity points toward the centre. Walking forward traces a great
 * circle; turning rotates the heading around local up.
 *
 * None of this touches the GPU, so it is exercised directly in unit tests.
 */

export interface SurfaceState {
	/** Position on the sphere (already scaled to radius `R`). */
	position: Vector3;
	/** Unit tangent heading the player faces. */
	forward: Vector3;
}

/** Local up at a surface position: the outward radial direction. */
export function localUp(position: Vector3): Vector3 {
	return position.clone().normalize();
}

/**
 * Project `forward` onto the tangent plane at `position` and normalize it, so a
 * heading that has drifted off-tangent (floating point, terrain) is corrected.
 */
export function tangentForward(position: Vector3, forward: Vector3): Vector3 {
	const up = localUp(position);
	const projected = forward
		.clone()
		.sub(up.clone().multiplyScalar(forward.dot(up)));
	if (projected.lengthSq() < 1e-12) {
		// `forward` was (near) parallel to up — pick an arbitrary tangent.
		const seed =
			Math.abs(up.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
		return seed.sub(up.clone().multiplyScalar(seed.dot(up))).normalize();
	}
	return projected.normalize();
}

/**
 * Walk `distance` world-units forward along the surface great circle.
 * Both position and heading are rotated by the same arc so the heading stays
 * tangent. `distance` may be negative (walking backwards).
 */
export function stepForward(
	state: SurfaceState,
	distance: number,
	radius: number
): SurfaceState {
	const up = localUp(state.position);
	const forward = tangentForward(state.position, state.forward);
	const axis = new Vector3().crossVectors(up, forward).normalize();
	const angle = distance / radius;
	const q = new Quaternion().setFromAxisAngle(axis, angle);

	const position = state.position
		.clone()
		.applyQuaternion(q)
		.normalize()
		.multiplyScalar(radius);
	const nextForward = forward.clone().applyQuaternion(q).normalize();

	return { position, forward: nextForward };
}

/**
 * Rotate the heading by `angle` radians around local up (positive = turn left).
 * Position is unchanged.
 */
export function turn(state: SurfaceState, angle: number): SurfaceState {
	const up = localUp(state.position);
	const forward = tangentForward(state.position, state.forward);
	const q = new Quaternion().setFromAxisAngle(up, angle);
	return {
		position: state.position.clone(),
		forward: forward.clone().applyQuaternion(q).normalize(),
	};
}

/**
 * Build an orthonormal basis (right, up, forward) for orienting a mesh at a
 * surface state. Columns are unit vectors; `up` is radial, `forward` tangent.
 */
export function surfaceBasis(state: SurfaceState): {
	right: Vector3;
	up: Vector3;
	forward: Vector3;
} {
	const up = localUp(state.position);
	const forward = tangentForward(state.position, state.forward);
	// Right-handed basis: right × up = forward, so right = up × forward.
	const right = new Vector3().crossVectors(up, forward).normalize();
	return { right, up, forward };
}

/**
 * Quaternion that orients a default +Z-forward / +Y-up mesh onto the surface
 * frame, so a model faces `forward` with its head pointing along local up.
 */
export function surfaceQuaternion(state: SurfaceState): Quaternion {
	const { right, up, forward } = surfaceBasis(state);
	// Basis columns map the mesh's local x=right, y=up, z=forward onto the frame.
	const m = new Matrix4().makeBasis(right, up, forward);
	return new Quaternion().setFromRotationMatrix(m);
}
