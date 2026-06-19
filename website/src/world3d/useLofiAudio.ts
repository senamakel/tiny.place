import { useCallback, useEffect, useRef, useState } from "react";

import { LOFI_STREAM_URL } from "./constants";

interface LofiAudio {
	playing: boolean;
	/** True once the user has interacted and a play attempt was made. */
	started: boolean;
	toggle: () => void;
}

/**
 * Streams the lo-fi soundtrack from a URL — deliberately NOT bundled. The audio
 * element pulls the stream on demand; the player is muted until the user opts
 * in (browsers block autoplay), then loops the live stream.
 */
export function useLofiAudio(url: string = LOFI_STREAM_URL): LofiAudio {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [started, setStarted] = useState(false);

	useEffect(() => {
		const audio = new Audio();
		audio.src = url;
		audio.crossOrigin = "anonymous";
		audio.preload = "none";
		audio.loop = true;
		audio.volume = 0.5;
		audioRef.current = audio;

		const onPlay = (): void => setPlaying(true);
		const onPause = (): void => setPlaying(false);
		audio.addEventListener("play", onPlay);
		audio.addEventListener("pause", onPause);

		return () => {
			audio.removeEventListener("play", onPlay);
			audio.removeEventListener("pause", onPause);
			audio.pause();
			audio.src = "";
			audioRef.current = null;
		};
	}, [url]);

	const toggle = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		setStarted(true);
		if (audio.paused) {
			void audio.play().catch(() => setPlaying(false));
		} else {
			audio.pause();
		}
	}, []);

	return { playing, started, toggle };
}
