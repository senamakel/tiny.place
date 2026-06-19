import { useMemo } from "react";
import { Cloud, Clouds as DreiClouds } from "@react-three/drei";
import { MeshBasicMaterial } from "three";

import { PLANET_RADIUS, TERRAIN_AMPLITUDE } from "./constants";
import { makeRng, randomDirection } from "./terrain";

interface CloudFieldProps {
	count?: number;
	seed?: number;
}

/**
 * A field of soft clouds floating in a shell above the planet. Positions are
 * deterministic for a given seed; drei's volumetric clouds billboard toward the
 * camera so they read well from anywhere on the surface.
 */
export function CloudField({
	count = 16,
	seed = 99,
}: CloudFieldProps): React.ReactElement {
	const positions = useMemo(() => {
		const rng = makeRng(seed);
		const altitude = PLANET_RADIUS + TERRAIN_AMPLITUDE + 20;
		return Array.from({ length: count }, () => {
			const p = randomDirection(rng).multiplyScalar(
				altitude + rng() * 14
			);
			return {
				position: [p.x, p.y, p.z] as [number, number, number],
				seed: Math.floor(rng() * 1000),
				scale: 6 + rng() * 6,
			};
		});
	}, [count, seed]);

	return (
		<DreiClouds limit={400} material={MeshBasicMaterial}>
			{positions.map((c, index) => (
				<Cloud
					key={index}
					bounds={[c.scale, c.scale * 0.4, c.scale]}
					color="#ffffff"
					concentrate="random"
					growth={c.scale}
					opacity={0.65}
					position={c.position}
					seed={c.seed}
					speed={0.15}
					volume={c.scale}
				/>
			))}
		</DreiClouds>
	);
}
