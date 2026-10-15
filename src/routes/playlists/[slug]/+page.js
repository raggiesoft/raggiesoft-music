/**
 * @license MIT
 * ============================================================================
 * +page.js (/playlists/[slug])
 * ============================================================================
 * Universal load function and static prerender entry generator for dedicated
 * Official Story Playlist pages (e.g., `/playlists/john-and-erin`).
 * ============================================================================
 */
import { error } from '@sveltejs/kit';
import { curatedPlaylists, getCuratedPlaylistBySlug } from '#lib/playlists.svelte.js';

export const prerender = true;

/**
 * Generates static paths for all curated story playlists at build time.
 */
export function entries() {
	return curatedPlaylists.map((p) => ({ slug: p.slug }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const playlist = getCuratedPlaylistBySlug(params.slug);
	if (!playlist) {
		error(404, {
			message: `Playlist "${params.slug}" was not found in The Listening Room.`
		});
	}

	return {
		playlist
	};
}

