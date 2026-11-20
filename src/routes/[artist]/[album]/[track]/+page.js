/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/[artist]/[album]/[track]/+page.js
 * URL SERVED: https://music.raggiesoft.com/[artist]/[album]/[track]
 *             (e.g., `/the-stardust-engine/1996-ad-astra-single/escape-velocity-ad-astra`)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
 * This is the deepest level of our three-tier hierarchical URL router:
 *   `/[artist]` -> `/[artist]/[album]` -> `/[artist]/[album]/[track]`
 * Because this file sits inside THREE nested bracketed folders, SvelteKit
 * extracts all three dynamic URL variables at once:
 *   - `params.artist` (the band's URL slug)
 *   - `params.album`  (the album's URL slug)
 *   - `params.track`  (the individual song's URL slug)
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `entries()` loops over every album and every track inside that album,
 *   returning 500+ `{ artist, album, track }` parameter triplets so SvelteKit's
 *   static adapter pre-builds a dedicated HTML page for every single song!
 * - `load({ params })` validates the album and song, computes the previous and
 *   next tracks on the album (for "Previous Song / Next Song" buttons), looks
 *   up alternate studio/live versions (`getRelatedSongs`), and passes everything
 *   into `[artist]/[album]/[track]/+page.svelte`.
 *
 * Architectural Guarantees:
 * 1. Full Static Catalog Prerendering:
 *    - Emits static pre-rendered HTML for all 501+ tracks across every band
 *      and album via `entries()`.
 * 2. Complete Track Context & Cross-Catalog Graph:
 *    - Hydrates the track, its parent album, previous/next tracks in album
 *      sequence, alternate/live recordings (`getRelatedSongs`), connected
 *      story playlists, and same-era label releases.
 * 3. Genuine 404 Handling:
 *    - Throws a SvelteKit `404` error when an unknown artist, album, or track
 *      slug is requested.
 * ============================================================================
 */

import { error } from '@sveltejs/kit';
import {
	allAlbums,
	getArtistBySlug,
	getRelatedSongs,
	getSameNarrativeEraAlbums
} from '#lib/data/musicData.js';
import { getConnectedPlaylistsForTrack } from '#lib/playlists.svelte.js';

// Pre-build a standalone static `.html` document for every song in the catalog.
export const prerender = true;

/**
 * Generates static route parameters for every track in the catalog.
 *
 * HOW NESTED `for...of` LOOPS WORK HERE:
 * Because tracks live inside albums (`album.tracks`), we use an outer loop over
 * `allAlbums` and an inner loop over `album.tracks` to flatten the entire
 * two-level hierarchy into one flat array of `{ artist, album, track }` objects.
 *
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	/** @type {Array<{ artist: string, album: string, track: string }>} */
	const list = [];
	for (const album of allAlbums) {
		// `album.tracks || []` safely defaults to an empty array if `tracks` is missing.
		for (const track of album.tracks || []) {
			if (!track.slug) continue;
			list.push({
				artist: album.artistSlug,
				album: album.slug,
				track: track.slug
			});
		}
	}
	return list;
}

/**
 * Loads canonical song, album, artist, sequence navigation, and related works.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	// Step 1: Locate the parent album matching both `params.artist` and `params.album`.
	const album = allAlbums.find((a) => a.artistSlug === params.artist && a.slug === params.album);

	if (!album) {
		throw error(
			404,
			`Album "${params.artist}/${params.album}" not found in The Listening Room catalog.`
		);
	}

	// Step 2: Find the array index (`0`, `1`, `2`, ...) of the requested track inside
	// `album.tracks`. `.findIndex()` returns `-1` if no item matches the condition.
	const trackIndex = album.tracks.findIndex((t) => t.slug === params.track);
	if (trackIndex === -1) {
		throw error(404, `Song "${params.track}" not found on "${album.title}" by ${album.artist}.`);
	}

	// Step 3: Pull out the target track, its artist profile, and the neighboring
	// previous/next tracks on the album (using ternary `condition ? ifTrue : ifFalse`
	// bounds checks so Track 1 has `prevTrack = null` and the final track has `nextTrack = null`).
	const track = album.tracks[trackIndex];
	const artist = getArtistBySlug(album.artistSlug);
	const prevTrack = trackIndex > 0 ? album.tracks[trackIndex - 1] : null;
	const nextTrack = trackIndex < album.tracks.length - 1 ? album.tracks[trackIndex + 1] : null;

	// Step 4: Discover other recordings of this same song across demos, remixes, and live albums.
	const relatedSongs = getRelatedSongs(track, album);

	// Step 5: Check if this song is featured in any curated multi-album Story Playlists.
	const connectedPlaylists = getConnectedPlaylistsForTrack(
		album.artistSlug,
		album.slug,
		track,
		album
	);

	// Step 6: Fetch up to 4 contemporary albums from the same narrative story era.
	const sameEraAlbums = getSameNarrativeEraAlbums(album, allAlbums, 4);

	// Return all loaded entities to `[artist]/[album]/[track]/+page.svelte`.
	return {
		artist,
		album,
		track,
		trackIndex,
		prevTrack,
		nextTrack,
		relatedSongs,
		connectedPlaylists,
		sameEraAlbums
	};
}
