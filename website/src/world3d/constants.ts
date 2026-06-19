// Tunables for the open 3D planet world. Kept in one place so gameplay feel can
// be adjusted without touching the engine internals.

/** Radius of the walkable planet (world units, "sea level"). */
export const PLANET_RADIUS = 50;

/** Peak terrain displacement above/below sea level from procedural noise. */
export const TERRAIN_AMPLITUDE = 4;

/** Icosphere subdivision detail. Higher = smoother planet, heavier BVH. */
export const PLANET_DETAIL = 64;

/** How far above sea level the player's feet sit (capsule half-height-ish). */
export const PLAYER_EYE_HEIGHT = 1.4;

/** Ground-follow raycast starts this far out along local-up and casts inward. */
export const GROUND_RAY_START = TERRAIN_AMPLITUDE + 4;
export const GROUND_RAY_LENGTH = GROUND_RAY_START * 2;

/** Movement speed in world units per second along the surface. */
export const WALK_SPEED = 9;

/** Turn speed in radians per second (yaw around local up). */
export const TURN_SPEED = 2.2;

/** Third-person camera placement, expressed in the player's local frame. */
export const CAMERA_BACK = 9; // behind the player along -forward
export const CAMERA_UP = 5; //  above the player along local up
export const CAMERA_LERP = 6; // higher = snappier follow

/** Radius used for cylinder-vs-obstacle blocking checks. */
export const PLAYER_COLLIDER_RADIUS = 0.8;

/** Streamed (not bundled) lo-fi soundtrack. Swap freely; nothing is shipped in the bundle. */
export const LOFI_STREAM_URL =
	"https://stream.zeno.fm/0r0xa792kwzuv"; // public lo-fi internet radio stream
