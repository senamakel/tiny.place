import { useEffect, useMemo, useRef } from "react";
import { Sky, Stars } from "@react-three/drei";
import { Vector3, type Group, type Mesh } from "three";

import { Buildings } from "./Buildings";
import { CameraRig } from "./CameraRig";
import { CloudField } from "./Clouds";
import { PLANET_RADIUS } from "./constants";
import { installBVH } from "./bvh";
import { placeBuildings } from "./building-data";
import { buildObstacles } from "./obstacles";
import { Planet } from "./Planet";
import { Player } from "./Player";
import { Scatter } from "./Scatter";
import type { SurfaceState } from "./sphereMovement";
import type { Collider } from "./types";
import type { InputState } from "./useKeyboard";

installBVH();

interface WorldSceneProps {
	input: React.RefObject<InputState>;
	seed?: number;
}

function initialState(): SurfaceState {
	// Start standing at the "north pole", facing along +X.
	return {
		position: new Vector3(0, PLANET_RADIUS, 0),
		forward: new Vector3(1, 0, 0),
	};
}

/**
 * The contents of the R3F <Canvas>: lighting, sky + clouds, the planet, scattered
 * props, procedural real estate, the player, and the follow camera. The scene
 * owns the combined collider list (props + buildings) the player walks against.
 */
export function WorldScene({ input, seed = 1337 }: WorldSceneProps): React.ReactElement {
	const planetRef = useRef<Mesh | null>(null);
	const avatarRef = useRef<Group | null>(null);
	const stateRef = useRef<SurfaceState>(initialState());

	const obstacles = useMemo(() => buildObstacles(64, seed + 1), [seed]);
	const buildings = useMemo(() => placeBuildings(seed + 7), [seed]);
	const colliders = useMemo<Array<Collider>>(
		() => [...obstacles, ...buildings],
		[obstacles, buildings]
	);
	const collidersRef = useRef<Array<Collider>>(colliders);
	useEffect(() => {
		collidersRef.current = colliders;
	}, [colliders]);

	return (
		<>
			<color args={["#0b1026"]} attach="background" />
			<Stars fade count={4000} depth={80} factor={8} radius={400} speed={0.4} />
			<Sky rayleigh={1.5} sunPosition={[120, 60, 120]} turbidity={5} />
			<CloudField seed={seed + 3} />

			<hemisphereLight args={["#cfe3ff", "#3a2f25", 0.75]} />
			<directionalLight
				castShadow
				intensity={1.45}
				position={[200, 160, 120]}
				shadow-bias={-0.0004}
				shadow-camera-bottom={-200}
				shadow-camera-far={700}
				shadow-camera-left={-200}
				shadow-camera-near={1}
				shadow-camera-right={200}
				shadow-camera-top={200}
				shadow-mapSize-height={2048}
				shadow-mapSize-width={2048}
			/>

			<Planet meshRef={planetRef} seed={seed} />
			<Scatter obstacles={obstacles} />
			<Buildings buildings={buildings} />
			<Player
				avatarRef={avatarRef}
				collidersRef={collidersRef}
				input={input}
				planetRef={planetRef}
				stateRef={stateRef}
			/>
			<CameraRig avatarRef={avatarRef} stateRef={stateRef} />
		</>
	);
}
