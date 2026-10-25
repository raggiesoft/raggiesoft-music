/**
 * @license MIT
 * ============================================================================
 * musicData.js
 * ============================================================================
 * Central catalog and canonical metadata registry for The Listening Room
 * by Engine Room Records (music.raggiesoft.com).
 *
 * Architecture & Design Decisions:
 * 1. Data-Driven Architecture: Ingests the unified `musicCatalog.json` generated
 *    directly from `raggiesoft-assets/engine-room-records/artists/` by `build-catalog.js`.
 *    Zero manual copying or hardcoded boilerplate required when adding new albums.
 * 2. Discovery Hub & DSP Routing: Propagates album-level and artist-level DSP
 *    identifiers (`spotifyId`, `appleId`, `amazonId`, `youtubeId`), Fourthwall
 *    direct-to-fan digital storefront links (`storeStandardUrl` for V0 MP3/OGG,
 *    `storeAudiophileUrl` for Studio Master WAV/FLAC), and `dspExempt` flags.
 * 3. Canonical Artist Lore & Metadata: Enriches dynamically derived artist entries
 *    with in-universe biographies, primary genres, years active, and dedicated 16:9
 *    OpenGraph social preview images (`social-preview.jpg`) for `/[artist]` routes.
 * 4. 128kbps Reference Preview Streaming: Web audio streams are served via CDN
 *    edge points at `https://assets.raggiesoft.com/` using 128kbps web MP3s for
 *    free discovery alongside synchronized WebVTT lyrics and track lore notes.
 * ============================================================================
 */

import rawCatalog from './musicCatalog.json';

/**
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} [fileName]
 * @property {number} disc
 * @property {string} [discName]
 * @property {number} track
 * @property {string} title
 * @property {string} [version]
 * @property {string} duration
 * @property {string} [isrc]
 * @property {string} [legacyTier]
 * @property {string} [stylePrompt]
 * @property {string} [loreNote]
 * @property {string} [lyrics]
 * @property {string} audioUrl
 * @property {string} [vttUrl]
 * @property {boolean} [vttVerified]
 * @property {boolean} [isPlayable]
 */

/**
 * @typedef {Object} Album
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} artist
 * @property {string} artistSlug
 * @property {string | null} [artistLogo]
 * @property {string | null} [artistSocialPreview]
 * @property {string} [artistLoreUrl]
 * @property {string} [loreUrl]
 * @property {string} year
 * @property {string} [temporalCoverage]
 * @property {string} [datePublished]
 * @property {string} [upc]
 * @property {string} genre
 * @property {boolean} isRockOpera
 * @property {string} [rockOperaSetId]
 * @property {string} [albumType]
 * @property {string} [albumTypeLabel]
 * @property {string} status
 * @property {string} statusLabel
 * @property {number} playableTrackCount
 * @property {number} totalTracksCount
 * @property {string} artwork
 * @property {string} socialPreview
 * @property {string} description
 * @property {string[]} [linerNotes]
 * @property {Array<{ title: string, icon?: string, variant?: string, content: string, link?: { label: string, url: string } }>} [studioArchives]
 * @property {{ title?: string, venue?: string, paragraphs?: string[], quote?: string, attribution?: string } | null} [liveTranscript]
 * @property {Array<{ label: string, url: string, description?: string }>} [loreLinks]
 * @property {string} [spotifyId]
 * @property {string} [appleId]
 * @property {string} [amazonId]
 * @property {string} [youtubeId]
 * @property {string} [storeStandardUrl]
 * @property {string} [storeAudiophileUrl]
 * @property {string} [freeArchiveUrl]
 * @property {boolean} [dspExempt]
 * @property {string} [dspNotice]
 * @property {Track[]} tracks
 */

/**
 * @typedef {Object} ArtistSummary
 * @property {string} slug
 * @property {string} name
 * @property {string|null} [logo]
 * @property {string} [loreUrl]
 * @property {number} albumCount
 * @property {number} trackCount
 * @property {number} playableTrackCount
 * @property {string} description
 * @property {string[]} genres
 * @property {string} yearsActive
 * @property {string} socialPreview
 * @property {string} [spotifyId]
 * @property {string} [appleId]
 * @property {string} [amazonId]
 * @property {string} [youtubeId]
 * @property {string} [storefrontUrl]
 * @property {'artist' | 'album'} [dspTargetType]
 */

/**
 * Canonical definitions for grouping album releases by production category.
 * Used across `/discography`, `/[artist]`, and search filter drawers.
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
 * Canonical lore biographies, DSP artist identifiers, and storefront links
 * for each band on the Engine Room Records roster.
 * @type {Record<string, { description: string, genres: string[], yearsActive: string, flagshipAlbumSlug?: string, socialPreview?: string, spotifyId?: string, appleId?: string, amazonId?: string, youtubeId?: string, storefrontUrl?: string }>}
 */
