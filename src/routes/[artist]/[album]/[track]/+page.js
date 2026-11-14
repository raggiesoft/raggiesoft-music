/**
 * @license MIT
 * ============================================================================
 * src/routes/[artist]/[album]/[track]/+page.js
 * ============================================================================
 * Prerender configuration and canonical data loader for dedicated song routes
 * (`/[artist]/[album]/[track]`) on The Listening Room
 * (`https://music.raggiesoft.com/$artist/$album/$track`).
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

export const prerender = true;

/**
 * Generates static route parameters for every track in the catalog.
 * @type {import('./$types').EntryGenerator}
 */
export function entries() {
	/** @type {Array<{ artist: string, album: string, track: string }>} */
	const list = [];
	for (const album of allAlbums) {
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
	const album = allAlbums.find((a) => a.artistSlug === params.artist && a.slug === params.album);

	if (!album) {
		throw error(
			404,
			`Album "${params.artist}/${params.album}" not found in The Listening Room catalog.`
		);
	}

	const trackIndex = album.tracks.findIndex((t) => t.slug === params.track);
	if (trackIndex === -1) {
		throw error(404, `Song "${params.track}" not found on "${album.title}" by ${album.artist}.`);
	}

	const track = album.tracks[trackIndex];
	const artist = getArtistBySlug(album.artistSlug);
	const prevTrack = trackIndex > 0 ? album.tracks[trackIndex - 1] : null;
	const nextTrack = trackIndex < album.tracks.length - 1 ? album.tracks[trackIndex + 1] : null;
	const relatedSongs = getRelatedSongs(track, album);
	const connectedPlaylists = getConnectedPlaylistsForTrack(
		album.artistSlug,
		album.slug,
		track,
		album
	);
	const sameEraAlbums = getSameNarrativeEraAlbums(album, allAlbums, 4);

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
