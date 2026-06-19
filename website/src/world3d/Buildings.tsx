import { useMemo } from "react";

import { PLANET_RADIUS, TERRAIN_AMPLITUDE } from "./constants";
import { obstacleQuaternion } from "./obstacles";
import { terrainNoise } from "./terrain";
import { getFacade } from "./textures";
import type { Building } from "./types";

interface BuildingsProps {
	buildings: ReadonlyArray<Building>;
}

/** A single procedural building: textured walls, a roof, and a door. */
function BuildingMesh({ b }: { b: Building }): React.ReactElement {
	const roofRadius = Math.hypot(b.footprint, b.depth);
	const roofHeight = b.kind === 1 ? 1.2 : roofRadius * 0.7;
	const isTower = b.kind === 1;
	const facade = useMemo(() => getFacade(b.kind, b.color), [b.kind, b.color]);
	return (
		<group>
			{/* Walls — procedural facade with windows; lit windows glow */}
			<mesh castShadow receiveShadow position={[0, b.height / 2, 0]}>
				<boxGeometry args={[b.footprint * 2, b.height, b.depth * 2]} />
				<meshStandardMaterial
					emissive="#ffd98a"
					emissiveIntensity={1.1}
					emissiveMap={facade.emissiveMap}
					map={facade.map}
					roughness={0.82}
				/>
			</mesh>
			{/* Roof — flat parapet for towers, pitched pyramid otherwise */}
			{isTower ? (
				<mesh castShadow position={[0, b.height + roofHeight / 2, 0]}>
					<boxGeometry
						args={[b.footprint * 2.1, roofHeight, b.depth * 2.1]}
					/>
					<meshStandardMaterial color={b.roof} roughness={0.8} />
				</mesh>
			) : (
				<mesh
					castShadow
					position={[0, b.height + roofHeight / 2, 0]}
					rotation={[0, Math.PI / 4, 0]}
				>
					<coneGeometry args={[roofRadius * 1.05, roofHeight, 4]} />
					<meshStandardMaterial flatShading color={b.roof} roughness={0.8} />
				</mesh>
			)}
			{/* Door on the +Z face */}
			<mesh position={[0, Math.min(1.1, b.height * 0.3), b.depth + 0.02]}>
				<planeGeometry args={[0.9, Math.min(2, b.height * 0.5)]} />
				<meshStandardMaterial color="#3a2a1c" roughness={0.7} />
			</mesh>
		</group>
	);
}

/**
 * Renders the procedural "real estate" — houses, towers and shops — each seated
 * on the terrain and oriented to local up. Swap `BuildingMesh` for glTF assets
 * (Houdini/Blender/Substance) later; the collider data is independent.
 */
export function Buildings({ buildings }: BuildingsProps): React.ReactElement {
	const placed = useMemo(
		() =>
			buildings.map((b) => {
				const direction = b.position.clone().normalize();
				const surfaceR =
					PLANET_RADIUS + terrainNoise(direction, 1337) * TERRAIN_AMPLITUDE;
				const base = direction.clone().multiplyScalar(surfaceR);
				const quaternion = obstacleQuaternion(b.position, b.spin);
				return { b, base, quaternion };
			}),
		[buildings]
	);

	return (
		<group>
			{placed.map(({ b, base, quaternion }, index) => (
				<group
					key={index}
					position={[base.x, base.y, base.z]}
					quaternion={quaternion}
				>
					<BuildingMesh b={b} />
				</group>
			))}
		</group>
	);
}