export const artistLoreMetadata = {
	'the-stardust-engine': {
		description:
			'Founded by siblings Ryan, Cassidy, and Holly O’Connell alongside twin cousins Evan and Tyler Wright, The Stardust Engine evolved from early-1980s Blacksburg synth-rock into one of independent music’s most resilient acts—reclaiming their masters, pioneering accessible touring infrastructure, and documenting four decades of family, survival, and triumph.',
		genres: ['Synth-Rock', 'Alternative Rock', 'Indie Arena Rock', '80s Revival'],
		yearsActive: '1985–Present',
		flagshipAlbumSlug: '2007-lost-sounds',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/social-preview.jpg',
		spotifyId: '7Lr6o5qOo1OgVQGumUjFFT',
		appleId: '1889194363',
		amazonId: 'B0GVGL5RS7',
		youtubeId: 'UCqtJNbYErxJ7ivveQXVS2mg',
		storefrontUrl: 'https://store.raggiesoft.com/pages/the-stardust-engine'
	},
	'the-paper-wall': {
		description:
			'Known across the Engine Room roster as "The Literary Rock Storytellers," The Paper Wall crafts sprawling multi-act concept rock operas like an author writes anthology novels. Each album explores a distinct human narrative—from post-punk London solidarity to childhood sanctuary and the quiet courage of growing up.',
		genres: ['Concept Rock Opera', 'Progressive Rock', 'Post-Punk', 'Theatrical Rock'],
		yearsActive: '1983–Present',
		flagshipAlbumSlug: '2001-static-and-silence-book-1',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/social-preview.jpg',
		storefrontUrl: 'https://store.raggiesoft.com'
	},
	'mana-canvas': {
		description:
			'Blending authentic 16-bit Super Famicom / SNES JRPG chiptune synthesis with sweeping live symphonic rock and progressive metal, Mana Canvas bridges the worlds of classic fantasy video game soundtracks and high-voltage arena concerts.',
		genres: ['16-Bit Symphonic Prog', 'JRPG Soundtrack', 'Fantasy Rock Opera'],
		yearsActive: '1992–Present',
		flagshipAlbumSlug: '1992-runebreaker-ost',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/social-preview.jpg'
	},
	'fractured-prisms': {
		description:
			'Masters of atmospheric progressive rock and geometric sonic architecture, Fractured Prisms weaves intricate odd-time polyrhythms, analog synthesizers, and soaring vocal harmonies into deeply introspective concept albums.',
		genres: ['Progressive Rock', 'Art Rock', 'Atmospheric Synth-Prog'],
		yearsActive: '1983–Present',
		flagshipAlbumSlug: '1983-carnaby-street',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/social-preview.jpg',
		storefrontUrl: 'https://store.raggiesoft.com'
	},
	'crimson-node': {
		description:
			'Operating at the intersection of cyberpunk electronics, industrial synth-prog, and high-gain stadium rock, Crimson Node translates the rigid safety protocols and camaraderie of the Albemarle County compound into explosive arena anthems.',
		genres: ['Cyber-Prog', 'Electronic Rock', 'Synthwave', 'Arena Rock'],
		yearsActive: '2000–Present',
		flagshipAlbumSlug: '2002-crimson-node',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/crimson-node/social-preview.jpg',
		storefrontUrl: 'https://store.raggiesoft.com'
	},
	firelight: {
		description:
			'The official 1980s motion picture soundtrack ensemble behind The Silver Gauntlet of Aethel—Michael P. Ragsdale\'s love letter to 1980s fantasy-adventure cinema. Anchored by its flagship main theme "A Sister\'s Love" (heavily inspired by Limahl\'s NeverEnding Story theme song), Firelight fuses shimmering 1980s synth-pop arpeggios and soaring melodic hooks with widescreen fantasy orchestration.',
		genres: ['80s Movie Soundtracks', '80s Synth-Pop', 'Fantasy-Adventure Score', 'Orchestral Rock'],
		yearsActive: '1987–Present',
		flagshipAlbumSlug: '2017-silver-gauntlet-of-aethel-book-i',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/firelight/1987-silver-gauntlet-of-aethel/social-preview.jpg'
	},
	'the-arctic-symphony-project': {
		description:
			'A grand holiday symphonic-rock ensemble uniting driving electric guitars, thundering rock drums, solo cello, and a full classical orchestra and choir. Their music serves as a warm, theatrical beacon through the deepest winter nights.',
		genres: ['Holiday Symphonic Rock', 'Theatrical Rock Opera', 'Orchestral Rock'],
		yearsActive: '1996–Present',
		flagshipAlbumSlug: '2007-tales-from-the-solstice',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-arctic-symphony-project/social-preview.jpg'
	}
};

/**
 * Checks whether an Album, ArtistSummary, or queued Track item has at least one active DSP link
 * and is not exempt from DSP distribution.
 *
 * @param {Partial<Album & ArtistSummary> | null | undefined} item
 * @returns {boolean}
 */
export function hasAnyDsp(item) {
	if (!item) return false;
	if ('dspExempt' in item && item.dspExempt) return false;
	return Boolean(
		(item.spotifyId && item.spotifyId.trim()) ||
			(item.appleId && item.appleId.trim()) ||
			(item.amazonId && item.amazonId.trim()) ||
			(item.youtubeId && item.youtubeId.trim())
	);
}

/**
 * Checks whether an Album or queued Track item has direct-to-fan Fourthwall digital archive links
 * (`storeStandardUrl` for High-Quality MP3/OGG or `storeAudiophileUrl` for Premium WAV/FLAC).
 *
 * @param {Partial<Album> | null | undefined} item
 * @returns {boolean}
 */
