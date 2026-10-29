/**
 * @license MIT
 * ============================================================================
 * index.js
 * ============================================================================
 * Public library exports for Engine Room Records (#lib).
 * Exposes the reactive AudioPlayer state engine, UI components, and catalog data.
 * ============================================================================
 */

export { player, AudioPlayer } from './player.svelte.js';
export { featuredAlbums, formatAlbumQueue } from './data/musicData.js';
export { default as Player } from './components/Player.svelte';
