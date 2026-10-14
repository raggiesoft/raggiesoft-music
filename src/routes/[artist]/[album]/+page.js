/**
 * @license MIT
 * ============================================================================
 * +page.js (Album Dedicated Route: /[artist]/[album])
 * ============================================================================
 * Prerender configuration and data loader for hierarchical album routes
 * (`/[artist]/[album]`) on Engine Room Records (`music.raggiesoft.com/$artist-slug/$album-slug`).
 *
 * Architecture & Design Decisions:
 * 1. Hierarchical SEO URLs: Each album is nested directly under its band's
 *    canonical slug (`/[artist]/[album]`), matching the physical repository
 *    structure in `raggiesoft-assets/engine-room-records/artists/$artist/$album`.
 * 2. Build-Time Static Prerendering: Generates static HTML for all 30 catalog
 *    albums via `entries()`, baking unique Open Graph (`og:*`), Twitter Cards,
 *    and Schema.org `MusicAlbum` JSON-LD directly into the HTML.
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
		artist: album.artistSlug,
		album: album.slug
	}));
}

/**
 * Loads specific album metadata and related artist releases for the given artist and album slugs.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const album = allAlbums.find(
		(a) => a.artistSlug === params.artist && a.slug === params.album
	);

	if (!album) {
		throw error(
			404,
			`Album "${params.artist}/${params.album}" not found in Engine Room Records catalog.`
		);
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
