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
 * @property {string | null} [artistLogo]
 * @property {string | null} [artistSocialPreview]
 * @property {string} year
 * @property {string} [temporalCoverage]
 * @property {string} [datePublished]
 * @property {string} genre
 * @property {boolean} isRockOpera
 * @property {string} [albumType]
 * @property {string} [albumTypeLabel]
 * @property {string} status
 * @property {string} statusLabel
 * @property {number} playableTrackCount
 * @property {number} totalTracksCount
 * @property {string} artwork
 * @property {string} socialPreview
 * @property {string} description
 * @property {string} [spotifyId]
 * @property {string} [appleId]
 * @property {string} [amazonId]
 * @property {string} [youtubeId]
 * @property {string} [storeStandardUrl]
 * @property {string} [storeAudiophileUrl]
 * @property {boolean} [dspExempt]
 * @property {string} [dspNotice]
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
		flagshipAlbumSlug: '1992-dream-kingdom-ost',
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
			'Rooted in warm acoustic storytelling, heartland rock, and rich vocal harmonies, Firelight captures the intimate, glowing moments of community, memory, and resilience around the hearth.',
		genres: ['Heartland Rock', 'Acoustic Folk-Rock', 'Americana'],
		yearsActive: '1995–Present'
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
 * @returns {Array<Track & { album: string; albumSlug: string; artist: string; artistSlug: string; artistLogo: string | null; artwork: string; socialPreview: string; year: string; temporalCoverage?: string; spotifyId?: string; appleId?: string; amazonId?: string; youtubeId?: string; storeStandardUrl?: string; storeAudiophileUrl?: string; dspExempt?: boolean; dspNotice?: string }>}
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
			temporalCoverage: album.temporalCoverage,
			spotifyId: album.spotifyId || '',
			appleId: album.appleId || '',
			amazonId: album.amazonId || '',
			youtubeId: album.youtubeId || '',
			storeStandardUrl: album.storeStandardUrl || '',
			storeAudiophileUrl: album.storeAudiophileUrl || '',
			dspExempt: Boolean(album.dspExempt),
			dspNotice: album.dspNotice || ''
		}));
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
