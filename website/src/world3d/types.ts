import type { MutableRefObject } from "react";
import type { Mesh, Vector3 } from "three";

import type { SurfaceState } from "./sphereMovement";

/** A scattered, walk-blocking prop sitting on the planet surface. */
export interface Obstacle {
	/** Sea-level surface position (centre of the prop's footprint). */
	position: Vector3;
	/** Blocking radius on the surface. */
	radius: number;
	/** Visual height above the footprint. */
	height: number;
	/** 0 = rock, 1 = tree — selects the placeholder mesh until glTF lands. */
	kind: 0 | 1;
	/** Per-instance yaw for visual variety. */
	spin: number;
}

/** Shared mutable refs threaded between the world components. */
export interface WorldRefs {
	/** The planet mesh (BVH target for ground-follow raycasts). */
	planet: MutableRefObject<Mesh | null>;
	/** Live player surface state, read by the camera + HUD each frame. */
	player: MutableRefObject<SurfaceState>;
	/** Scattered obstacles for movement blocking. */
	obstacles: MutableRefObject<Array<Obstacle>>;
}
