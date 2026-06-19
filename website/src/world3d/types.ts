import type { MutableRefObject } from "react";
import type { Mesh, Vector3 } from "three";

import type { SurfaceState } from "./sphereMovement";

/** Anything that blocks walking: a sea-level point with a surface radius. */
export interface Collider {
	/** Sea-level surface position (centre of the footprint). */
	position: Vector3;
	/** Blocking radius on the surface. */
	radius: number;
}

/** A scattered, walk-blocking prop sitting on the planet surface. */
export interface Obstacle extends Collider {
	/** Visual height above the footprint. */
	height: number;
	/** 0 = rock, 1 = tree — selects the placeholder mesh until glTF lands. */
	kind: 0 | 1;
	/** Per-instance yaw for visual variety. */
	spin: number;
}

/** A procedural building ("real estate") sitting on the planet surface. */
export interface Building extends Collider {
	/** Half-width (x) and half-depth (z) of the footprint. */
	footprint: number;
	depth: number;
	/** Wall height of the main body. */
	height: number;
	/** 0 = house, 1 = tower/apartment, 2 = shop. */
	kind: 0 | 1 | 2;
	/** Per-instance yaw. */
	spin: number;
	/** Body colour. */
	color: string;
	/** Roof colour. */
	roof: string;
}

/** Shared mutable refs threaded between the world components. */
export interface WorldRefs {
	/** The planet mesh (BVH target for ground-follow raycasts). */
	planet: MutableRefObject<Mesh | null>;
	/** Live player surface state, read by the camera + HUD each frame. */
	player: MutableRefObject<SurfaceState>;
	/** Everything that blocks movement (props + buildings). */
	colliders: MutableRefObject<Array<Collider>>;
}
