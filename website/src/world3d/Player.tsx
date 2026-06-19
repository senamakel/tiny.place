import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, type Mesh } from "three";

import {
	PLAYER_COLLIDER_RADIUS,
	PLAYER_EYE_HEIGHT,
	TURN_SPEED,
	WALK_SPEED,
} from "./constants";
import { groundPoint, isBlocked } from "./collision";
import {
	stepForward,
	surfaceQuaternion,
	turn,
	type SurfaceState,
} from "./sphereMovement";
import type { InputState } from "./useKeyboard";
import type { Obstacle } from "./types";

interface PlayerProps {
	stateRef: RefObject<SurfaceState>;
	planetRef: RefObject<Mesh | null>;
	obstaclesRef: RefObject<Obstacle[]>;
	avatarRef: RefObject<Group | null>;
	input: RefObject<InputState>;
}

/**
 * Drives the player avatar: turning, great-circle walking, obstacle blocking,
 * and ground-following the terrain via a three-mesh-bvh raycast each frame.
 */
export function Player({
	stateRef,
	planetRef,
	obstaclesRef,
	avatarRef,
	input,
}: PlayerProps): React.ReactElement {
	const tmpUp = useRef(new Vector3());

	useFrame((_, rawDelta) => {
		const delta = Math.min(rawDelta, 0.05); // clamp big tab-out frames
		const i = input.current;
		let state = stateRef.current;

		// Turn (A/D).
		const turnDir = (i.left ? 1 : 0) - (i.right ? 1 : 0);
		if (turnDir !== 0) state = turn(state, turnDir * TURN_SPEED * delta);

		// Walk (W/S) along the great circle, blocked by obstacles.
		const moveDir = (i.forward ? 1 : 0) - (i.back ? 1 : 0);
		if (moveDir !== 0) {
			const speed = WALK_SPEED * (i.run ? 1.7 : 1);
			const proposed = stepForward(state, moveDir * speed * delta, stateRef.current.position.length());
			if (!isBlocked(proposed.position, obstaclesRef.current ?? [], PLAYER_COLLIDER_RADIUS)) {
				state = { position: proposed.position, forward: proposed.forward };
			} else {
				// Keep heading change but cancel the blocked translation.
				state = { position: state.position, forward: proposed.forward };
			}
		}

		stateRef.current = state;

		// Place + orient the avatar on the terrain surface.
		const avatar = avatarRef.current;
		const planet = planetRef.current;
		if (avatar) {
			const up = tmpUp.current.copy(state.position).normalize();
			const ground = planet ? groundPoint(planet, state.position) : null;
			const foot = ground ?? state.position.clone();
			avatar.position
				.copy(foot)
				.addScaledVector(up, PLAYER_EYE_HEIGHT);
			avatar.quaternion.copy(surfaceQuaternion(state));
		}
	});

	return (
		<group ref={avatarRef}>
			{/* Body */}
			<mesh position={[0, 0, 0]} castShadow>
				<capsuleGeometry args={[0.5, 1, 6, 12]} />
				<meshStandardMaterial color="#ff6b9d" roughness={0.6} />
			</mesh>
			{/* Facing indicator (points along +Z = forward) */}
			<mesh position={[0, 0.2, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
				<coneGeometry args={[0.18, 0.5, 8]} />
				<meshStandardMaterial color="#ffd23f" roughness={0.5} />
			</mesh>
		</group>
	);
}
