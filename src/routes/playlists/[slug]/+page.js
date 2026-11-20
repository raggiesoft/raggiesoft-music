/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/playlists/[slug]/+page.js
 * URL SERVED: https://music.raggiesoft.com/playlists/[slug]
 *             (e.g., `/playlists/john-and-erin`)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
 * Just like `[artist]` is a dynamic URL variable for bands, `[slug]` inside
 * `src/routes/playlists/[slug]/` is a dynamic URL variable for Official Story
 * Playlists! ("Slug" is publishing slang for a URL-friendly title like
 * `john-and-erin`.)
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `entries()` returns every curated playlist slug so SvelteKit generates
 *   static HTML files (such as `build/playlists/john-and-erin.html`) at build
 *   time with complete OpenGraph social cards and `MusicPlaylist` JSON-LD.
 * - `load({ params })` hydrates the full playlist object (resolving all track
 *   audio URLs, lyrics, lore notes, and novel chapter links) and passes `{ playlist }`
 *   into `playlists/[slug]/+page.svelte`.
 * ============================================================================
 */
import { error } from '@sveltejs/kit';
import { curatedPlaylists, getCuratedPlaylistBySlug } from '#lib/playlists.svelte.js';

// Enable static build-time HTML generation for every curated playlist route.
export const prerender = true;

/**
 * Generates static paths for all curated story playlists at build time.
 * Each object `{ slug: p.slug }` fills in the `[slug]` dynamic folder name.
 */
export function entries() {
	return curatedPlaylists.map((p) => ({ slug: p.slug }));
}

/**
 * Looks up the requested curated playlist by `params.slug` or triggers a 404 page
 * if no curated playlist matches that URL slug.
 *
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const playlist = getCuratedPlaylistBySlug(params.slug);
	if (!playlist) {
		// In SvelteKit 2, calling `error(404, ...)` throws an HttpError immediately,
		// handing control to `src/routes/+error.svelte`.
		error(404, {
			message: `Playlist "${params.slug}" was not found in The Listening Room.`
		});
	}

	// Passed to `playlists/[slug]/+page.svelte` as `data.playlist`.
	return {
		playlist
	};
}
