/**
 * @license MIT
 * ============================================================================
 * musicData.js
 * ============================================================================
 * Central catalog and canonical metadata registry for Engine Room Records
 * (music.raggiesoft.com).
 *
 * Architecture & Design Decisions:
 * 1. Data-Driven Architecture: Ingests the unified `musicCatalog.json` generated
 *    directly from `raggiesoft-assets/engine-room-records/artists/` by `build-catalog.js`.
 *    Zero manual copying or hardcoded boilerplate required when adding new albums.
 * 2. Complete Discography: Provides all artists (The Stardust Engine, The Paper Wall,
 *    Fractured Prisms, Mana Canvas, Crimson Node, Firelight, The Winter Palace,
 *    The Arctic Symphony Project) across all eras and genres.
 * 3. High-Fidelity Streaming: Web audio streams are served via high-performance CDN
 *    edge points at `https://assets.raggiesoft.com/` using progressive web MP3s.
 * 4. Rich Lore & Schema: Exposes canonical lore notes, ISRCs, durations, artwork,
 *    and rock opera groupings for reactive Svelte 5 runes consumption.
 * ============================================================================
 */

import rawCatalog from './musicCatalog.json';

/**
 * @typedef {Object} Track
 * @property {string} id
 * @property {number} disc
 * @property {number} track
 * @property {string} title
 * @property {string} duration
 * @property {string} [isrc]
 * @property {string} [legacyTier]
 * @property {string} [loreNote]
 * @property {string} [lyrics]
 * @property {string} audioUrl
 * @property {string} [vttUrl]
 * @property {boolean} [isPlayable]
 */

/**
 * @typedef {Object} Album
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} artist
 * @property {string} artistSlug
 * @property {string} year
 * @property {string} [temporalCoverage]
 * @property {string} [datePublished]
 * @property {string} genre
 * @property {boolean} isRockOpera
 * @property {string} status
 * @property {string} statusLabel
 * @property {number} playableTrackCount
 * @property {number} totalTracksCount
 * @property {string} artwork
 * @property {string} description
 * @property {Track[]} tracks
 */

/**
 * @typedef {Object} ArtistSummary
 * @property {string} slug
 * @property {string} name
 * @property {number} albumCount
 * @property {number} trackCount
 */

/**
 * The complete canonical album catalog for Engine Room Records.
 * @type {Album[]}
 */
export const allAlbums = rawCatalog;

/**
 * Featured albums (all releases in the catalog).
 * Maintained as an alias for backwards compatibility with earlier components.
 * @type {Album[]}
 */
export const featuredAlbums = allAlbums;

/**
 * Dynamically derived list of all unique artists with album and song counts.
 * @type {ArtistSummary[]}
 */
export const allArtists = (() => {
	/** @type {Map<string, { slug: string, name: string, albumCount: number, trackCount: number }>} */
	const artistMap = new Map();

	for (const album of allAlbums) {
		const existing = artistMap.get(album.artistSlug);
		if (existing) {
			existing.albumCount += 1;
			existing.trackCount += album.tracks.length;
		} else {
			artistMap.set(album.artistSlug, {
				slug: album.artistSlug,
				name: album.artist,
				albumCount: 1,
				trackCount: album.tracks.length
			});
		}
	}

	// Sort alphabetically by artist name
	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
})();

/**
 * Aggregated discography statistics for the platform header.
 */
export const catalogStats = {
	totalArtists: allArtists.length,
	totalAlbums: allAlbums.length,
	totalTracks: allAlbums.reduce((acc, curr) => acc + curr.tracks.length, 0),
	playableTracks: allAlbums.reduce((acc, curr) => acc + (curr.playableTrackCount || 0), 0)
};

/**
 * Transforms an album's track list into formatted player queue items.
 * Only includes playable tracks with valid audio streams.
 * Maps album-level metadata down to every individual track object.
 *
 * @param {Album} album
 * @returns {Array<Track & { album: string; artist: string; artwork: string; year: string }>}
 */
export function formatAlbumQueue(album) {
	return album.tracks
		.filter((t) => t.isPlayable && t.audioUrl)
		.map((t) => ({
			...t,
			album: album.title,
			artist: album.artist,
			artwork: album.artwork,
			year: album.year
		}));
}
