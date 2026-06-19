import type { MeshStandardMaterial, Texture } from "three";

interface TriplanarOptions {
	/** Colour texture (sRGB) sampled triplanar and multiplied into the surface. */
	map: Texture;
	/** World-space sampling scale (smaller = larger features). */
	scale?: number;
	/** 0..1 how strongly the texture modulates the base colour. */
	strength?: number;
	/** Brightness compensation for the multiply (keeps mid-tones from going dark). */
	boost?: number;
}

/**
 * Multiply a MeshStandardMaterial's diffuse colour with a triplanar-sampled
 * colour texture, so a sphere (or any UV-less surface) gets rich, seamless
 * detail without UV seams. The altitude vertex colours act as a macro tint and
 * the texture supplies micro detail. Implemented by patching the built-in
 * shader via onBeforeCompile; lighting and shadows are preserved.
 */
export function applyTriplanarDetail(
	material: MeshStandardMaterial,
	{ map, scale = 0.06, strength = 0.7, boost = 1.8 }: TriplanarOptions
): void {
	material.onBeforeCompile = (shader): void => {
		shader.uniforms["uTri"] = { value: map };
		shader.uniforms["uTriScale"] = { value: scale };
		shader.uniforms["uTriStrength"] = { value: strength };
		shader.uniforms["uTriBoost"] = { value: boost };

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
uniform sampler2D uTri;
uniform float uTriScale;
uniform float uTriStrength;
uniform float uTriBoost;
varying vec3 vTriPos;
varying vec3 vTriNormal;`
			)
			.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
{
  vec3 bw = abs(normalize(vTriNormal));
  bw /= (bw.x + bw.y + bw.z + 1e-5);
  vec3 cx = texture2D(uTri, vTriPos.zy * uTriScale).rgb;
  vec3 cy = texture2D(uTri, vTriPos.xz * uTriScale).rgb;
  vec3 cz = texture2D(uTri, vTriPos.xy * uTriScale).rgb;
  vec3 tex = cx * bw.x + cy * bw.y + cz * bw.z;
  tex = pow(tex, vec3(2.2)) * uTriBoost; // sRGB -> linear + brighten
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * tex, uTriStrength);
}`
			);
	};
	material.needsUpdate = true;
}
