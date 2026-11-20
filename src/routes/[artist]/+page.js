/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/[artist]/+page.js
 * URL SERVED: https://music.raggiesoft.com/[artist]
 *             (e.g., `/the-stardust-engine`, `/the-paper-wall`, `/firelight`)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
 * Notice the square brackets around `[artist]` in the folder name! In SvelteKit,
 * square brackets create a **Dynamic Route Parameter**—think of `[artist]` as a
 * wildcard variable in the URL. Instead of manually creating 7 separate folders
 * for all 7 bands on Engine Room Records, this single `[artist]` folder handles
 * every band's profile page!
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * 1. At build time (`npm run build`), SvelteKit calls `entries()` below to get
 *    a list of every valid `{ artist: '...' }` slug (all 7 bands).
 * 2. For each band, SvelteKit calls `load({ params })`—passing `params.artist`
 *    (such as `"the-stardust-engine"`).
 * 3. `load()` looks up that band's biography, albums, featured tracks, and
 *    fellow labelmates, and returns them inside a plain JavaScript object.
 * 4. SvelteKit automatically hands that returned object to `[artist]/+page.svelte`
 *    via `let { data } = $props()`, which renders the visual artist profile!
 *
 * Architecture & Design Decisions:
 * 1. Hierarchical SEO URLs: Each band lives at the root namespace
 *    `https://music.raggiesoft.com/[artist]`, matching the physical repository
 *    hierarchy and serving as the parent path for `/[artist]/[album]`.
 * 2. Build-Time Static Prerendering: Generates static HTML for all 7 bands in
 *    the catalog via `entries()`, baking unique Open Graph (`og:*`), Twitter
 *    Cards, and Schema.org `MusicGroup` JSON-LD directly into the HTML.
 * ============================================================================
 */

// `error` is SvelteKit's built-in helper for halting page loading with an HTTP
// status code (like 404 Not Found) and rendering `+error.svelte`.
import { error } from '@sveltejs/kit';

// Import the catalog arrays and lookup helpers from our shared data module.
// (`#lib/...` is a clean import alias pointing to `src/lib/...`.)
import {
	allAlbums,
	allArtists,
	getArtistBySlug,
	getFeaturedTracksForArtist,
	getRelatedArtists
} from '#lib/data/musicData.js';

// Enable static HTML generation for every artist slug returned by `entries()`.
export const prerender = true;

/**
 * Generates route entries for all bands in the catalog to be prerendered at build time.
 *
 * HOW `.map()` WORKS HERE:
 * `allArtists` is an array of artist objects. Calling `.map()` transforms each
 * artist object into `{ artist: artist.slug }`—where the key name `artist`
 * MUST match the folder name `[artist]`. SvelteKit loops over the returned
 * array to bake one static HTML file per band.
 *
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	return allArtists.map((artist) => ({
		artist: artist.slug
	}));
}

/**
 * Loads artist biography, metadata, featured tracks, related artists, and complete chronological discography.
 *
 * HOW DESTRUCTURING `{ params }` WORKS:
 * SvelteKit passes a "LoadEvent" object into `load()`. Using `{ params }` in the
 * parameter list extracts just the `params` property from that object. When a
 * user visits `/the-stardust-engine`, `params.artist` equals `"the-stardust-engine"`.
 *
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	// Look up the matching band object from our catalog using the URL slug.
	const artist = getArtistBySlug(params.artist);

	// Guard clause: if someone navigates to a non-existent band URL (e.g., `/unknown-band`),
	// immediately throw a genuine 404 error so `+error.svelte` renders instead of crashing.
	if (!artist) {
		throw error(404, `Artist "${params.artist}" not found in Engine Room Records catalog.`);
	}

	// All releases by this artist sorted chronologically by in-universe temporalCoverage:
	// 1. `.filter(...)` keeps only albums whose `artistSlug` matches this band.
	// 2. `.sort((a, b) => ...)` compares ISO date strings (`YYYY-MM-DD` or `YYYY`)
	//    alphabetically via `.localeCompare()`, placing earliest story eras first
	//    and pushing undated releases (`'9999'` fallback) to the end.
	const artistAlbums = allAlbums
		.filter((a) => a.artistSlug === params.artist)
		.sort((a, b) => {
			const da = a.temporalCoverage || a.year || '9999';
			const db = b.temporalCoverage || b.year || '9999';
			return da.localeCompare(db);
		});

	// Pick up to 8 signature/fan-favorite songs for the "Featured Songs" grid.
	const featuredTracks = getFeaturedTracksForArtist(params.artist, allAlbums, 8);

	// Pick up to 4 fellow Engine Room Records bands for cross-catalog discovery at the bottom.
	const relatedArtists = getRelatedArtists(params.artist, 4);

	// Return all four pieces of data. In `[artist]/+page.svelte`, these arrive as:
	// `data.artist`, `data.artistAlbums`, `data.featuredTracks`, and `data.relatedArtists`.
	return {
		artist,
		artistAlbums,
		featuredTracks,
		relatedArtists
	};
}
