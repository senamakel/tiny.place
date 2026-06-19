import { BufferGeometry, Mesh } from "three";
import {
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree,
} from "three-mesh-bvh";

/**
 * Install three-mesh-bvh's accelerated raycast onto three's prototypes, once.
 * After this, any geometry that has called `computeBoundsTree()` is raycast
 * against its BVH — fast enough to ground-follow the curved planet every frame.
 */
let installed = false;
export function installBVH(): void {
	if (installed) return;
	// three-mesh-bvh augments these prototypes; its helper signatures differ
	// slightly from the augmented members, so assign through the prototype types.
	BufferGeometry.prototype.computeBoundsTree =
		computeBoundsTree as unknown as typeof BufferGeometry.prototype.computeBoundsTree;
	BufferGeometry.prototype.disposeBoundsTree =
		disposeBoundsTree as unknown as typeof BufferGeometry.prototype.disposeBoundsTree;
	Mesh.prototype.raycast =
		acceleratedRaycast as unknown as typeof Mesh.prototype.raycast;
	installed = true;
}
