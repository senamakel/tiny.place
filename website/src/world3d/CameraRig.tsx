import { useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";

import { CAMERA_BACK, CAMERA_LERP, CAMERA_UP } from "./constants";
import { tangentForward, type SurfaceState } from "./sphereMovement";

interface CameraRigProps {
	avatarRef: RefObject<Group | null>;
	stateRef: RefObject<SurfaceState>;
}

/**
 * Third-person follow camera. Sits behind and above the avatar in its local
 * surface frame, lerping smoothly and keeping local up as the camera up so the
 * horizon stays level as the player walks around the planet.
 */
export function CameraRig({ avatarRef, stateRef }: CameraRigProps): React.ReactElement {
	const camera = useThree((s) => s.camera);
	const desired = useRef(new Vector3());
	const target = useRef(new Vector3());
	const up = useRef(new Vector3());
	const initialized = useRef(false);

	useFrame((_, rawDelta) => {
		const avatar = avatarRef.current;
		if (!avatar) return;
		const state = stateRef.current;
		up.current.copy(state.position).normalize();
		const forward = tangentForward(state.position, state.forward);

		target.current.copy(avatar.position);
		desired.current
			.copy(avatar.position)
			.addScaledVector(forward, -CAMERA_BACK)
			.addScaledVector(up.current, CAMERA_UP);

		if (!initialized.current) {
			camera.position.copy(desired.current);
			initialized.current = true;
		} else {
			const t = 1 - Math.exp(-CAMERA_LERP * Math.min(rawDelta, 0.05));
			camera.position.lerp(desired.current, t);
		}
		camera.up.copy(up.current);
		camera.lookAt(target.current);
	});

	return <></>;
}
