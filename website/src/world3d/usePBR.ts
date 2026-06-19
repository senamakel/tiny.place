import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";

export interface PBRMaps {
	map: Texture;
	normalMap: Texture;
	roughnessMap: Texture;
}

/**
 * Loads a scanned PBR material set from `/public/textures/<name>/`
 * (albedo + normal + roughness) and configures wrapping/repeat/colour space.
 * Backed by drei's `useTexture`, so it suspends until loaded and caches by URL
 * (the same set requested by many meshes is fetched once). Drop Substance
 * exports into the same folder to replace a set.
 */
export function usePBR(name: string, repeat = 1): PBRMaps {
	const maps: PBRMaps = useTexture({
		map: `/textures/${name}/albedo.jpg`,
		normalMap: `/textures/${name}/normal.jpg`,
		roughnessMap: `/textures/${name}/roughness.jpg`,
	});

	useLayoutEffect(() => {
		// Three.js textures are external, mutable GPU resources (not React state),
		// so configuring them in place is the intended r3f pattern.
		/* eslint-disable react-hooks/immutability */
		maps.map.colorSpace = SRGBColorSpace;
		for (const texture of [maps.map, maps.normalMap, maps.roughnessMap]) {
			texture.wrapS = RepeatWrapping;
			texture.wrapT = RepeatWrapping;
			texture.repeat.set(repeat, repeat);
			texture.needsUpdate = true;
		}
		/* eslint-enable react-hooks/immutability */
	}, [maps, repeat]);

	return maps;
}
