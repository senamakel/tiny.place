import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group, type Mesh } from "three";

import { Avatar, type Gait } from "./Avatar";
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
import type { Collider } from "./types";
import type { InputState } from "./useKeyboard";

interface PlayerProps {
	stateRef: RefObject<SurfaceState>;
	planetRef: RefObject<Mesh | null>;
	collidersRef: RefObject<Array<Collider>>;
	avatarRef: RefObject<Group | null>;
	input: RefObject<InputState>;
}

/**
 * Drives the player avatar: turning, great-circle walking, collider blocking,
 * and ground-following the terrain via a three-mesh-bvh raycast each frame. The
 * gait ref feeds the humanoid's walk-cycle animation.
 */
export function Player({
	stateRef,
	planetRef,
	collidersRef,
	avatarRef,
	input,
}: PlayerProps): React.ReactElement {
	const temporaryUp = useRef(new Vector3());
	const gaitRef = useRef<Gait>({ speed: 0 });

	useFrame((_, rawDelta) => {
		const delta = Math.min(rawDelta, 0.05); // clamp big tab-out frames
		const keys = input.current;
		let state = stateRef.current;
		let groundSpeed = 0;

		// Turn (A/D).
		const turnDirection = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
		if (turnDirection !== 0) {
			state = turn(state, turnDirection * TURN_SPEED * delta);
		}

		// Walk (W/S) along the great circle, blocked by colliders.
		const moveDirection = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
		if (moveDirection !== 0) {
			const speed = WALK_SPEED * (keys.run ? 1.7 : 1);
			const proposed = stepForward(
				state,
				moveDirection * speed * delta,
				stateRef.current.position.length()
			);
			if (
				!isBlocked(
					proposed.position,
					collidersRef.current ?? [],
					PLAYER_COLLIDER_RADIUS
				)
			) {
				state = { position: proposed.position, forward: proposed.forward };
				groundSpeed = speed;
			} else {
				// Keep heading change but cancel the blocked translation.
				state = { position: state.position, forward: proposed.forward };
			}
		}

		stateRef.current = state;
		gaitRef.current.speed = groundSpeed;

		// Place + orient the avatar on the terrain surface.
		const avatar = avatarRef.current;
		const planet = planetRef.current;
		if (avatar) {
			const up = temporaryUp.current.copy(state.position).normalize();
			const ground = planet ? groundPoint(planet, state.position) : null;
			const foot = ground ?? state.position.clone();
			avatar.position.copy(foot).addScaledVector(up, PLAYER_EYE_HEIGHT);
			avatar.quaternion.copy(surfaceQuaternion(state));
		}
	});

	return (
		<group ref={avatarRef}>
			<Avatar gaitRef={gaitRef} />
		</group>
	);
}