export function hasFourthwallStore(item) {
	if (!item) return false;
	return Boolean(
		(item.storeStandardUrl && item.storeStandardUrl.trim()) ||
			(item.storeAudiophileUrl && item.storeAudiophileUrl.trim())
	);
}

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
 * canonical bios, genres, active years, DSP links, and 16:9 social preview artwork.
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
			if (!existing.loreUrl && album.artistLoreUrl) {
				existing.loreUrl = album.artistLoreUrl;
			}
			if (album.artistSocialPreview) {
				existing.socialPreview = album.artistSocialPreview;
			}
			// If artist doesn't have direct artist-level DSP IDs yet, inherit from their first DSP-active album
			if (!hasAnyDsp(existing) && hasAnyDsp(album)) {
				existing.spotifyId = album.spotifyId || '';
				existing.appleId = album.appleId || '';
				existing.amazonId = album.amazonId || '';
				existing.youtubeId = album.youtubeId || '';
				existing.dspTargetType = 'album';
			}
		} else {
			const lore = artistLoreMetadata[album.artistSlug];
			const hasArtistLevelDsp = Boolean(
				lore?.spotifyId || lore?.appleId || lore?.amazonId || lore?.youtubeId
			);
			const fallbackAlbumDsp = !hasArtistLevelDsp && hasAnyDsp(album);

			artistMap.set(album.artistSlug, {
				slug: album.artistSlug,
				name: album.artist,
				logo: album.artistLogo || null,
				loreUrl: album.artistLoreUrl || '',
				albumCount: 1,
				trackCount: album.tracks.length,
				playableTrackCount: album.playableTrackCount || 0,
				description:
					lore?.description ||
					`Official discography, studio recordings, and narrative lore for ${album.artist} on Engine Room Records.`,
				genres: lore?.genres || [album.genre],
				yearsActive: lore?.yearsActive || `${album.year}–Present`,
				socialPreview:
					album.artistSocialPreview ||
					lore?.socialPreview ||
					album.socialPreview ||
					'https://music.raggiesoft.com/og-image.jpg',
				spotifyId: hasArtistLevelDsp ? lore?.spotifyId || '' : fallbackAlbumDsp ? album.spotifyId || '' : '',
				appleId: hasArtistLevelDsp ? lore?.appleId || '' : fallbackAlbumDsp ? album.appleId || '' : '',
				amazonId: hasArtistLevelDsp ? lore?.amazonId || '' : fallbackAlbumDsp ? album.amazonId || '' : '',
				youtubeId: hasArtistLevelDsp ? lore?.youtubeId || '' : fallbackAlbumDsp ? album.youtubeId || '' : '',
				storefrontUrl: lore?.storefrontUrl || '',
				dspTargetType: hasArtistLevelDsp ? 'artist' : 'album'
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

	const hasArtistLevelDsp = Boolean(
		lore?.spotifyId || lore?.appleId || lore?.amazonId || lore?.youtubeId
	);
	const firstDspAlbum = artistAlbums.find((a) => hasAnyDsp(a));

	return {
		slug,
		name: first.artist,
		logo: first.artistLogo || null,
		loreUrl: first.artistLoreUrl || '',
		albumCount: artistAlbums.length,
		trackCount: artistAlbums.reduce((acc, a) => acc + a.tracks.length, 0),
		playableTrackCount: artistAlbums.reduce((acc, a) => acc + (a.playableTrackCount || 0), 0),
		description:
			lore?.description ||
			`Official discography, studio recordings, and narrative lore for ${first.artist} on Engine Room Records.`,
		genres: lore?.genres || Array.from(new Set(artistAlbums.map((a) => a.genre))),
		yearsActive: lore?.yearsActive || `${first.year}–Present`,
		socialPreview:
			first.artistSocialPreview ||
			lore?.socialPreview ||
			flagship.socialPreview ||
			'https://music.raggiesoft.com/og-image.jpg',
		spotifyId: hasArtistLevelDsp ? lore?.spotifyId || '' : firstDspAlbum?.spotifyId || '',
		appleId: hasArtistLevelDsp ? lore?.appleId || '' : firstDspAlbum?.appleId || '',
		amazonId: hasArtistLevelDsp ? lore?.amazonId || '' : firstDspAlbum?.amazonId || '',
		youtubeId: hasArtistLevelDsp ? lore?.youtubeId || '' : firstDspAlbum?.youtubeId || '',
		storefrontUrl: lore?.storefrontUrl || '',
		dspTargetType: hasArtistLevelDsp ? 'artist' : 'album'
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
 * Maps album-level metadata (including DSP and Fourthwall URLs) down to every individual track object.
 *
 * @param {Album} album
 * @returns {Array<Track & { album: string; albumSlug: string; artist: string; artistSlug: string; artistLogo: string | null; artistLoreUrl?: string; loreUrl?: string; artwork: string; socialPreview: string; year: string; temporalCoverage?: string; spotifyId?: string; appleId?: string; amazonId?: string; youtubeId?: string; storeStandardUrl?: string; storeAudiophileUrl?: string; dspExempt?: boolean; dspNotice?: string }>}
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
			artistLoreUrl: album.artistLoreUrl || '',
			loreUrl: album.loreUrl || '',
			artwork: album.artwork,
			socialPreview: album.socialPreview,
			year: album.year,
			temporalCoverage: album.temporalCoverage,
			spotifyId: album.spotifyId || '',
			appleId: album.appleId || '',
			amazonId: album.amazonId || '',
			youtubeId: album.youtubeId || '',
			storeStandardUrl: album.storeStandardUrl || '',
			storeAudiophileUrl: album.storeAudiophileUrl || '',
			dspExempt: Boolean(album.dspExempt),
			dspNotice: album.dspNotice || '',
			isRockOpera: Boolean(album.isRockOpera),
			rockOperaSetId: album.rockOperaSetId || ''
		}));
}

/**
 * Friendly display titles for multi-album Rock Opera Series (`rockOperaSetId`).
 * Ensures listeners see the overarching narrative arc when a Rock Opera Series
 * block is queued on Engine Room Radio.
 * @type {Record<string, string>}
 */
