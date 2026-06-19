"use client";

import { Canvas } from "@react-three/fiber";

import type { FunctionComponent } from "@src/common/types";
import { useKeyboard, useLofiAudio, WorldScene } from "@src/world3d";

/**
 * The open 3D planet world. Renders the R3F canvas full-bleed with a thin DOM
 * HUD overlay (controls hint + streamed lo-fi audio toggle). Single-player for
 * now; the WorldScene refs are the seam where WebSocket presence will plug in.
 */
export function World(): FunctionComponent {
	const input = useKeyboard();
	const audio = useLofiAudio();

	return (
		<div className="relative h-dvh w-full overflow-hidden bg-[#0b1026]">
			<Canvas
				shadows
				camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 70, 0] }}
				gl={{ antialias: true, powerPreference: "high-performance" }}
			>
				<WorldScene input={input} />
			</Canvas>

			{/* HUD overlay */}
			<div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-white">
				<div className="flex items-start justify-between">
					<div className="rounded-lg bg-black/40 px-3 py-2 text-sm backdrop-blur">
						<div className="font-semibold">tiny.place — open world</div>
						<div className="text-xs text-white/70">
							WASD / arrows to move · Shift to run
						</div>
					</div>

					<button
						type="button"
						onClick={audio.toggle}
						className="pointer-events-auto rounded-lg bg-black/40 px-3 py-2 text-sm backdrop-blur transition hover:bg-black/60"
						aria-pressed={audio.playing}
					>
						{audio.playing ? "♪ lo-fi: on" : "♪ lo-fi: off"}
					</button>
				</div>

				<div className="self-center rounded-full bg-black/40 px-4 py-1 text-xs text-white/60 backdrop-blur">
					exploring a tiny planet · single-player preview
				</div>
			</div>
		</div>
	);
}
