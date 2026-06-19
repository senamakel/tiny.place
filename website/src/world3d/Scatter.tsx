import { PLANET_RADIUS, TERRAIN_AMPLITUDE } from "./constants";
import { obstacleQuaternion } from "./obstacles";
import { terrainNoise } from "./terrain";
import { getDetailNoise } from "./textures";
import type { Obstacle } from "./types";
import { usePBR } from "./usePBR";

interface ScatterProps {
	obstacles: ReadonlyArray<Obstacle>;
}

/**
 * Renders the obstacles as rocks (real scanned-rock PBR) and trees (procedural
 * bump-mapped bark + foliage), each sat on the terrain and oriented to local up.
 * Swap these meshes for glTF models (Houdini/Blender/Substance) later — the
 * collider data is owned by the parent scene and is independent of the visuals.
 */
export function Scatter({ obstacles }: ScatterProps): React.ReactElement {
	const bump = getDetailNoise();
	const rock = usePBR("rock", 1.5);
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
								<dodecahedronGeometry args={[o.radius, 1]} />
								<meshStandardMaterial
									map={rock.map}
									normalMap={rock.normalMap}
									roughnessMap={rock.roughnessMap}
								/>
							</mesh>
						) : (
							<group>
								<mesh castShadow position={[0, o.height * 0.3, 0]}>
									<cylinderGeometry
										args={[o.radius * 0.2, o.radius * 0.28, o.height * 0.6, 8]}
									/>
									<meshStandardMaterial
										bumpMap={bump}
										bumpScale={0.4}
										color="#6b4f2a"
										roughness={1}
									/>
								</mesh>
								<mesh castShadow position={[0, o.height * 0.78, 0]}>
									<coneGeometry args={[o.radius, o.height * 0.85, 9]} />
									<meshStandardMaterial
										bumpMap={bump}
										bumpScale={0.5}
										color="#3f7d43"
										roughness={0.95}
									/>
								</mesh>
								<mesh castShadow position={[0, o.height * 1.05, 0]}>
									<coneGeometry args={[o.radius * 0.7, o.height * 0.55, 9]} />
									<meshStandardMaterial
										bumpMap={bump}
										bumpScale={0.5}
										color="#4a9150"
										roughness={0.95}
									/>
								</mesh>
							</group>
						)}
					</group>
				);
			})}
		</group>
	);
}
