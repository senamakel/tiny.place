import type { MeshStandardMaterial, Texture } from "three";

interface TriplanarOptions {
	map: Texture;
	/** World-space sampling scale (smaller = larger features). */
	scale?: number;
	/** 0..1 how strongly the detail modulates the base colour. */
	strength?: number;
}

/**
 * Modulate a MeshStandardMaterial's diffuse colour with a triplanar-sampled
 * detail texture, so a sphere (or any UV-less surface) gets fine, seamless
 * surface variation without UV seams. Implemented by patching the built-in
 * shader via onBeforeCompile — vertex colours and lighting are preserved.
 */
export function applyTriplanarDetail(
	material: MeshStandardMaterial,
	{ map, scale = 0.12, strength = 0.45 }: TriplanarOptions
): void {
	material.onBeforeCompile = (shader): void => {
		shader.uniforms["uDetail"] = { value: map };
		shader.uniforms["uDetailScale"] = { value: scale };
		shader.uniforms["uDetailStrength"] = { value: strength };

		shader.vertexShader = shader.vertexShader
			.replace(
				"#include <common>",
				`#include <common>
varying vec3 vTriPos;
varying vec3 vTriNormal;`
			)
			.replace(
				"#include <begin_vertex>",
				`#include <begin_vertex>
vTriPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
			)
			.replace(
				"#include <beginnormal_vertex>",
				`#include <beginnormal_vertex>
vTriNormal = normalize(mat3(modelMatrix) * objectNormal);`
			);

		shader.fragmentShader = shader.fragmentShader
			.replace(
				"#include <common>",
				`#include <common>
uniform sampler2D uDetail;
uniform float uDetailScale;
uniform float uDetailStrength;
varying vec3 vTriPos;
varying vec3 vTriNormal;`
			)
			.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
{
  vec3 bw = abs(normalize(vTriNormal));
  bw /= (bw.x + bw.y + bw.z + 1e-5);
  float dx = texture2D(uDetail, vTriPos.zy * uDetailScale).r;
  float dy = texture2D(uDetail, vTriPos.xz * uDetailScale).r;
  float dz = texture2D(uDetail, vTriPos.xy * uDetailScale).r;
  float d = dx * bw.x + dy * bw.y + dz * bw.z;
  diffuseColor.rgb *= mix(1.0, 0.62 + 0.76 * d, uDetailStrength);
}`
			);
	};
	material.needsUpdate = true;
}