export const rockOperaSeriesTitles = {
	'static-and-silence': 'Static & Silence Saga (Guiding Stars → Book 1 → Book 2)',
	'eleventh-child': 'The Eleventh Child Saga (Book 1: System.Crash → Book 2: System.Restore)',
	'silver-gauntlet-of-aethel': 'The Silver Gauntlet of Aethel Trilogy (Books I–III)'
};

/**
 * Parses a human-readable track duration string (`"mm:ss"` or `"hh:mm:ss"`) into integer seconds.
 * Returns 0 if the duration is unparsed or `"In Studio"`.
 *
 * @param {string | undefined | null} durationStr
 * @returns {number}
 */
export function parseDurationToSeconds(durationStr) {
	if (!durationStr || typeof durationStr !== 'string') return 0;
	const parts = durationStr
		.trim()
		.split(':')
		.map((n) => parseInt(n, 10));
	if (parts.some((n) => isNaN(n))) return 0;
	if (parts.length === 2) {
		return parts[0] * 60 + parts[1];
	}
	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	}
	return 0;
}

/**
 * Builds a Rock-Opera and Rock-Opera-Series-aware shuffled radio broadcast queue
 * across the entire Engine Room Records catalog.
 *
 * Architectural Guarantees (Ported & Enhanced from `raggiesoft-hub/pages/engine-room/radio.php`):
 * 1. ISRC Deduplication:
 *    - Every recording is deduplicated by its canonical ISRC code (`isrc.trim().toUpperCase()`).
 *    - Studio albums and Rock Operas are prioritized before compilation albums (`albumType === 'compilation'`)
 *      so original album context and artwork take precedence.
 * 2. Multi-Album Rock Opera Series Preservation (`rockOperaSetId`):
 *    - Albums sharing a `rockOperaSetId` (e.g., The Paper Wall's `static-and-silence` series:
 *      `2000-guiding-stars` -> `2001-static-and-silence-book-1` -> `2001-static-and-silence-book-2`,
 *      or `eleventh-child`: `Book 1` -> `Book 2`) are glued together in strict chronological
 *      and track sequence into a single unbreakable broadcast block.
 * 3. Single-Album Rock Opera Preservation (`isRockOpera === true`):
 *    - Standalone Rock Operas keep all of their tracks glued together in exact album sequence
 *      as a single unbreakable broadcast block.
 * 4. Fisher-Yates Block Shuffle:
 *    - Standard album tracks (1-track blocks), single-album Rock Opera blocks, and multi-album
 *      Rock Opera Series blocks are shuffled at the block level and flattened into a continuous
 *      playback queue.
 *
 * @param {Album[]} [catalog=allAlbums]
 * @returns {{
 *   tracks: Array<any>,
 *   operaBlocks: Array<{ id: string, title: string, artist: string, type: 'series' | 'opera', albums: string[], trackCount: number, durationSeconds: number }>,
 *   stats: {
 *     totalTracks: number,
 *     totalDurationSeconds: number,
 *     days: number,
 *     hours: number,
 *     minutes: number,
 *     realityCheck: string
 *   }
 * }}
 */
