/**
 * @license MIT
 * ============================================================================
 * src/lib/stores/playerStore.js — Legacy Svelte 4 Store Compatibility Bridge
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   Svelte 4 Stores vs. Svelte 5 Runes:
 *     Before Svelte 5 introduced Runes (`$state` and `$derived` inside
 *     `.svelte.js` files), Svelte 3 & 4 shared state between components using
 *     observable "store" objects (`writable(...)` and `derived(...)` from
 *     `'svelte/store'`), where components subscribed using a `$storeName`
 *     prefix.
 *
 *   How this file connects to The Listening Room:
 *     The Listening Room's primary audio engine now lives in
 *     `src/lib/player.svelte.js` (built with Svelte 5 Runes) and is re-exported
 *     here as `player`. We also keep these lightweight `writable` and `derived`
 *     stores available for backward compatibility and as a clear side-by-side
 *     reference showing how classic `svelte/store` compares to Svelte 5 Runes.
 * ============================================================================
 */

// `writable(initialValue)` creates an observable box whose value can be updated;
// `derived(stores, callback)` automatically computes a new value whenever its input stores change.
import { writable, derived } from 'svelte/store';
// Import the modern Svelte 5 Runes audio player singleton so callers importing from here still get it
import { player } from '../player.svelte.js';

// Re-export the primary Svelte 5 `player` instance
export { player };

// Classic writable store holding basic playback flags and numbers
export const playerState = writable({
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	isMuted: false
});

// Classic writable store holding basic metadata for the active track
export const currentTrack = writable({
	title: '',
	artist: '',
	album: '',
	artwork: '',
	audioUrl: '',
	vttUrl: ''
});

// Classic writable store holding parsed WebVTT lyric cues (`start`/`end` in seconds + `text`)
/** @type {import('svelte/store').Writable<Array<{ start: number, end: number, text: string }>>} */
export const trackCues = writable([]);

// Classic derived store: recalculates automatically whenever `playerState` or `trackCues` updates,
// returning whichever lyric line (`cue`) spans the current playback timestamp (`currentTime`).
export const activeCue = derived([playerState, trackCues], ([$state, $cues]) => {
	if (!$cues || $cues.length === 0) return null;
	return (
		$cues.find((cue) => $state.currentTime >= cue.start && $state.currentTime <= cue.end) || null
	);
});
