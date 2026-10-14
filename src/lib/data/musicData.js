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
 * 3. Canonical Artist Lore & Metadata: Enriches dynamically derived artist entries
 *    with in-universe biographies, primary genres, years active, and default OpenGraph
 *    social preview images for dedicated `/artist/[slug]` routes.
 * 4. High-Fidelity Streaming: Web audio streams are served via high-performance CDN
 *    edge points at `https://assets.raggiesoft.com/` using progressive web MP3s.
 * 5. Rich Lore & Schema: Exposes canonical lore notes, ISRCs, durations, artwork,
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
 * @property {string} [albumType]
 * @property {string} [albumTypeLabel]
 * @property {string | null} [artistLogo]
 * @property {string} status
 * @property {string} statusLabel
 * @property {number} playableTrackCount
 * @property {number} totalTracksCount
 * @property {string} artwork
 * @property {string} socialPreview
 * @property {string} description
 * @property {Track[]} tracks
 */

/**
 * @typedef {Object} ArtistSummary
 * @property {string} slug
 * @property {string} name
 * @property {string|null} [logo]
 * @property {number} albumCount
 * @property {number} trackCount
 * @property {number} playableTrackCount
 * @property {string} description
 * @property {string[]} genres
 * @property {string} yearsActive
 * @property {string} socialPreview
 */

/**
 * Canonical definitions for grouping album releases by production category.
 * Used across `/discography`, `/artist/[slug]`, and search filter drawers.
 */
export const albumTypeDefinitions = [
	{
		id: 'studio',
		title: 'Studio Albums',
		icon: '🎙️',
		badgeClass: 'border-blue-700/50 bg-blue-950/80 text-blue-300',
		description: 'Original studio concept albums, rock operas, and narrative audio journeys.'
	},
	{
		id: 'live',
		title: 'Live Concert Recordings',
		icon: '⚡',
		badgeClass: 'border-rose-600/50 bg-rose-950/80 text-rose-300',
		description: 'High-energy live performances captured in concert arenas and legendary venues.'
	},
	{
		id: 'compilation',
		title: 'Compilations & Anthologies',
		icon: '💿',
		badgeClass: 'border-purple-600/50 bg-purple-950/80 text-purple-300',
		description: 'Curated war chests, greatest hits collections, and archival anthologies.'
	},
	{
		id: 'soundtrack',
		title: 'Soundtracks & Cinematic Scores',
		icon: '🎬',
		badgeClass: 'border-teal-600/50 bg-teal-950/80 text-teal-300',
		description: 'Original motion picture and video game soundtracks produced across the label.'
	}
];

/**
 * Canonical lore biographies and metadata for each band on the Engine Room Records roster.
 * @type {Record<string, { description: string, genres: string[], yearsActive: string, flagshipAlbumSlug?: string }>}
 */
export const artistLoreMetadata = {
	'the-stardust-engine': {
		description:
			'Founded by siblings Ryan, Cassidy, and Holly O’Connell alongside twin cousins Evan and Tyler Wright, The Stardust Engine evolved from early-1990s Blacksburg synth-rock into one of independent music’s most resilient acts—reclaiming their masters, pioneering accessible touring infrastructure, and documenting four decades of family, survival, and triumph.',
		genres: ['Synth-Rock', 'Alternative Rock', 'Indie Arena Rock', '80s Revival'],
		yearsActive: '1985–Present',
		flagshipAlbumSlug: '2007-lost-sounds'
	},
	'the-paper-wall': {
		description:
			'Known across the Engine Room roster as "The Literary Rock Storytellers," The Paper Wall crafts sprawling multi-act concept rock operas like an author writes anthology novels. Each album explores a distinct human narrative—from post-punk London solidarity to childhood sanctuary and the quiet courage of growing up.',
		genres: ['Concept Rock Opera', 'Progressive Rock', 'Post-Punk', 'Theatrical Rock'],
		yearsActive: '1983–Present',
		flagshipAlbumSlug: '2001-static-and-silence-book-1'
	},
	'mana-canvas': {
		description:
			'Blending authentic 16-bit Super Famicom / SNES JRPG chiptune synthesis with sweeping live symphonic rock and progressive metal, Mana Canvas bridges the worlds of classic fantasy video game soundtracks and high-voltage arena concerts.',
		genres: ['16-Bit Symphonic Prog', 'JRPG Soundtrack', 'Fantasy Rock Opera'],
		yearsActive: '1992–Present',
		flagshipAlbumSlug: '1992-dream-kingdom-ost'
	},
	'fractured-prisms': {
		description:
			'Masters of atmospheric progressive rock and geometric sonic architecture, Fractured Prisms weaves intricate odd-time polyrhythms, analog synthesizers, and soaring vocal harmonies into deeply introspective concept albums.',
		genres: ['Progressive Rock', 'Art Rock', 'Atmospheric Synth-Prog'],
		yearsActive: '1994–Present',
		flagshipAlbumSlug: '1996-julians-beacon'
	},
	'crimson-node': {
		description:
			'Operating at the intersection of cyberpunk electronics, industrial synth-prog, and high-gain rock, Crimson Node explores themes of digital consciousness, network sovereignty, and human connection inside automated systems.',
		genres: ['Cyber-Prog', 'Electronic Rock', 'Synthwave', 'Industrial Rock'],
		yearsActive: '1998–Present'
	},
	firelight: {
		description:
			'Rooted in warm acoustic storytelling, heartland rock, and rich vocal harmonies, Firelight captures the intimate, glowing moments of community, memory, and resilience around the hearth.',
		genres: ['Heartland Rock', 'Acoustic Folk-Rock', 'Americana'],
		yearsActive: '1995–Present'
	},
	'the-arctic-symphony-project': {
		description:
			'A grand holiday symphonic-rock ensemble uniting driving electric guitars, thundering rock drums, solo cello, and a full classical orchestra and choir. Their music serves as a warm, theatrical beacon through the deepest winter nights.',
		genres: ['Holiday Symphonic Rock', 'Theatrical Rock Opera', 'Orchestral Rock'],
		yearsActive: '1996–Present',
		flagshipAlbumSlug: '2007-tales-from-the-solstice'
	}
};

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
 * Dynamically derived list of all unique artists with album counts, song counts,
 * canonical bios, genres, active years, and social preview artwork.
 * @type {ArtistSummary[]}
 */
