import { useEffect, useMemo, type RefObject } from "react";
import { Quaternion, Vector3 } from "three";

import { PLANET_RADIUS, TERRAIN_AMPLITUDE } from "./constants";
import { makeRng, randomDirection, terrainNoise } from "./terrain";
import { surfaceQuaternion } from "./sphereMovement";
import type { Obstacle } from "./types";

interface ScatterProps {
	obstaclesRef: RefObject<Obstacle[]>;
	count?: number;
	seed?: number;
}

/** Build a deterministic set of obstacles spread over the planet surface. */
export function buildObstacles(count: number, seed: number): Obstacle[] {
	const rng = makeRng(seed);
	const out: Obstacle[] = [];
	for (let i = 0; i < count; i++) {
		const dir = randomDirection(rng);
		const kind: 0 | 1 = rng() < 0.5 ? 0 : 1;
		const scale = 0.7 + rng() * 0.9;
		out.push({
			position: dir.multiplyScalar(PLANET_RADIUS),
			radius: (kind === 0 ? 1.1 : 0.9) * scale,
			height: (kind === 0 ? 1.4 : 3.2) * scale,
			kind,
			spin: rng() * Math.PI * 2,
		});
	}
	return out;
}

function obstacleQuaternion(position: Vector3, spin: number): Quaternion {
	const up = position.clone().normalize();
	// Any tangent works as forward for a radially-symmetric prop.
	const seed = Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
	const forward = seed.sub(up.clone().multiplyScalar(seed.dot(up))).normalize();
	const base = surfaceQuaternion({ position, forward });
	const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin);
	return base.multiply(yaw);
}

/**
 * Renders the obstacles as placeholder rocks (dodecahedra) and trees
 * (trunk + foliage cone), each sat on the terrain and oriented to local up.
 * Swap these meshes for glTF models (Houdini/Blender/Substance) later — the
 * collision data in `obstaclesRef` is independent of the visuals.
 */
export function Scatter({
	obstaclesRef,
	count = 48,
	seed = 4242,
}: ScatterProps): React.ReactElement {
	const obstacles = useMemo(() => buildObstacles(count, seed), [count, seed]);

	useEffect(() => {
		obstaclesRef.current = obstacles;
	}, [obstacles, obstaclesRef]);

	return (
		<group>
			{obstacles.map((o, i) => {
				const dir = o.position.clone().normalize();
				const surfaceR =
					PLANET_RADIUS + terrainNoise(dir, 1337) * TERRAIN_AMPLITUDE;
				const base = dir.clone().multiplyScalar(surfaceR);
				const quat = obstacleQuaternion(o.position, o.spin);
				return (
					<group
						key={i}
						position={[base.x, base.y, base.z]}
						quaternion={quat}
					>
						{o.kind === 0 ? (
							<mesh position={[0, o.height * 0.4, 0]} castShadow receiveShadow>
								<dodecahedronGeometry args={[o.radius, 0]} />
								<meshStandardMaterial color="#6b6f76" flatShading roughness={1} />
							</mesh>
						) : (
							<group>
								<mesh position={[0, o.height * 0.3, 0]} castShadow>
									<cylinderGeometry
										args={[o.radius * 0.2, o.radius * 0.28, o.height * 0.6, 6]}
									/>
									<meshStandardMaterial color="#6b4f2a" roughness={1} />
								</mesh>
								<mesh position={[0, o.height * 0.75, 0]} castShadow>
									<coneGeometry args={[o.radius, o.height * 0.8, 7]} />
									<meshStandardMaterial color="#3f7d43" flatShading roughness={1} />
								</mesh>
							</group>
						)}
					</group>
				);
			})}
		</group>
	);
}
