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
import {
	allAlbums,
	getAdjacentArtistReleases,
	getRelatedArtists,
	getSameNarrativeEraAlbums
} from '#lib/data/musicData.js';
import { getConnectedPlaylistsForAlbum } from '#lib/playlists.svelte.js';

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
 * Loads specific album metadata, chronological artist neighbors, same-era narrative albums,
 * connected story playlists, and related Engine Room Records artists.
 * @type {import('./$types').PageLoad}
 */
export function load({ params }) {
	const album = allAlbums.find((a) => a.artistSlug === params.artist && a.slug === params.album);

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
	const adjacentReleases = getAdjacentArtistReleases(album);
	const sameEraAlbums = getSameNarrativeEraAlbums(album, 4);
	const connectedPlaylists = getConnectedPlaylistsForAlbum(album.artistSlug, album.slug);
	const relatedArtists = getRelatedArtists(album.artistSlug, 4);

	return {
		album,
		relatedAlbums,
		adjacentReleases,
		sameEraAlbums,
		connectedPlaylists,
		relatedArtists
	};
}