export function buildRadioBroadcast(catalog = allAlbums) {
	/** @type {Set<string>} */
	const seenIsrcs = new Set();

	/**
	 * Sort albums for ingestion so that:
	 * 1. Rock Operas come first (in chronological order by `temporalCoverage || year`, then `slug`),
	 *    ensuring multi-album series (`Guiding Stars` -> `Book 1` -> `Book 2`) are assembled in exact narrative order.
	 * 2. Standard Studio / Live / Soundtrack albums come second.
	 * 3. Compilations (`albumType === 'compilation'`) come last so original studio masters win ISRC deduplication.
	 */
	const orderedAlbums = [...catalog].sort((a, b) => {
		const rankA = a.isRockOpera ? 0 : a.albumType === 'compilation' ? 2 : 1;
		const rankB = b.isRockOpera ? 0 : b.albumType === 'compilation' ? 2 : 1;
		if (rankA !== rankB) return rankA - rankB;

		const dateA = a.temporalCoverage || a.year || '9999';
		const dateB = b.temporalCoverage || b.year || '9999';
		if (dateA !== dateB) return dateA.localeCompare(dateB);
		return a.slug.localeCompare(b.slug);
	});

	/**
	 * Map of Rock Opera / Rock Opera Series blocks keyed by `series:<setId>` or `opera:<albumId>`.
	 * @type {Map<string, { id: string, title: string, artist: string, type: 'series' | 'opera', albums: string[], tracks: Array<any>, durationSeconds: number }>}
	 */
	const operaBlockMap = new Map();

	/**
	 * Top-level shuffleable blocks (each entry is an array of 1 or more tracks).
	 * @type {Array<{ blockType: 'series' | 'opera' | 'single', blockTitle: string, tracks: Array<any> }>}
	 */
	const shuffleableBlocks = [];

	let totalDurationSeconds = 0;

	for (const album of orderedAlbums) {
		const playableQueue = formatAlbumQueue(album);
		if (playableQueue.length === 0) continue;

		// Filter out tracks whose ISRC has already been included in the broadcast
		const uniqueAlbumTracks = [];
		for (const track of playableQueue) {
			const cleanIsrc = (track.isrc || '').trim().toUpperCase();
			if (cleanIsrc) {
				if (seenIsrcs.has(cleanIsrc)) continue;
				seenIsrcs.add(cleanIsrc);
			}
			uniqueAlbumTracks.push(track);
		}

		if (uniqueAlbumTracks.length === 0) continue;

		if (album.isRockOpera) {
			const setId = (album.rockOperaSetId || '').trim();
			const blockKey = setId ? `series:${album.artistSlug}:${setId}` : `opera:${album.id}`;
			const blockType = setId ? 'series' : 'opera';
			const blockTitle = setId
				? rockOperaSeriesTitles[setId] || `${album.artist} — ${setId}`
				: `${album.title} (Full Rock Opera)`;

			let blockEntry = operaBlockMap.get(blockKey);
			if (!blockEntry) {
				blockEntry = {
					id: blockKey,
					title: blockTitle,
					artist: album.artist,
					type: blockType,
					albums: [],
					tracks: [],
					durationSeconds: 0
				};
				operaBlockMap.set(blockKey, blockEntry);
			}

			if (!blockEntry.albums.includes(album.title)) {
				blockEntry.albums.push(album.title);
			}

			for (const track of uniqueAlbumTracks) {
				const secs = parseDurationToSeconds(track.duration);
				totalDurationSeconds += secs;
				blockEntry.durationSeconds += secs;
				blockEntry.tracks.push(track);
			}
		} else {
			// Standard non-rock-opera album: each unique track is an independent shuffleable 1-track block
			for (const track of uniqueAlbumTracks) {
				const secs = parseDurationToSeconds(track.duration);
				totalDurationSeconds += secs;
				shuffleableBlocks.push({
					blockType: 'single',
					blockTitle: album.title,
					tracks: [
						{
							...track,
							radioBlockType: 'single',
							radioBlockTitle: '',
							radioBlockTrackIndex: 1,
							radioBlockTrackCount: 1
						}
					]
				});
			}
		}
	}

	// Annotate each track inside Rock Opera / Rock Opera Series blocks with its sequence position
	// and push each complete Rock Opera / Series into `shuffleableBlocks` as a single indivisible unit.
	/** @type {Array<{ id: string, title: string, artist: string, type: 'series' | 'opera', albums: string[], trackCount: number, durationSeconds: number }>} */
	const operaBlocksSummary = [];

	for (const block of operaBlockMap.values()) {
		const count = block.tracks.length;
		const annotatedTracks = block.tracks.map((t, idx) => ({
			...t,
			radioBlockType: block.type,
			radioBlockTitle: block.title,
			radioBlockAlbums: block.albums,
			radioBlockTrackIndex: idx + 1,
			radioBlockTrackCount: count
		}));

		shuffleableBlocks.push({
			blockType: block.type,
			blockTitle: block.title,
			tracks: annotatedTracks
		});

		operaBlocksSummary.push({
			id: block.id,
			title: block.title,
			artist: block.artist,
			type: block.type,
			albums: block.albums,
			trackCount: count,
			durationSeconds: block.durationSeconds
		});
	}

	// Fisher-Yates shuffle at the block level (preserving internal track order of every Rock Opera & Series)
	for (let i = shuffleableBlocks.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffleableBlocks[i];
		shuffleableBlocks[i] = shuffleableBlocks[j];
		shuffleableBlocks[j] = temp;
	}

	// Flatten shuffled blocks into the final continuous broadcast queue
	const flattenedTracks = shuffleableBlocks.flatMap((b) => b.tracks);

	// Calculate days, hours, and minutes
	const days = Math.floor(totalDurationSeconds / 86400);
	const hours = Math.floor((totalDurationSeconds % 86400) / 3600);
	const minutes = Math.floor((totalDurationSeconds % 3600) / 60);

	// Thematic Engine Room Records reality-check comparison
	let realityCheck = '';
	if (totalDurationSeconds < 3600) {
		realityCheck = 'Shorter than a typical band rehearsal in the Blacksburg warehouse.';
	} else if (totalDurationSeconds < 10800) {
		realityCheck =
			'Roughly the time it takes to drive the classic tour van from Blacksburg to Richmond.';
	} else if (totalDurationSeconds < 28800) {
		realityCheck =
			'Long enough to survive a grueling, non-stop overnight haul from Virginia to Chicago.';
	} else if (totalDurationSeconds < 86400) {
		realityCheck =
			"Longer than the world's longest commercial non-stop flight from New York to Singapore (18 hours and 40 minutes).";
	} else if (totalDurationSeconds < 259200) {
		realityCheck =
			'Longer than the Apollo 11 astronauts spent in lunar orbit during the 1969 moon landing.';
	} else {
		realityCheck = 'A continuous transmission rivaling a deep-space orbital deployment.';
	}

	return {
		tracks: flattenedTracks,
		operaBlocks: operaBlocksSummary,
		stats: {
			totalTracks: flattenedTracks.length,
			totalDurationSeconds,
			days,
			hours,
			minutes,
			realityCheck
		}
	};
}

