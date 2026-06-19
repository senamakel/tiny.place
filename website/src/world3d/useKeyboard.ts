import { useEffect, useRef, type MutableRefObject } from "react";

export interface InputState {
	forward: boolean;
	back: boolean;
	left: boolean;
	right: boolean;
	run: boolean;
}

const KEY_MAP: Record<string, keyof InputState> = {
	KeyW: "forward",
	ArrowUp: "forward",
	KeyS: "back",
	ArrowDown: "back",
	KeyA: "left",
	ArrowLeft: "left",
	KeyD: "right",
	ArrowRight: "right",
	ShiftLeft: "run",
	ShiftRight: "run",
};

/**
 * Tracks held movement keys in a ref (no re-renders). WASD / arrows steer;
 * Shift runs. Returns a stable ref the frame loop reads each tick.
 */
export function useKeyboard(): MutableRefObject<InputState> {
	const state = useRef<InputState>({
		forward: false,
		back: false,
		left: false,
		right: false,
		run: false,
	});

	useEffect(() => {
		const set = (code: string, value: boolean): void => {
			const key = KEY_MAP[code];
			if (key) state.current[key] = value;
		};
		const onDown = (event: KeyboardEvent): void => {
			if (KEY_MAP[event.code]) event.preventDefault();
			set(event.code, true);
		};
		const onUp = (event: KeyboardEvent): void => {
			set(event.code, false);
		};
		const onBlur = (): void => {
			state.current = {
				forward: false,
				back: false,
				left: false,
				right: false,
				run: false,
			};
		};
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		window.addEventListener("blur", onBlur);
		return (): void => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
			window.removeEventListener("blur", onBlur);
		};
	}, []);

	return state;
}
