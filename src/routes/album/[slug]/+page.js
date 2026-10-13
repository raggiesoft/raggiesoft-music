/**
 * @license MIT
 * ============================================================================
 * +page.js
 * ============================================================================
 * Prerender configuration and data loader for dedicated album routes
 * (/album/[slug]) on Engine Room Records (music.raggiesoft.com).
 *
 * Architecture & Design Decisions:
 * 1. Build-Time Static Prerendering: Generates static HTML for all 28 albums
 *    via `entries()`, baking unique Open Graph (og:*), Twitter Cards, and
 *    Schema.org JSON-LD directly into the HTML for social media crawlers.
 * 2. Instant Routing: Resolves album data from the canonical catalog
 *    (`musicData.js`), enabling zero-latency client navigation and hydration.
 * ============================================================================
 */
import { error } from '@sveltejs/kit';
import { allAlbums } from '#lib/data/musicData.js';

export const prerender = true;

/**
 * Generates route entries for all albums in the catalog to be prerendered at build time.
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	return allAlbums.map((album) => ({
		slug: album.slug
	}));
}

/**
 * Loads specific album metadata and related artist releases for the given slug.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const album = allAlbums.find((a) => a.slug === params.slug);

	if (!album) {
		throw error(404, `Album "${params.slug}" not found in Engine Room Records catalog.`);
	}

	// Related releases by the same artist
	const relatedAlbums = allAlbums.filter(
		(a) => a.artistSlug === album.artistSlug && a.slug !== album.slug
	);

	return {
		album,
		relatedAlbums
	};
}