/**
 * Formats an in-universe release date string (`YYYY-MM-DD`, `YYYY-MM`, or `YYYY`)
 * according to the user's operating system / browser locale (`Intl.DateTimeFormat(undefined, ...)`).
 *
 * CRITICAL ARCHITECTURAL RULE (ZERO TIMEZONE SHIFT):
 * Never pass a bare ISO date string (`"1987-08-25"`) directly to `new Date("1987-08-25")`,
 * because the ECMAScript specification parses date-only ISO strings as UTC midnight
 * (`1987-08-25T00:00:00Z`), which shifts backward by one day (`August 24, 1987`) in
 * Western Hemisphere timezones (e.g., EDT / EST / PDT).
 *
 * Instead, we split the integer year, month, and day components and construct a
 * local calendar date `new Date(year, month - 1, day)` so that `"1987-08-25"` is
 * unconditionally rendered as August 25, 1987 in the user's local OS date format.
 *
 * @param {string | undefined | null} rawDate - The raw `temporalCoverage` or `datePublished` string.
 * @param {string | undefined | null} [fallbackYear] - Fallback 4-digit year if `rawDate` is empty.
 * @param {'long' | 'medium' | 'short'} [style='long'] - Date formatting style (`'long'` -> "August 25, 1987" in en-US, "25 August 1987" in en-GB).
 * @returns {string} The OS-localized calendar date string.
 */
export function formatReleaseDate(rawDate, fallbackYear = '', style = 'long') {
	const value = (rawDate || fallbackYear || '').trim();
	if (!value) return 'Unspecified';

	// Match exact YYYY-MM-DD calendar date
	const fullMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (fullMatch) {
		const year = parseInt(fullMatch[1], 10);
		const monthIndex = parseInt(fullMatch[2], 10) - 1;
		const day = parseInt(fullMatch[3], 10);
		const localDate = new Date(year, monthIndex, day);

		try {
			return new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: style === 'short' ? 'short' : 'long',
				day: 'numeric'
			}).format(localDate);
		} catch {
			return value;
		}
	}

	// Match YYYY-MM (Year and Month only)
	const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
	if (monthMatch) {
		const year = parseInt(monthMatch[1], 10);
		const monthIndex = parseInt(monthMatch[2], 10) - 1;
		const localDate = new Date(year, monthIndex, 1);

		try {
			return new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: style === 'short' ? 'short' : 'long'
			}).format(localDate);
		} catch {
			return value;
		}
	}

	// Year-only ("2004") or custom range string: return as-is
	return value;
}

/**
 * Cross-artist shared composition slugs where multiple bands on the Engine Room
 * Records roster perform the same canonical song (e.g., Crimson Node's studio
 * "The Flight Path" and The Stardust Engine's live concert performances of it).
 * @type {Set<string>}
 */
const CROSS_ARTIST_SHARED_SONG_SLUGS = new Set([
	'the-flight-path',
	'homeward-on-this-day'
]);

/**
 * Canonical song family alias map unifying tracks whose titles evolved across eras
 * (e.g., "My Anchor (The Sail)" / "My Anchor: The Sail" reclaiming 1987's "My Anchor Holds",
 * or live concert medleys/subtitles referencing the studio original).
 * @type {Record<string, string>}
 */
const CANONICAL_SONG_FAMILY_ALIASES = {
	'my-anchor-the-sail': 'my-anchor-holds',
	'impact-mile-marker-98': 'impact',
	'the-penumbra-transit': 'the-penumbra'
};

/**
 * Normalizes a track title and artist slug into a canonical song family identifier
 * (`"<artistSlug|shared>::<baseSongSlug>"`).
 *
 * Strips parenthetical and bracketed version, demo, mix, edit, language, and live
 * venue descriptors while preserving core song titles (such as `Escape Velocity (Ad Astra)`).
 *
 * @param {string | undefined | null} title
 * @param {string | undefined | null} [artistSlug='']
 * @returns {string}
 */
export function getSongFamilyKey(title, artistSlug = '') {
	if (!title || typeof title !== 'string') return '';

	let cleaned = title
		.toLowerCase()
		.replace(/[’‘]/g, "'")
		// Strip bracketed version/suite/edit/language tags: [Full Suite], [Radio Edit], [Japanese Version], etc.
		.replace(
			/\[(?:full suite|radio edit|japanese version|english version|[^\]]*mix[^\]]*|[^\]]*demo[^\]]*|[^\]]*live[^\]]*)\]/gi,
			''
		)
		// Strip parenthetical live, guest, demo, sketch, mix, edit, and reprise suffixes
		.replace(
			/\((?:live[^)]*|feat\.[^)]*|ft\.[^)]*|corporate demo|sabotage demo|warehouse demo|1992 demo|basement demo|early demo|the rejected mix|acoustic[^)]*|rough mix|alternate[^)]*|12"[^)]*|extended[^)]*|club mix|instrumental[^)]*|b-side|the family mix[^)]*|cosmic tidal lock mix|radio edit|full suite|reprise|remaster[^)]*)\)/gi,
			''
		)
		.trim();

	let baseSlug = cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	if (!baseSlug) return '';

	if (CANONICAL_SONG_FAMILY_ALIASES[baseSlug]) {
		baseSlug = CANONICAL_SONG_FAMILY_ALIASES[baseSlug];
	}

	const scope = CROSS_ARTIST_SHARED_SONG_SLUGS.has(baseSlug)
		? 'shared'
		: (artistSlug || 'unknown').toLowerCase().trim();

	return `${scope}::${baseSlug}`;
}

/**
 * Extracts a concise, human-readable version descriptor badge for a recording
 * (e.g., `"1987 Studio"`, `"Early Demo"`, `"Cosmic Tidal Lock Mix"`, `"Live in Norfolk"`,
 * `"Corporate Demo"`, `"Sabotage Demo"`, `"Full Suite"`, `"Radio Edit"`).
 *
 * @param {Track | any} track
 * @param {Album | any} album
 * @returns {string}
 */
