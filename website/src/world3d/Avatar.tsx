import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

export interface Gait {
	/** Current ground speed in world units/sec (0 when idle). */
	speed: number;
}

interface AvatarProps {
	gaitRef: RefObject<Gait>;
}

const SKIN = "#e8b58f";
const SHIRT = "#3a6ea5";
const PANTS = "#34415e";
const SHOES = "#22262e";
const HAIR = "#3b2a1d";

/**
 * A simple humanoid built from primitives (head, torso, two arms, two legs)
 * facing +Z so it lines up with the surface "forward". Limbs swing with a walk
 * cycle whose speed and amplitude track the player's ground speed; the whole
 * body bobs slightly while moving. Replace with a rigged glTF later.
 */
export function Avatar({ gaitRef }: AvatarProps): React.ReactElement {
	const leftLeg = useRef<Group>(null);
	const rightLeg = useRef<Group>(null);
	const leftArm = useRef<Group>(null);
	const rightArm = useRef<Group>(null);
	const body = useRef<Group>(null);
	const phase = useRef(0);

	useFrame((_, rawDelta) => {
		const delta = Math.min(rawDelta, 0.05);
		const speed = gaitRef.current?.speed ?? 0;
		const moving = Math.min(1, speed / 6); // 0..1 blend toward full stride
		phase.current += delta * (2 + speed * 0.5);

		const swing = Math.sin(phase.current) * 0.6 * moving;
		const armSwing = Math.sin(phase.current) * 0.5 * moving;
		if (leftLeg.current) leftLeg.current.rotation.x = swing;
		if (rightLeg.current) rightLeg.current.rotation.x = -swing;
		if (leftArm.current) leftArm.current.rotation.x = -armSwing;
		if (rightArm.current) rightArm.current.rotation.x = armSwing;
		if (body.current) {
			// Subtle vertical bob at twice the stride frequency.
			body.current.position.y =
				Math.abs(Math.sin(phase.current)) * 0.08 * moving;
		}
	});

	return (
		<group ref={body}>
			{/* Legs (pivot at the hips, swing about X) */}
			<group ref={leftLeg} position={[-0.18, 0.85, 0]}>
				<mesh castShadow position={[0, -0.42, 0]}>
					<capsuleGeometry args={[0.15, 0.55, 4, 8]} />
					<meshStandardMaterial color={PANTS} roughness={0.8} />
				</mesh>
				<mesh castShadow position={[0, -0.82, 0.06]}>
					<boxGeometry args={[0.2, 0.12, 0.34]} />
					<meshStandardMaterial color={SHOES} roughness={0.7} />
				</mesh>
			</group>
			<group ref={rightLeg} position={[0.18, 0.85, 0]}>
				<mesh castShadow position={[0, -0.42, 0]}>
					<capsuleGeometry args={[0.15, 0.55, 4, 8]} />
					<meshStandardMaterial color={PANTS} roughness={0.8} />
				</mesh>
				<mesh castShadow position={[0, -0.82, 0.06]}>
					<boxGeometry args={[0.2, 0.12, 0.34]} />
					<meshStandardMaterial color={SHOES} roughness={0.7} />
				</mesh>
			</group>

			{/* Torso */}
			<mesh castShadow position={[0, 1.18, 0]}>
				<capsuleGeometry args={[0.28, 0.5, 6, 12]} />
				<meshStandardMaterial color={SHIRT} roughness={0.75} />
			</mesh>

			{/* Arms (pivot at the shoulders) */}
			<group ref={leftArm} position={[-0.4, 1.5, 0]}>
				<mesh castShadow position={[0, -0.34, 0]}>
					<capsuleGeometry args={[0.1, 0.5, 4, 8]} />
					<meshStandardMaterial color={SHIRT} roughness={0.75} />
				</mesh>
				<mesh castShadow position={[0, -0.66, 0]}>
					<sphereGeometry args={[0.12, 10, 10]} />
					<meshStandardMaterial color={SKIN} roughness={0.7} />
				</mesh>
			</group>
			<group ref={rightArm} position={[0.4, 1.5, 0]}>
				<mesh castShadow position={[0, -0.34, 0]}>
					<capsuleGeometry args={[0.1, 0.5, 4, 8]} />
					<meshStandardMaterial color={SHIRT} roughness={0.75} />
				</mesh>
				<mesh castShadow position={[0, -0.66, 0]}>
					<sphereGeometry args={[0.12, 10, 10]} />
					<meshStandardMaterial color={SKIN} roughness={0.7} />
				</mesh>
			</group>

			{/* Head */}
			<mesh castShadow position={[0, 1.78, 0]}>
				<sphereGeometry args={[0.24, 16, 16]} />
				<meshStandardMaterial color={SKIN} roughness={0.6} />
			</mesh>
			{/* Hair cap */}
			<mesh castShadow position={[0, 1.86, -0.02]}>
				<sphereGeometry
					args={[0.255, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]}
				/>
				<meshStandardMaterial color={HAIR} roughness={0.8} />
			</mesh>
		</group>
	);
}
