import { useRef } from "react";
import { Sky, Stars } from "@react-three/drei";
import { Vector3, type Group, type Mesh } from "three";

import { CameraRig } from "./CameraRig";
import { PLANET_RADIUS } from "./constants";
import { installBVH } from "./bvh";
import { Planet } from "./Planet";
import { Player } from "./Player";
import { Scatter } from "./Scatter";
import type { SurfaceState } from "./sphereMovement";
import type { Obstacle } from "./types";
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
 * The contents of the R3F <Canvas>: lighting, sky, the planet, scattered props,
 * the player, and the follow camera. Pure scene graph — the <Canvas> wrapper
 * and HUD live in the World view so they can overlay DOM.
 */
export function WorldScene({ input, seed = 1337 }: WorldSceneProps): React.ReactElement {
	const planetRef = useRef<Mesh | null>(null);
	const avatarRef = useRef<Group | null>(null);
	const obstaclesRef = useRef<Array<Obstacle>>([]);
	const stateRef = useRef<SurfaceState>(initialState());

	return (
		<>
			<color args={["#0b1026"]} attach="background" />
			<Stars fade count={4000} depth={60} factor={6} radius={300} speed={0.5} />
			<Sky rayleigh={1.2} sunPosition={[100, 40, 100]} turbidity={6} />

			<hemisphereLight args={["#bcd7ff", "#3a2f25", 0.7]} />
			<directionalLight
				castShadow
				intensity={1.4}
				position={[80, 60, 40]}
				shadow-camera-bottom={-90}
				shadow-camera-far={300}
				shadow-camera-left={-90}
				shadow-camera-near={1}
				shadow-camera-right={90}
				shadow-camera-top={90}
				shadow-mapSize-height={2048}
				shadow-mapSize-width={2048}
			/>

			<Planet meshRef={planetRef} seed={seed} />
			<Scatter obstaclesRef={obstaclesRef} seed={seed + 1} />
			<Player
				avatarRef={avatarRef}
				input={input}
				obstaclesRef={obstaclesRef}
				planetRef={planetRef}
				stateRef={stateRef}
			/>
			<CameraRig avatarRef={avatarRef} stateRef={stateRef} />
		</>
	);
}
