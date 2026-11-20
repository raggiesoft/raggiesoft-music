/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/[artist]/[album]/+page.js
 * URL SERVED: https://music.raggiesoft.com/[artist]/[album]
 *             (e.g., `/the-stardust-engine/1987-electric-horizon`)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
 * Because this `+page.js` sits inside TWO nested dynamic folders—`[artist]` and
 * `[album]`—SvelteKit captures TWO URL segments at the same time!
 * For example, when someone opens:
 *   `https://music.raggiesoft.com/the-paper-wall/2001-static-and-silence-book-1`
 * SvelteKit sets:
 *   - `params.artist` = `"the-paper-wall"`
 *   - `params.album`  = `"2001-static-and-silence-book-1"`
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `entries()` lists every `{ artist, album }` pair across the entire catalog
 *   so SvelteKit pre-builds a dedicated static HTML page for every release.
 * - `load({ params })` finds the requested album, computes neighboring albums
 *   in the band's timeline, finds connected story playlists, and passes that
 *   bundle as `data` into `[artist]/[album]/+page.svelte`.
 *
 * Architecture & Design Decisions:
 * 1. Hierarchical SEO URLs: Each album is nested directly under its band's
 *    canonical slug (`/[artist]/[album]`), matching the physical repository
 *    structure in `raggiesoft-assets/engine-room-records/artists/$artist/$album`.
 * 2. Build-Time Static Prerendering: Generates static HTML for all catalog
 *    albums via `entries()`, baking unique Open Graph (`og:*`), Twitter Cards,
 *    and Schema.org `MusicAlbum` JSON-LD directly into the HTML.
 * ============================================================================
 */

import { error } from '@sveltejs/kit';
import {
	allAlbums,
	getAdjacentArtistReleases,
	getRelatedArtists,
	getSameNarrativeEraAlbums
} from '#lib/data/musicData.js';
import { getConnectedPlaylistsForAlbum } from '#lib/playlists.svelte.js';

// Pre-generate static HTML files for every album during `npm run build`.
export const prerender = true;

/**
 * Generates route entries for all albums in the catalog to be prerendered at build time.
 * Notice each returned object has BOTH `artist` and `album` keys, matching the
 * two dynamic folder segments `[artist]` and `[album]`.
 *
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	return allAlbums.map((album) => ({
		artist: album.artistSlug,
		album: album.slug
	}));
}

/**
 * Loads specific album metadata, chronological artist neighbors, same-era narrative albums,
 * connected story playlists, and related Engine Room Records artists.
 *
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	// `.find()` scans `allAlbums` and returns the first album where BOTH the band
	// slug and the album slug match the URL—preventing one band's album from
	// accidentally resolving under a different band's URL!
	const album = allAlbums.find((a) => a.artistSlug === params.artist && a.slug === params.album);

	// If no matching album exists in our catalog, trigger a 404 Not Found boundary.
	if (!album) {
		throw error(
			404,
			`Album "${params.artist}/${params.album}" not found in Engine Room Records catalog.`
		);
	}

	// Related releases by the same artist (excluding the album currently being viewed).
	const relatedAlbums = allAlbums.filter(
		(a) => a.artistSlug === album.artistSlug && a.slug !== album.slug
	);

	// Immediate `previous` and `next` releases in this band's chronological discography
	// (used for the "Earlier Release / Next Release" navigation cards).
	const adjacentReleases = getAdjacentArtistReleases(album);

	// Up to 4 albums by fellow label artists set in a nearby in-universe story year.
	const sameEraAlbums = getSameNarrativeEraAlbums(album, 4);

	// Official curated story playlists that feature one or more tracks from this album.
	const connectedPlaylists = getConnectedPlaylistsForAlbum(album.artistSlug, album.slug);

	// Up to 4 other Engine Room Records bands for the bottom discovery shelf.
	const relatedArtists = getRelatedArtists(album.artistSlug, 4);

	// Hand everything to `[artist]/[album]/+page.svelte` via `let { data } = $props()`.
	return {
		album,
		relatedAlbums,
		adjacentReleases,
		sameEraAlbums,
		connectedPlaylists,
		relatedArtists
	};
}
