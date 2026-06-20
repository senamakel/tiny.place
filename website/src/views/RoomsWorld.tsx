"use client";

import { useEffect, useRef, useState } from "react";

import type { FunctionComponent } from "@src/common/types";
import { GameWorld, ROOM_REGISTRY } from "@src/iso";

const INITIAL_AGENTS = 7;
const REFILL_AGENTS = 6;

const toggleClass = (active: boolean): string =>
	`rounded-lg border px-3 py-2 text-sm transition ${
		active
			? "border-primary bg-primary text-white"
			: "border-border bg-bg text-front hover:border-primary"
	}`;

export const RoomsWorld = (): FunctionComponent => {
	const containerRef = useRef<HTMLDivElement>(null);
	const worldRef = useRef<GameWorld | null>(null);
	const [ready, setReady] = useState(false);
	const [roomKey, setRoomKey] = useState(ROOM_REGISTRY[0]!.key);
	const [agentCount, setAgentCount] = useState(0);
	const [autonomous, setAutonomous] = useState(true);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}
		const world = new GameWorld();
		worldRef.current = world;
		let disposed = false;

		void world.init(container).then(() => {
			if (disposed) {
				world.destroy();
				return;
			}
			world.setChangeListener(() => {
				setAgentCount(world.agentCount);
				setRoomKey(world.currentRoomKey);
			});
			world.spawnAgents(INITIAL_AGENTS);
			world.setAutonomous(true);
			setReady(true);
		});

		return (): void => {
			disposed = true;
			world.setChangeListener(null);
			world.destroy();
			worldRef.current = null;
		};
	}, []);

	const handleRoom = (key: string): void => {
		const world = worldRef.current;
		if (!world) {
			return;
		}
		world.setRoom(key);
		world.spawnAgents(INITIAL_AGENTS);
		world.setAutonomous(autonomous);
		setRoomKey(key);
	};

	const handleAdd = (count: number): void => {
		worldRef.current?.spawnAgents(count);
	};

	const handleClear = (): void => {
		worldRef.current?.clearAgents();
	};

	const handleSpeak = (): void => {
		worldRef.current?.nudgeChatter();
	};

	const handleAutonomy = (): void => {
		const next = !autonomous;
		setAutonomous(next);
		worldRef.current?.setAutonomous(next);
	};

	const activeRoom = ROOM_REGISTRY.find((entry) => entry.key === roomKey);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
			<header className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold text-front">Agent World</h1>
				<p className="max-w-2xl text-sm text-muted">
					A state-driven 2D isometric world rendered with PixiJS v8 + WebGPU.
					Agents are reconciled toward an authoritative state, slide between
					tiles with interpolation, and speak in lightweight bitmap-text
					bubbles. Click an agent to select it, then click the floor to send it
					walking.
				</p>
			</header>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
				<div className="flex flex-col gap-3">
					<div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
						<div ref={containerRef} className="aspect-square w-full" />
						{ready ? null : (
							<div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
								Booting renderer…
							</div>
						)}
					</div>
					<div className="flex items-center justify-between text-xs text-muted">
						<span>
							{activeRoom?.name} · {activeRoom?.description}
						</span>
						<span>{agentCount} agents</span>
					</div>
				</div>

				<aside className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4">
					<section className="flex flex-col gap-2">
						<h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
							Room
						</h2>
						<div className="grid grid-cols-2 gap-2">
							{ROOM_REGISTRY.map((entry) => (
								<button
									key={entry.key}
									className={toggleClass(entry.key === roomKey)}
									type="button"
									onClick={() => {
										handleRoom(entry.key);
									}}
								>
									{entry.name}
								</button>
							))}
						</div>
					</section>

					<section className="flex flex-col gap-2">
						<h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
							Agents
						</h2>
						<div className="grid grid-cols-2 gap-2">
							<button
								className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-front transition hover:border-primary"
								type="button"
								onClick={() => {
									handleAdd(1);
								}}
							>
								+1 agent
							</button>
							<button
								className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-front transition hover:border-primary"
								type="button"
								onClick={() => {
									handleAdd(REFILL_AGENTS);
								}}
							>
								+{REFILL_AGENTS} agents
							</button>
							<button
								className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-front transition hover:border-primary"
								type="button"
								onClick={handleSpeak}
							>
								Make them talk
							</button>
							<button
								className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-front transition hover:border-danger"
								type="button"
								onClick={handleClear}
							>
								Clear
							</button>
						</div>
					</section>

					<section className="flex flex-col gap-2">
						<h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
							Simulation
						</h2>
						<button
							className={toggleClass(autonomous)}
							type="button"
							onClick={handleAutonomy}
						>
							Autonomous wander: {autonomous ? "on" : "off"}
						</button>
						<p className="text-xs leading-relaxed text-muted">
							With autonomy on, idle agents wander to random tiles and chatter.
							Authoritative <code>updateAgentState</code> calls always win.
						</p>
					</section>
				</aside>
			</div>
		</div>
	);
};
