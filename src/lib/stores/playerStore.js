/**
 * @license MIT
 * ============================================================================
 * playerStore.js
 * ============================================================================
 * Legacy store interface maintained for backward compatibility.
 * Re-exports the reactive AudioPlayer instance from player.svelte.js while
 * offering standard Svelte writable stores if needed.
 * ============================================================================
 */
import { writable, derived } from 'svelte/store';
import { player } from '../player.svelte.js';

export { player };

export const playerState = writable({
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	isMuted: false
});

export const currentTrack = writable({
	title: '',
	artist: '',
	album: '',
	artwork: '',
	audioUrl: '',
	vttUrl: ''
});

/** @type {import('svelte/store').Writable<Array<{ start: number, end: number, text: string }>>} */
export const trackCues = writable([]);

export const activeCue = derived([playerState, trackCues], ([$state, $cues]) => {
	if (!$cues || $cues.length === 0) return null;
	return (
		$cues.find((cue) => $state.currentTime >= cue.start && $state.currentTime <= cue.end) || null
	);
});