export function describeTrackVersion(track, album) {
	// 0. Prefer explicit `version` key from `tracks.json` when present
	if (track?.version && String(track.version).trim()) {
		return String(track.version).trim();
	}

	const rawTitle = (track?.title || '').trim();

	// 1. Check bracketed descriptors first: [Full Suite], [Radio Edit], [Japanese Version]
	const bracketMatch = /\[([^\]]+)\]/.exec(rawTitle);
	if (bracketMatch && bracketMatch[1]) {
		return bracketMatch[1].trim();
	}

	// 2. Check parenthetical version/demo/mix/live descriptors (ignoring "(Ad Astra)" and "(The Sail)")
	const parenRegex = /\(([^)]+)\)/g;
	/** @type {string[]} */
	const matchedTags = [];
	let match;
	while ((match = parenRegex.exec(rawTitle)) !== null) {
		const inner = match[1].trim();
		const lower = inner.toLowerCase();
		if (lower === 'ad astra' || lower === 'the sail') continue;
		matchedTags.push(inner);
	}

	if (matchedTags.length > 0) {
		return matchedTags.join(' • ');
	}

	// 3. Fall back to album production category
	if (album?.albumType === 'live') {
		return 'Live Concert Recording';
	}
	if (album?.albumType === 'compilation') {
		return 'Anthology / Compilation';
	}
	if (album?.albumType === 'soundtrack') {
		return 'Soundtrack Recording';
	}
	return 'Studio Recording';
}

/**
 * Formats a single `(track, album)` pair into a complete player queue item compatible
 * with `player.loadTrack()` and `player.loadQueue()`.
 *
 * @param {Track | any} track
 * @param {Album} album
 * @returns {any}
 */
export function formatSingleTrackForPlayer(track, album) {
	return {
		...track,
		album: album.title,
		albumSlug: album.slug,
		artist: album.artist,
		artistSlug: album.artistSlug,
		artistLogo: album.artistLogo || null,
		artistLoreUrl: album.artistLoreUrl || '',
		loreUrl: album.loreUrl || '',
		artwork: album.artwork,
		socialPreview: album.socialPreview,
		year: album.year,
		temporalCoverage: album.temporalCoverage,
		spotifyId: album.spotifyId || '',
		appleId: album.appleId || '',
		amazonId: album.amazonId || '',
		youtubeId: album.youtubeId || '',
		storeStandardUrl: album.storeStandardUrl || '',
		storeAudiophileUrl: album.storeAudiophileUrl || '',
		dspExempt: Boolean(album.dspExempt),
		dspNotice: album.dspNotice || '',
		isRockOpera: Boolean(album.isRockOpera),
		rockOperaSetId: album.rockOperaSetId || ''
	};
}

/**
 * @typedef {Object} RelatedSongEntry
 * @property {string} key - Unique composite key (`${album.slug}::${track.id}`)
 * @property {Track} track - The related track object
 * @property {Album} album - The parent album containing the related track
 * @property {any} playerTrack - Pre-formatted queue object ready for `player.loadTrack()`
 * @property {string} versionLabel - Concise version descriptor (e.g. `"Early Demo"`, `"Live in Norfolk"`)
 * @property {string} releaseYear - 4-digit in-universe or release year for chronological sorting
 * @property {boolean} isSameAlbum - Whether this alternate version is on the same album (e.g. Full Suite vs. Radio Edit)
 * @property {boolean} isSameMasterIsrc - Whether this entry shares the exact same ISRC code as the source track
 * @property {string} deepLinkQuery - Query parameter value for `?track=...`
 */

/**
 * Finds all related recordings and alternate versions of a given song across the
 * Engine Room Records catalog (`allAlbums`), sorted in chronological order.
 *
 * Matches:
 * - Studio originals vs. Live concert performances (*Electric Color*, *Midnight Drivers*, *Our Own Frequency*, etc.)
 * - Early demos, acoustic sketches, warehouse tapes, and rejected mixes (*Neon Hearts*, *Empty Arenas*, *The Promise*, *Atmosphere*)
 * - Full Suites vs. Radio Edits (*Escape Velocity (Ad Astra)*)
 * - Cosmic Tidal Lock Mixes (*Starfield Calibration*) and Family Mixes (*Upon This Winter's Night*)
 * - Cross-band shared songs (*The Flight Path* across Crimson Node and The Stardust Engine)
 *
 * @param {Track | any} track - The reference track (from an Album page or `player.currentTrack`)
 * @param {Album | string | null | undefined} [currentAlbumOrSlug] - The parent album object or `albumSlug`
 * @param {Album[]} [catalog=allAlbums]
 * @returns {RelatedSongEntry[]}
 */
