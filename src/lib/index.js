/**
 * @license MIT
 * ============================================================================
 * src/lib/index.js — Public Barrel Module (`#lib` / `$lib` Entry Point)
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is an `index.js` "barrel" file?
 *     In JavaScript projects, `index.js` acts like a curated front-door
 *     directory ("barrel file") that gathers the most important tools from
 *     neighboring files (`player.svelte.js`, `data/musicData.js`, and
 *     `components/Player.svelte`) and re-exports them from one convenient
 *     import path (`#lib` or `$lib`).
 *
 *   How this file connects to The Listening Room:
 *     - Re-exports `player` (singleton reactive audio engine) and `AudioPlayer`
 *       class from `./player.svelte.js`.
 *     - Re-exports `featuredAlbums` (catalog array) and `formatAlbumQueue`
 *       helper from `./data/musicData.js`.
 *     - Re-exports the persistent bottom `<Player />` Svelte component.
 * ============================================================================
 */

// Re-export the shared reactive `player` singleton and its `AudioPlayer` class blueprint
export { player, AudioPlayer } from './player.svelte.js';

// Re-export the full album catalog alias and the helper that turns an album into a playable queue
export { featuredAlbums, formatAlbumQueue } from './data/musicData.js';

// Re-export the default export of `Player.svelte` under the named export `Player`
export { default as Player } from './components/Player.svelte';