export const allArtists = (() => {
	/** @type {Map<string, ArtistSummary>} */
	const artistMap = new Map();

	for (const album of allAlbums) {
		const existing = artistMap.get(album.artistSlug);
		if (existing) {
			existing.albumCount += 1;
			existing.trackCount += album.tracks.length;
			existing.playableTrackCount += album.playableTrackCount || 0;
			if (!existing.logo && album.artistLogo) {
				existing.logo = album.artistLogo;
			}
			// Prefer flagship album social preview if configured
			const lore = artistLoreMetadata[album.artistSlug];
			if (lore?.flagshipAlbumSlug === album.slug && album.socialPreview) {
				existing.socialPreview = album.socialPreview;
			}
		} else {
			const lore = artistLoreMetadata[album.artistSlug];
			artistMap.set(album.artistSlug, {
				slug: album.artistSlug,
				name: album.artist,
				logo: album.artistLogo || null,
				albumCount: 1,
				trackCount: album.tracks.length,
				playableTrackCount: album.playableTrackCount || 0,
				description:
					lore?.description ||
					`Official discography, studio recordings, and narrative lore for ${album.artist} on Engine Room Records.`,
				genres: lore?.genres || [album.genre],
				yearsActive: lore?.yearsActive || `${album.year}–Present`,
				socialPreview: album.socialPreview || 'https://music.raggiesoft.com/og-image.jpg'
			});
		}
	}

	// Sort alphabetically by artist name
	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
})();

/**
 * Helper to look up a canonical artist summary by slug from a catalog array.
 * @param {string} slug
 * @param {Album[]} [catalog]
 * @returns {ArtistSummary | undefined}
 */
export function getArtistBySlug(slug, catalog = allAlbums) {
	const artistAlbums = catalog.filter((a) => a.artistSlug === slug);
	if (artistAlbums.length === 0) return undefined;
	const first = artistAlbums[0];
	const lore = artistLoreMetadata[slug];
	const flagship = artistAlbums.find((a) => a.slug === lore?.flagshipAlbumSlug) || first;

	return {
		slug,
		name: first.artist,
		logo: first.artistLogo || null,
		albumCount: artistAlbums.length,
		trackCount: artistAlbums.reduce((acc, a) => acc + a.tracks.length, 0),
		playableTrackCount: artistAlbums.reduce((acc, a) => acc + (a.playableTrackCount || 0), 0),
		description:
			lore?.description ||
			`Official discography, studio recordings, and narrative lore for ${first.artist} on Engine Room Records.`,
		genres: lore?.genres || Array.from(new Set(artistAlbums.map((a) => a.genre))),
		yearsActive: lore?.yearsActive || `${first.year}–Present`,
		socialPreview: flagship.socialPreview || 'https://music.raggiesoft.com/og-image.jpg'
	};
}

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
 * @returns {Array<Track & { album: string; albumSlug: string; artist: string; artistSlug: string; artistLogo: string | null; artwork: string; socialPreview: string; year: string; temporalCoverage?: string }>}
 */
export function formatAlbumQueue(album) {
	return album.tracks
		.filter((t) => t.isPlayable && t.audioUrl)
		.map((t) => ({
			...t,
			album: album.title,
			albumSlug: album.slug,
			artist: album.artist,
			artistSlug: album.artistSlug,
			artistLogo: album.artistLogo || null,
			artwork: album.artwork,
			socialPreview: album.socialPreview,
			year: album.year,
			temporalCoverage: album.temporalCoverage
		}));
}