export function getRelatedSongs(track, currentAlbumOrSlug = null, catalog = allAlbums) {
	if (!track || !track.title) return [];

	const currentAlbumSlug =
		typeof currentAlbumOrSlug === 'string'
			? currentAlbumOrSlug
			: currentAlbumOrSlug?.slug || track.albumSlug || '';
	const currentArtistSlug =
		(typeof currentAlbumOrSlug === 'object' && currentAlbumOrSlug?.artistSlug) ||
		track.artistSlug ||
		'';

	const familyKey = getSongFamilyKey(track.title, currentArtistSlug);
	if (!familyKey) return [];

	const currentTrackId = track.id || '';
	const currentIsrc = (track.isrc || '').trim().toUpperCase();

	/** @type {RelatedSongEntry[]} */
	const results = [];

	for (const album of catalog) {
		for (const candidate of album.tracks) {
			// Skip the exact same track instance on the exact same album
			if (album.slug === currentAlbumSlug && candidate.id === currentTrackId) {
				continue;
			}

			const candidateFamilyKey = getSongFamilyKey(candidate.title, album.artistSlug);
			if (candidateFamilyKey !== familyKey) continue;

			const candidateIsrc = (candidate.isrc || '').trim().toUpperCase();
			const isSameMasterIsrc = Boolean(
				currentIsrc && candidateIsrc && currentIsrc === candidateIsrc
			);
			const isSameAlbum = Boolean(currentAlbumSlug && album.slug === currentAlbumSlug);
			const rawYear = (album.temporalCoverage || album.year || '').slice(0, 4);

			results.push({
				key: `${album.slug}::${candidate.id}`,
				track: candidate,
				album,
				playerTrack: formatSingleTrackForPlayer(candidate, album),
				versionLabel: describeTrackVersion(candidate, album),
				releaseYear: rawYear || album.year || '',
				isSameAlbum,
				isSameMasterIsrc,
				deepLinkQuery: candidate.fileName || candidate.id
			});
		}
	}

	// Sort chronologically by in-universe date (`temporalCoverage || year`), then album type, then disc/track
	results.sort((a, b) => {
		const dateA = a.album.temporalCoverage || a.album.year || '9999';
		const dateB = b.album.temporalCoverage || b.album.year || '9999';
		if (dateA !== dateB) return dateA.localeCompare(dateB);
		if (a.album.slug !== b.album.slug) return a.album.slug.localeCompare(b.album.slug);
		if ((a.track.disc || 1) !== (b.track.disc || 1)) {
			return (a.track.disc || 1) - (b.track.disc || 1);
		}
		return (a.track.track || 1) - (b.track.track || 1);
	});

	return results;
}

/**
 * Builds a chronological playback queue of all distinct playable recordings in a
 * song's family (including the reference track and all playable alternate versions),
 * deduplicating identical audio streams/ISRCs so listeners can compare every
 * distinct version back-to-back.
 *
 * @param {Track | any} referenceTrack
 * @param {Album | string | null | undefined} [currentAlbumOrSlug]
 * @param {Album[]} [catalog=allAlbums]
 * @returns {{ queue: any[], startIndex: number }}
 */
export function buildSongFamilyComparisonQueue(
	referenceTrack,
	currentAlbumOrSlug = null,
	catalog = allAlbums
) {
	if (!referenceTrack || !referenceTrack.title) {
		return { queue: [], startIndex: 0 };
	}

	const currentAlbumSlug =
		typeof currentAlbumOrSlug === 'string'
			? currentAlbumOrSlug
			: currentAlbumOrSlug?.slug || referenceTrack.albumSlug || '';
	const currentArtistSlug =
		(typeof currentAlbumOrSlug === 'object' && currentAlbumOrSlug?.artistSlug) ||
		referenceTrack.artistSlug ||
		'';

	const familyKey = getSongFamilyKey(referenceTrack.title, currentArtistSlug);
	if (!familyKey) return { queue: [], startIndex: 0 };

	/** @type {Array<{ album: Album, track: Track, playerTrack: any }>} */
	const allPlayableMatches = [];

	for (const album of catalog) {
		for (const candidate of album.tracks) {
			if (!candidate.isPlayable || !candidate.audioUrl) continue;
			if (getSongFamilyKey(candidate.title, album.artistSlug) !== familyKey) continue;
			allPlayableMatches.push({
				album,
				track: candidate,
				playerTrack: formatSingleTrackForPlayer(candidate, album)
			});
		}
	}

	// Sort so studio/live albums take precedence over compilation re-inclusions for identical ISRCs,
	// then sort chronologically by release date.
	allPlayableMatches.sort((a, b) => {
		const dateA = a.album.temporalCoverage || a.album.year || '9999';
		const dateB = b.album.temporalCoverage || b.album.year || '9999';
		if (dateA !== dateB) return dateA.localeCompare(dateB);
		const compA = a.album.albumType === 'compilation' ? 1 : 0;
		const compB = b.album.albumType === 'compilation' ? 1 : 0;
		if (compA !== compB) return compA - compB;
		if ((a.track.disc || 1) !== (b.track.disc || 1)) {
			return (a.track.disc || 1) - (b.track.disc || 1);
		}
		return (a.track.track || 1) - (b.track.track || 1);
	});

	// Deduplicate by ISRC (or audioUrl if ISRC is empty) unless it is the exact track the user clicked from
	/** @type {Set<string>} */
	const seenRecordingKeys = new Set();
	/** @type {any[]} */
	const deduplicatedQueue = [];

	for (const item of allPlayableMatches) {
		const isrcKey = (item.track.isrc || '').trim().toUpperCase();
		const dedupeKey = isrcKey || item.track.audioUrl;
		if (dedupeKey && seenRecordingKeys.has(dedupeKey)) {
			// If the user started from a compilation whose ISRC was already added via its original studio album,
			// we keep the original studio entry in the comparison queue.
			continue;
		}
		if (dedupeKey) seenRecordingKeys.add(dedupeKey);
		deduplicatedQueue.push(item.playerTrack);
	}

	const refIsrc = (referenceTrack.isrc || '').trim().toUpperCase();
	let startIndex = deduplicatedQueue.findIndex(
		(q) =>
			(q.albumSlug === currentAlbumSlug && q.id === referenceTrack.id) ||
			(refIsrc && (q.isrc || '').trim().toUpperCase() === refIsrc)
	);
	if (startIndex < 0) startIndex = 0;

	return {
		queue: deduplicatedQueue,
		startIndex
	};
}


