import { PLANET_RADIUS, TERRAIN_AMPLITUDE } from "./constants";
import { obstacleQuaternion } from "./obstacles";
import { terrainNoise } from "./terrain";
import type { Obstacle } from "./types";

interface ScatterProps {
	obstacles: ReadonlyArray<Obstacle>;
}

/**
 * Renders the obstacles as placeholder rocks (dodecahedra) and trees
 * (trunk + foliage cone), each sat on the terrain and oriented to local up.
 * Swap these meshes for glTF models (Houdini/Blender/Substance) later — the
 * collider data is owned by the parent scene and is independent of the visuals.
 */
export function Scatter({ obstacles }: ScatterProps): React.ReactElement {
	return (
		<group>
			{obstacles.map((o, index) => {
				const direction = o.position.clone().normalize();
				const surfaceR =
					PLANET_RADIUS + terrainNoise(direction, 1337) * TERRAIN_AMPLITUDE;
				const base = direction.clone().multiplyScalar(surfaceR);
				const quat = obstacleQuaternion(o.position, o.spin);
				return (
					<group
						key={index}
						position={[base.x, base.y, base.z]}
						quaternion={quat}
					>
						{o.kind === 0 ? (
							<mesh castShadow receiveShadow position={[0, o.height * 0.4, 0]}>
								<dodecahedronGeometry args={[o.radius, 0]} />
								<meshStandardMaterial flatShading color="#6b6f76" roughness={1} />
							</mesh>
						) : (
							<group>
								<mesh castShadow position={[0, o.height * 0.3, 0]}>
									<cylinderGeometry
										args={[o.radius * 0.2, o.radius * 0.28, o.height * 0.6, 6]}
									/>
									<meshStandardMaterial color="#6b4f2a" roughness={1} />
								</mesh>
								<mesh castShadow position={[0, o.height * 0.75, 0]}>
									<coneGeometry args={[o.radius, o.height * 0.8, 7]} />
									<meshStandardMaterial flatShading color="#3f7d43" roughness={1} />
								</mesh>
							</group>
						)}
					</group>
				);
			})}
		</group>
	);
}
