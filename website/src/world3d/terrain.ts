import { Vector3 } from "three";

/**
 * Deterministic procedural terrain for the planet — no external noise deps.
 * A small 3D value-noise with fractal (fbm) octaves, sampled on the unit
 * direction so the result is seamless across the whole sphere.
 */

function hash3(x: number, y: number, z: number, seed: number): number {
	// Cheap integer hash → [0,1). Deterministic for a given lattice cell.
	let h = x * 374761393 + y * 668265263 + z * 2147483647 + seed * 974711;
	h = (h ^ (h >>> 13)) >>> 0;
	h = (h * 1274126177) >>> 0;
	return (h & 0xffffff) / 0x1000000;
}

function smooth(t: number): number {
	return t * t * (3 - 2 * t);
}

function valueNoise3(
	x: number,
	y: number,
	z: number,
	seed: number
): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const zi = Math.floor(z);
	const xf = smooth(x - xi);
	const yf = smooth(y - yi);
	const zf = smooth(z - zi);

	const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

	const c000 = hash3(xi, yi, zi, seed);
	const c100 = hash3(xi + 1, yi, zi, seed);
	const c010 = hash3(xi, yi + 1, zi, seed);
	const c110 = hash3(xi + 1, yi + 1, zi, seed);
	const c001 = hash3(xi, yi, zi + 1, seed);
	const c101 = hash3(xi + 1, yi, zi + 1, seed);
	const c011 = hash3(xi, yi + 1, zi + 1, seed);
	const c111 = hash3(xi + 1, yi + 1, zi + 1, seed);

	const x00 = lerp(c000, c100, xf);
	const x10 = lerp(c010, c110, xf);
	const x01 = lerp(c001, c101, xf);
	const x11 = lerp(c011, c111, xf);
	const y0 = lerp(x00, x10, yf);
	const y1 = lerp(x01, x11, yf);
	return lerp(y0, y1, zf); // [0,1)
}

/**
 * Terrain displacement (signed, roughly in [-1, 1]) at a point on the unit
 * sphere. Multiply by the desired amplitude. `dir` need not be normalized.
 */
export function terrainNoise(direction: Vector3, seed = 1337): number {
	const n = direction.clone().normalize();
	const freq = 1.7;
	let amp = 1;
	let sum = 0;
	let norm = 0;
	let px = n.x * freq;
	let py = n.y * freq;
	let pz = n.z * freq;
	for (let o = 0; o < 4; o++) {
		sum += valueNoise3(px, py, pz, seed + o * 101) * amp;
		norm += amp;
		amp *= 0.5;
		px *= 2.03;
		py *= 2.03;
		pz *= 2.03;
	}
	// Map [0,1] → [-1,1] and sharpen valleys/peaks slightly.
	const v = (sum / norm) * 2 - 1;
	return Math.sign(v) * Math.pow(Math.abs(v), 0.85);
}

/** Mulberry32 — tiny deterministic RNG for scatter placement. */
export function makeRng(seed: number): () => number {
	let a = seed >>> 0;
	return function next(): number {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A uniformly-distributed random unit direction from an RNG. */
export function randomDirection(rng: () => number): Vector3 {
	// Marsaglia: uniform on the sphere.
	const u = rng() * 2 - 1;
	const theta = rng() * Math.PI * 2;
	const r = Math.sqrt(1 - u * u);
	return new Vector3(r * Math.cos(theta), u, r * Math.sin(theta));
}
