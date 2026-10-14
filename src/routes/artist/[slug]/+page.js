/**
 * @license MIT
 * ============================================================================
 * +page.js (Artist Dedicated Route)
 * ============================================================================
 * Prerender configuration and canonical data loader for dedicated artist pages
 * (`/artist/[slug]`) on Engine Room Records (music.raggiesoft.com).
 *
 * Architecture & Design Decisions:
 * 1. Build-Time Static Prerendering: Generates static HTML for all 7 bands in
 *    the catalog via `entries()`, baking unique Open Graph (`og:*`), Twitter
 *    Cards, and Schema.org `MusicGroup` JSON-LD directly into the HTML.
 * 2. SEO-Friendly URLs: Gives each band a clean, permanent, shareable URL
 *    (`https://music.raggiesoft.com/artist/[slug]`) where the Artist Name is
 *    the primary `<h1>` heading.
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
		slug: artist.slug
	}));
}

/**
 * Loads artist biography, metadata, and complete chronological discography.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const artist = getArtistBySlug(params.slug);

	if (!artist) {
		throw error(404, `Artist "${params.slug}" not found in Engine Room Records catalog.`);
	}

	// All releases by this artist sorted chronologically by in-universe temporalCoverage
	const artistAlbums = allAlbums
		.filter((a) => a.artistSlug === params.slug)
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
