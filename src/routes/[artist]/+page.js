/**
 * @license MIT
 * ============================================================================
 * +page.js (Artist Dedicated Route: /[artist])
 * ============================================================================
 * Prerender configuration and canonical data loader for dedicated artist pages
 * (`/[artist]`) on Engine Room Records (`music.raggiesoft.com/$artist-slug`).
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
import { error } from '@sveltejs/kit';
import { allAlbums, allArtists, getArtistBySlug } from '#lib/data/musicData.js';

export const prerender = true;

/**
 * Generates route entries for all bands in the catalog to be prerendered at build time.
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	return allArtists.map((artist) => ({
		artist: artist.slug
	}));
}

/**
 * Loads artist biography, metadata, and complete chronological discography.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const artist = getArtistBySlug(params.artist);

	if (!artist) {
		throw error(404, `Artist "${params.artist}" not found in Engine Room Records catalog.`);
	}

	// All releases by this artist sorted chronologically by in-universe temporalCoverage
	const artistAlbums = allAlbums
		.filter((a) => a.artistSlug === params.artist)
		.sort((a, b) => {
			const da = a.temporalCoverage || a.year || '9999';
			const db = b.temporalCoverage || b.year || '9999';
			return da.localeCompare(db);
		});

	return {
		artist,
		artistAlbums
	};
}

