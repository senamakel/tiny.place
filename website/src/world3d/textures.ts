import {
	CanvasTexture,
	MirroredRepeatWrapping,
	SRGBColorSpace,
	type Texture,
} from "three";

/**
 * Runtime procedural textures — nothing is bundled. Everything is drawn into an
 * offscreen <canvas> and wrapped as a CanvasTexture, then cached at module
 * scope so each variant is generated once. SSR-guarded (canvas needs the DOM).
 */

function makeCanvas(size: number): HTMLCanvasElement | null {
	if (typeof document === "undefined") return null;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	return canvas;
}

// --- 2D fractal value noise (deterministic) ---------------------------------

function hash2(x: number, y: number, seed: number): number {
	let h = x * 374761393 + y * 668265263 + seed * 974711;
	h = (h ^ (h >>> 13)) >>> 0;
	h = (h * 1274126177) >>> 0;
	return (h & 0xffff) / 0x10000;
}

function smooth(t: number): number {
	return t * t * (3 - 2 * t);
}

function valueNoise2(x: number, y: number, seed: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = smooth(x - xi);
	const yf = smooth(y - yi);
	const c00 = hash2(xi, yi, seed);
	const c10 = hash2(xi + 1, yi, seed);
	const c01 = hash2(xi, yi + 1, seed);
	const c11 = hash2(xi + 1, yi + 1, seed);
	const a = c00 + (c10 - c00) * xf;
	const b = c01 + (c11 - c01) * xf;
	return a + (b - a) * yf;
}

function fbm2(x: number, y: number, seed: number): number {
	let amp = 1;
	let sum = 0;
	let norm = 0;
	let fx = x;
	let fy = y;
	for (let o = 0; o < 4; o++) {
		sum += valueNoise2(fx, fy, seed + o * 53) * amp;
		norm += amp;
		amp *= 0.5;
		fx *= 2;
		fy *= 2;
	}
	return sum / norm;
}

let detailNoiseTexture: Texture | null = null;

/**
 * A seamless grayscale fractal-noise tile used as triplanar surface detail.
 * MirroredRepeat wrapping hides the tile boundary. Cached for the app lifetime.
 */
export function getDetailNoise(): Texture | null {
	if (detailNoiseTexture) return detailNoiseTexture;
	const size = 256;
	const canvas = makeCanvas(size);
	if (!canvas) return null;
	const context = canvas.getContext("2d")!;
	const image = context.createImageData(size, size);
	const freq = 8;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const n = fbm2((x / size) * freq, (y / size) * freq, 7);
			const v = Math.floor(140 + n * 115);
			const index = (y * size + x) * 4;
			image.data[index] = v;
			image.data[index + 1] = v;
			image.data[index + 2] = v;
			image.data[index + 3] = 255;
		}
	}
	context.putImageData(image, 0, 0);
	const texture = new CanvasTexture(canvas);
	texture.wrapS = MirroredRepeatWrapping;
	texture.wrapT = MirroredRepeatWrapping;
	detailNoiseTexture = texture;
	return texture;
}

// --- Building facades --------------------------------------------------------

export interface Facade {
	map: Texture;
	emissiveMap: Texture;
}

const facadeCache = new Map<string, Facade>();

function shade(hex: string, amount: number): string {
	const c = hex.replace("#", "");
	const r = Math.max(
		0,
		Math.min(255, parseInt(c.slice(0, 2), 16) + amount)
	);
	const g = Math.max(
		0,
		Math.min(255, parseInt(c.slice(2, 4), 16) + amount)
	);
	const b = Math.max(
		0,
		Math.min(255, parseInt(c.slice(4, 6), 16) + amount)
	);
	return `rgb(${r},${g},${b})`;
}

/**
 * A building facade: tiled wall colour with a window grid. `map` carries the
 * painted look; `emissiveMap` is black except for lit windows so only those
 * glow. Window density/lit-ratio vary by kind (0 house, 1 tower, 2 shop).
 */
export function getFacade(kind: 0 | 1 | 2, wall: string): Facade {
	const key = `${kind}-${wall}`;
	const cached = facadeCache.get(key);
	if (cached) return cached;

	const size = 256;
	const base = makeCanvas(size);
	const emissive = makeCanvas(size);
	if (!base || !emissive) {
		// SSR fallback: 1px transparent textures (never actually rendered server-side).
		const empty = new CanvasTexture(
			(makeCanvas(1) as HTMLCanvasElement) ?? document.createElement("canvas")
		);
		const facade = { map: empty, emissiveMap: empty };
		return facade;
	}
	const context = base.getContext("2d")!;
	const ectx = emissive.getContext("2d")!;

	// Wall base with subtle vertical streaks for texture.
	context.fillStyle = wall;
	context.fillRect(0, 0, size, size);
	for (let x = 0; x < size; x += 4) {
		context.fillStyle = shade(wall, Math.floor((Math.random() - 0.5) * 16));
		context.fillRect(x, 0, 2, size);
	}
	ectx.fillStyle = "#000000";
	ectx.fillRect(0, 0, size, size);

	// Window grid.
	const cols = kind === 1 ? 4 : kind === 2 ? 3 : 3;
	const rows = kind === 1 ? 6 : kind === 2 ? 2 : 3;
	const litRatio = kind === 1 ? 0.55 : 0.4;
	const marginX = size * 0.12;
	const marginY = size * 0.1;
	const cellW = (size - marginX * 2) / cols;
	const cellH = (size - marginY * 2) / rows;
	const winW = cellW * 0.62;
	const winH = cellH * 0.6;
	const glass = "#243447";
	const litGlass = "#ffe9a8";

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const lit = Math.random() < litRatio;
			const wx = marginX + c * cellW + (cellW - winW) / 2;
			const wy = marginY + r * cellH + (cellH - winH) / 2;
			// Frame
			context.fillStyle = shade(wall, -28);
			context.fillRect(wx - 3, wy - 3, winW + 6, winH + 6);
			// Glass
			context.fillStyle = lit ? litGlass : glass;
			context.fillRect(wx, wy, winW, winH);
			if (lit) {
				ectx.fillStyle = "#ffd98a";
				ectx.fillRect(wx, wy, winW, winH);
			}
		}
	}

	// Shops get a coloured awning band near the bottom.
	if (kind === 2) {
		context.fillStyle = shade(wall, -50);
		context.fillRect(0, size * 0.78, size, size * 0.06);
	}

	const map = new CanvasTexture(base);
	map.colorSpace = SRGBColorSpace;
	const emissiveMap = new CanvasTexture(emissive);
	emissiveMap.colorSpace = SRGBColorSpace;
	const facade: Facade = { map, emissiveMap };
	facadeCache.set(key, facade);
	return facade;
}
