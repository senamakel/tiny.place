// Tunables for the open 3D planet world. Kept in one place so gameplay feel can
// be adjusted without touching the engine internals.

/** Radius of the walkable planet (world units, "sea level"). 3× the original. */
export const PLANET_RADIUS = 150;

/** Peak terrain displacement above/below sea level from procedural noise.
 *  Kept gentle relative to the radius so the world reads as smooth, rolling
 *  hills rather than jagged spikes. */
export const TERRAIN_AMPLITUDE = 7;

/** Icosphere subdivision detail. Higher = smoother planet, heavier BVH. */
export const PLANET_DETAIL = 110;

/** How far above the ground the avatar's feet origin sits (small anti-z-fight). */
export const PLAYER_EYE_HEIGHT = 0.05;

/** Ground-follow raycast starts this far out along local-up and casts inward. */
export const GROUND_RAY_START = TERRAIN_AMPLITUDE + 6;
export const GROUND_RAY_LENGTH = GROUND_RAY_START * 2;

/** Movement speed in world units per second along the surface (scaled up with
 *  the bigger planet so traversal still feels brisk). */
export const WALK_SPEED = 17;

/** Turn speed in radians per second (yaw around local up). */
export const TURN_SPEED = 2.1;

/** Third-person camera placement, expressed in the player's local frame. Sized
 *  to frame the human avatar, not the planet. */
export const CAMERA_BACK = 7.5; // behind the player along -forward
export const CAMERA_UP = 4; //   above the player along local up
export const CAMERA_LERP = 6; //  higher = snappier follow

/** Radius used for cylinder-vs-obstacle blocking checks. */
export const PLAYER_COLLIDER_RADIUS = 0.9;

/** Streamed (not bundled) lo-fi soundtrack. Swap freely; nothing is shipped in the bundle. */
export const LOFI_STREAM_URL =
	"https://stream.zeno.fm/0r0xa792kwzuv"; // public lo-fi internet radio stream
