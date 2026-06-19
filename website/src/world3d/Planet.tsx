import { useEffect, useMemo, type RefObject } from "react";
import {
	BufferAttribute,
	Color,
	IcosahedronGeometry,
	type BufferGeometry,
	type Mesh,
	Vector3,
} from "three";

import {
	PLANET_DETAIL,
	PLANET_RADIUS,
	TERRAIN_AMPLITUDE,
} from "./constants";
import { terrainNoise } from "./terrain";

interface PlanetProps {
	meshRef: RefObject<Mesh | null>;
	seed?: number;
}

// Palette ramp from low (water/sand) → grass → rock → snow by altitude.
const LOW = new Color("#2f6b54");
const MID = new Color("#4f9d5d");
const HIGH = new Color("#8a8071");
const PEAK = new Color("#e8eff2");

function colorForHeight(t: number, out: Color): void {
	// t in [0,1] across the displacement band.
	if (t < 0.35) out.copy(LOW).lerp(MID, t / 0.35);
	else if (t < 0.7) out.copy(MID).lerp(HIGH, (t - 0.35) / 0.35);
	else out.copy(HIGH).lerp(PEAK, (t - 0.7) / 0.3);
}

/**
 * The walkable planet. Builds a displaced icosphere with per-vertex colours and
 * a three-mesh-bvh bounds tree so the player can ground-follow it cheaply.
 */
export function Planet({ meshRef, seed = 1337 }: PlanetProps): React.ReactElement {
	const geometry = useMemo<BufferGeometry>(() => {
		const geo = new IcosahedronGeometry(PLANET_RADIUS, PLANET_DETAIL);
		const pos = geo.getAttribute("position") as BufferAttribute;
		const colors = new Float32Array(pos.count * 3);
		const v = new Vector3();
		const c = new Color();

		for (let index = 0; index < pos.count; index++) {
			v.fromBufferAttribute(pos, index);
			const direction = v.clone().normalize();
			const n = terrainNoise(direction, seed); // [-1,1]
			const displaced = direction
				.clone()
				.multiplyScalar(PLANET_RADIUS + n * TERRAIN_AMPLITUDE);
			pos.setXYZ(index, displaced.x, displaced.y, displaced.z);

			colorForHeight((n + 1) / 2, c);
			colors[index * 3] = c.r;
			colors[index * 3 + 1] = c.g;
			colors[index * 3 + 2] = c.b;
		}

		geo.setAttribute("color", new BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		geo.computeBoundsTree();
		return geo;
	}, [seed]);

	useEffect(() => {
		return (): void => {
			geometry.disposeBoundsTree?.();
			geometry.dispose();
		};
	}, [geometry]);

	return (
		<mesh ref={meshRef} castShadow receiveShadow geometry={geometry}>
			<meshStandardMaterial vertexColors metalness={0} roughness={0.92} />
		</mesh>
	);
}
