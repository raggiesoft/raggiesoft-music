/**
 * @license MIT
 * ============================================================================
 * src/lib/seo.js
 * ============================================================================
 * Canonical Search Engine Optimization (SEO), Metadata & Schema.org JSON-LD
 * Entity Graph Engine for The Listening Room (`https://music.raggiesoft.com`).
 *
 * Architectural Guarantees:
 * 1. Unified Cross-Network Entity `@id`s:
 *    - WebSite:      `https://music.raggiesoft.com/#website`
 *    - Organization: `https://engineroom.raggiesoft.com/#organization`
 *    - Parent Org:   `https://raggiesoft.com/#organization`
 *    - Person:       `https://michaelpragsdale.com/#michael-ragsdale`
 *    - WebApp:       `https://music.raggiesoft.com/#webapp`
 *    - Artist:       `https://music.raggiesoft.com/[artist]#artist`
 *    - Album:        `https://music.raggiesoft.com/[artist]/[album]#album`
 *    - Composition:  `https://music.raggiesoft.com/[artist]/[studio-album]/[track]#composition`
 *    - Recording:    `https://music.raggiesoft.com/[artist]/[primary-album]/[track]#recording`
 * 2. Discovery Platform Positioning (Free 128 kbps Sample -> Lossless DSP Handoff):
 *    - Explicitly describes The Listening Room as a free reference-sample discovery
 *      platform (`AudioObject` with `bitrate: "128kbps"`, `isAccessibleForFree: true`)
 *      paired with Schema.org `ListenAction` (`potentialAction`) pointing to Spotify,
 *      Apple Music, Amazon Music, and YouTube Music for full high-resolution streaming.
 * 3. Strict `sameAs` Entity Equivalence Hygiene:
 *    - Never mixes album DSP URLs or Fourthwall shopping-cart product URLs into
 *      `MusicRecording.sameAs`, and never mixes fallback album URLs into `MusicGroup.sameAs`.
 * 4. Song Composition Grouping & Shared-ISRC Deduplication:
 *    - Links studio, live, remix, and anthology recordings of the same song to one
 *      canonical `MusicComposition` (`recordingOf`).
 *    - Reuses the primary studio `MusicRecording` `@id` when a compilation album
 *      includes the exact same ISRC master, and omits `MusicRecording` entirely on
 *      unrecorded setlist stub pages (`!track.isPlayable && !track.isrc`).
 * ============================================================================
 */

import {
	allAlbums,
	getSongFamilyKey,
	parseDurationToSeconds,
	rockOperaSeriesTitles
} from '#lib/data/musicData.js';

export const SITE_ORIGIN = 'https://music.raggiesoft.com';
export const WEBSITE_ID = 'https://music.raggiesoft.com/#website';
export const ORG_ID = 'https://engineroom.raggiesoft.com/#organization';
export const RAGGIESOFT_ORG_ID = 'https://raggiesoft.com/#organization';
export const PERSON_ID = 'https://michaelpragsdale.com/#michael-ragsdale';
export const WEBAPP_ID = 'https://music.raggiesoft.com/#webapp';

const ACTION_PLATFORMS = [
	'http://schema.org/DesktopWebPlatform',
	'http://schema.org/MobileWebPlatform',
	'http://schema.org/IOSPlatform',
	'http://schema.org/AndroidPlatform'
];

/**
 * Truncates text cleanly on a word boundary to stay within `maxLen` characters.
 * Used strictly for HTML `<meta name="description">` and `og:title` constraints,
 * NEVER for Schema.org JSON-LD `description` fields.
 *
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateMeta(text, maxLen) {
	const clean = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	if (clean.length <= maxLen) return clean;
	const sliced = clean.slice(0, maxLen - 1);
	const lastSpace = sliced.lastIndexOf(' ');
	if (lastSpace > Math.floor(maxLen * 0.6)) {
		return `${sliced.slice(0, lastSpace).replace(/[,;:\-–—]+$/, '')}…`;
	}
	return `${sliced.replace(/[,;:\-–—]+$/, '')}…`;
}

/**
 * Strips HTML tags and Markdown formatting from compiled prose snippets.
 *
 * @param {string | undefined | null} raw
 * @returns {string}
 */
export function stripPlainText(raw) {
	return String(raw || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Ensures any emitted `datePublished` or `music:release_date` is a genuine
 * real-world Engine Room Records release date (`>= 2026`), never a fictional
 * narrative date.
 *
 * @param {string | undefined | null} candidate
 * @param {string} [fallback='2026-04-01']
 * @returns {string}
 */
export function ensureRealWorldDate(candidate, fallback = '2026-04-01') {
	const raw = String(candidate || '').trim();
	const match = /^(\d{4})(?:-\d{2}(?:-\d{2})?)?$/.exec(raw);
	if (match && parseInt(match[1], 10) >= 2026) {
		return raw;
	}
	return fallback;
}

/**
 * Converts a human-readable duration (`"5:08"` or `"1:02:05"`) into an ISO 8601
 * Schema.org duration string (`"PT5M8S"` or `"PT1H2M5S"`). Returns `undefined`
 * for `"In Studio"`, `"0:00"`, or invalid inputs.
 *
 * @param {string | undefined | null} durationStr
 * @returns {string | undefined}
 */
export function formatIsoDuration(durationStr) {
	if (!durationStr || typeof durationStr !== 'string' || !durationStr.includes(':')) {
		return undefined;
	}
	const parts = durationStr
		.trim()
		.split(':')
		.map((n) => parseInt(n, 10));
	if (parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;

	let hours = 0;
	let minutes;
	let seconds;
	if (parts.length === 3) {
		[hours, minutes, seconds] = parts;
	} else if (parts.length === 2) {
		[minutes, seconds] = parts;
	} else {
		return undefined;
	}

	if (hours === 0 && minutes === 0 && seconds === 0) return undefined;

	let iso = 'PT';
	if (hours > 0) iso += `${hours}H`;
	if (minutes > 0) iso += `${minutes}M`;
	if (seconds > 0 || (hours === 0 && minutes === 0)) iso += `${seconds}S`;
	return iso;
}

/**
 * Collects strict entity-equivalent `sameAs` URLs for an Artist (`MusicGroup`),
 * Album (`MusicAlbum`), or Track (`MusicRecording`).
 *
 * CRITICAL ENTITY GRAPH RULES:
 * - Never emits Fourthwall shopping-cart product URLs (`store.raggiesoft.com/products/...`)
 *   inside `sameAs` (commercial store pages are not `owl:sameAs` for creative entities).
 * - Never emits album-level DSP URLs inside `MusicRecording.sameAs` or `MusicGroup.sameAs`.
 *
 * @param {Record<string, any>} item
 * @param {'artist' | 'album' | 'track'} [entityType='album']
 * @param {Record<string, any>} [parentAlbum]
 * @returns {string[]}
 */
export function buildDspSameAs(item, entityType = 'album', parentAlbum = undefined) {
	if (!item) return [];
	/** @type {Set<string>} */
	const urls = new Set();

	if (entityType === 'artist') {
		if (!item.dspExempt && item.dspTargetType === 'artist') {
			const spotifyId = String(item.spotifyId || '').trim();
			const appleId = String(item.appleId || '').trim();
			const amazonId = String(item.amazonId || '').trim();
			const youtubeId = String(item.youtubeId || '').trim();

			if (spotifyId) urls.add(`https://open.spotify.com/artist/${spotifyId}`);
			if (appleId) urls.add(`https://music.apple.com/us/artist/${appleId}`);
			if (amazonId) urls.add(`https://music.amazon.com/artists/${amazonId}`);
			if (youtubeId && youtubeId.startsWith('UC')) {
				urls.add(`https://music.youtube.com/channel/${youtubeId}`);
			}
		}
		if (item.loreUrl) {
			urls.add(String(item.loreUrl).trim());
		}
		return Array.from(urls).filter(Boolean);
	}

	if (entityType === 'album') {
		if (!item.dspExempt) {
			const spotifyId = String(item.spotifyId || '').trim();
			const appleId = String(item.appleId || '').trim();
			const amazonId = String(item.amazonId || '').trim();
			const youtubeId = String(item.youtubeId || '').trim();

			if (spotifyId) urls.add(`https://open.spotify.com/album/${spotifyId}`);
			if (appleId) urls.add(`https://music.apple.com/us/album/${appleId}`);
			if (amazonId) urls.add(`https://music.amazon.com/albums/${amazonId}`);
			if (youtubeId) {
				if (youtubeId.startsWith('OLAK') || youtubeId.startsWith('PL')) {
					urls.add(`https://music.youtube.com/playlist?list=${youtubeId}`);
				} else if (youtubeId.startsWith('MPRE')) {
					urls.add(`https://music.youtube.com/browse/${youtubeId}`);
				} else if (!youtubeId.startsWith('UC')) {
					urls.add(`https://music.youtube.com/watch?v=${youtubeId}`);
				}
			}
		}
		if (item.loreUrl) {
			urls.add(String(item.loreUrl).trim());
		}
		return Array.from(urls).filter(Boolean);
	}

	// `entityType === 'track'`: strictly track-specific identity URLs + official ISRC registry
	if (!parentAlbum?.dspExempt && !item.dspExempt) {
		const spotifyTrackId = String(item.spotifyTrackId || '').trim();
		const appleTrackId = String(item.appleTrackId || '').trim();
		const amazonTrackId = String(item.amazonTrackId || '').trim();
		const youtubeVideoId = String(item.youtubeVideoId || '').trim();
		const parentAppleAlbumId = String(parentAlbum?.appleId || '').trim();

		if (spotifyTrackId) {
			urls.add(`https://open.spotify.com/track/${spotifyTrackId}`);
		}
		if (appleTrackId) {
			urls.add(
				parentAppleAlbumId
					? `https://music.apple.com/us/album/${parentAppleAlbumId}?i=${appleTrackId}`
					: `https://music.apple.com/us/song/${appleTrackId}`
			);
		}
		if (amazonTrackId) {
			urls.add(`https://music.amazon.com/tracks/${amazonTrackId}`);
		}
		if (youtubeVideoId) {
			urls.add(`https://music.youtube.com/watch?v=${youtubeVideoId}`);
		}
	}

	if (item.isrc) {
		urls.add(
			`https://engineroom.raggiesoft.com/isrc?code=${encodeURIComponent(String(item.isrc).trim())}`
		);
	}

	return Array.from(urls).filter(Boolean);
}

/**
 * Builds a Schema.org `ListenAction` (`potentialAction`) pointing search engines
 * from The Listening Room's free 128 kbps discovery previews directly to full
 * high-resolution / lossless streaming on Spotify, Apple Music, Amazon Music,
 * and YouTube Music.
 *
 * @param {Record<string, any>} album
 * @returns {Record<string, any> | undefined}
 */
export function buildDspListenAction(album) {
	if (!album || album.dspExempt) return undefined;

	/** @type {Array<{ name: string, url: string }>} */
	const targets = [];
	const spotifyId = String(album.spotifyId || '').trim();
	const appleId = String(album.appleId || '').trim();
	const amazonId = String(album.amazonId || '').trim();
	const youtubeId = String(album.youtubeId || '').trim();

	if (spotifyId) {
		targets.push({ name: 'Spotify', url: `https://open.spotify.com/album/${spotifyId}` });
	}
	if (appleId) {
		targets.push({ name: 'Apple Music', url: `https://music.apple.com/us/album/${appleId}` });
	}
	if (amazonId) {
		targets.push({ name: 'Amazon Music', url: `https://music.amazon.com/albums/${amazonId}` });
	}
	if (youtubeId) {
		const ytUrl =
			youtubeId.startsWith('OLAK') || youtubeId.startsWith('PL')
				? `https://music.youtube.com/playlist?list=${youtubeId}`
				: youtubeId.startsWith('MPRE')
					? `https://music.youtube.com/browse/${youtubeId}`
					: `https://music.youtube.com/watch?v=${youtubeId}`;
		targets.push({ name: 'YouTube Music', url: ytUrl });
	}

	if (targets.length === 0) return undefined;

	return {
		'@type': 'ListenAction',
		name: 'Stream Full High-Resolution Audio on Official Music Platforms',
		target: targets.map((t) => ({
			'@type': 'EntryPoint',
			name: t.name,
			urlTemplate: t.url,
			actionPlatform: ACTION_PLATFORMS
		}))
	};
}

/**
 * Formats a display title for a track, appending `(Version)` when `track.version`
 * is specified and not already part of `track.title`.
 *
 * @param {import('#lib/data/musicData.js').Track} track
 * @returns {string}
 */
export function getTrackDisplayTitle(track) {
	const base = String(track?.title || '').trim();
	const ver = String(track?.version || '').trim();
	if (!ver) return base;
	if (base.toLowerCase().includes(ver.toLowerCase())) return base;
	return `${base} (${ver})`;
}

/**
 * Normalizes lyrics text into a compact alphanumeric fingerprint so unrecorded
 * setlist pages can detect when their lyrics are an exact duplicate of the
 * canonical studio recording.
 *
 * @param {string | undefined | null} rawLyrics
 * @returns {string}
 */
function buildLyricsFingerprint(rawLyrics) {
	if (!rawLyrics) return '';
	return String(rawLyrics)
		.toLowerCase()
		.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Precomputed lookup map identifying the primary (earliest non-compilation)
 * album for every `(artistSlug, displayTitle)` pair so multi-album songs
 * receive disambiguated `<title>` tags on live/compilation/remix appearances.
 * @type {Map<string, { count: number, primaryAlbumSlug: string }>}
 */
const trackTitleCollisionMap = (() => {
	/** @type {Map<string, Array<{ albumSlug: string, isComp: number, hasAudio: number, sortDate: string }>>} */
	const buckets = new Map();
	for (const album of allAlbums) {
		for (const track of album.tracks || []) {
			const disp = getTrackDisplayTitle(track).toLowerCase();
			const key = `${album.artistSlug}:::${disp}`;
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key)?.push({
				albumSlug: album.slug,
				isComp: album.albumType === 'compilation' ? 1 : 0,
				hasAudio: track.isPlayable || track.isrc ? 0 : 1,
				sortDate: album.temporalCoverage || album.year || '9999'
			});
		}
	}

	/** @type {Map<string, { count: number, primaryAlbumSlug: string }>} */
	const out = new Map();
	for (const [key, list] of buckets.entries()) {
		list.sort((a, b) => {
			if (a.hasAudio !== b.hasAudio) return a.hasAudio - b.hasAudio;
			if (a.isComp !== b.isComp) return a.isComp - b.isComp;
			if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
			return a.albumSlug.localeCompare(b.albumSlug);
		});
		out.set(key, {
			count: list.length,
			primaryAlbumSlug: list[0].albumSlug
		});
	}
	return out;
})();

/**
 * Precomputed canonical `MusicComposition` lookup keyed by `getSongFamilyKey(title, artistSlug)`.
 * Ensures all studio, live, remix, demo, and anthology appearances of a song point their
 * `recordingOf` property to one canonical `#composition` URI (the earliest studio recording).
 *
 * @type {Map<string, {
 *   compositionId: string,
 *   compositionUrl: string,
 *   name: string,
 *   artistSlug: string,
 *   artistName: string,
 *   albumSlug: string,
 *   albumTitle: string,
 *   albumYear: string,
 *   trackSlug: string,
 *   isPlayable: boolean,
 *   lyricsFingerprint: string
 * }>}
 */
const canonicalCompositionMap = (() => {
	/** @type {Map<string, Array<{ album: any, track: any, typeRank: number, recordedRank: number, sortDate: string }>>} */
	const familyBuckets = new Map();

	for (const album of allAlbums) {
		const typeRank =
			album.albumType === 'studio' || album.albumType === 'soundtrack'
				? 0
				: album.albumType === 'live'
					? 1
					: 2;
		for (const track of album.tracks || []) {
			if (!track.slug) continue;
			const familyKey = getSongFamilyKey(track.title, album.artistSlug);
			if (!familyKey) continue;
			if (!familyBuckets.has(familyKey)) familyBuckets.set(familyKey, []);
			familyBuckets.get(familyKey)?.push({
				album,
				track,
				typeRank,
				recordedRank: track.isPlayable ? 0 : track.isrc ? 1 : 2,
				sortDate: album.temporalCoverage || album.year || '9999'
			});
		}
	}

	const map = new Map();
	for (const [familyKey, entries] of familyBuckets.entries()) {
		entries.sort((a, b) => {
			if (a.recordedRank !== b.recordedRank) return a.recordedRank - b.recordedRank;
			if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
			if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
			return a.album.slug.localeCompare(b.album.slug);
		});
		const primary = entries[0];
		const trackSlug = primary.track.slug || primary.track.fileName || primary.track.id;
		const compositionUrl = `${SITE_ORIGIN}/${primary.album.artistSlug}/${primary.album.slug}/${trackSlug}`;
		// Strip live/demo suffixes for the underlying composition title when possible
		const cleanCompName =
			String(primary.track.title || '')
				.replace(/\s*\[(?:full suite|radio edit)\]\s*/gi, '')
				.trim() || primary.track.title;

		map.set(familyKey, {
			compositionId: `${compositionUrl}#composition`,
			compositionUrl,
			name: cleanCompName,
			artistSlug: primary.album.artistSlug,
			artistName: primary.album.artist,
			albumSlug: primary.album.slug,
			albumTitle: primary.album.title,
			albumYear: primary.album.year || '',
			trackSlug,
			isPlayable: Boolean(primary.track.isPlayable),
			lyricsFingerprint: buildLyricsFingerprint(primary.track.lyrics)
		});
	}
	return map;
})();

/**
 * Precomputed lookup mapping every commercial ISRC (`QZTB52600719`, `QTAHP...`, etc.)
 * to its primary non-compilation release so anthology albums that reuse the exact
 * same master audio reference the single canonical `#recording` `@id`.
 *
 * @type {Map<string, {
 *   recordingId: string,
 *   pageUrl: string,
 *   albumId: string,
 *   albumUrl: string,
 *   albumTitle: string,
 *   albumSlug: string,
 *   numTracks: number
 * }>}
 */
const primaryRecordingByIsrcMap = (() => {
	/** @type {Map<string, Array<{ album: any, track: any, isComp: number, sortDate: string }>>} */
	const buckets = new Map();

	for (const album of allAlbums) {
		for (const track of album.tracks || []) {
			const cleanIsrc = String(track.isrc || '')
				.trim()
				.toUpperCase();
			if (!cleanIsrc || !track.slug) continue;
			if (!buckets.has(cleanIsrc)) buckets.set(cleanIsrc, []);
			buckets.get(cleanIsrc)?.push({
				album,
				track,
				isComp: album.albumType === 'compilation' ? 1 : 0,
				sortDate: album.temporalCoverage || album.year || '9999'
			});
		}
	}

	const out = new Map();
	for (const [isrc, list] of buckets.entries()) {
		list.sort((a, b) => {
			if (a.isComp !== b.isComp) return a.isComp - b.isComp;
			if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
			return a.album.slug.localeCompare(b.album.slug);
		});
		const primary = list[0];
		const albumUrl = `${SITE_ORIGIN}/${primary.album.artistSlug}/${primary.album.slug}`;
		const tSlug = primary.track.slug || primary.track.fileName || primary.track.id;
		const pageUrl = `${albumUrl}/${tSlug}`;
		out.set(isrc, {
			recordingId: `${pageUrl}#recording`,
			pageUrl,
			albumId: `${albumUrl}#album`,
			albumUrl,
			albumTitle: primary.album.title,
			albumSlug: primary.album.slug,
			numTracks: primary.album.totalTracksCount
		});
	}
	return out;
})();

/**
 * Resolves the canonical studio composition metadata for a track, including whether
 * an unrecorded setlist track's lyrics merely duplicate the primary studio version.
 *
 * @param {import('#lib/data/musicData.js').Track} track
 * @param {import('#lib/data/musicData.js').Album} album
 */
export function resolveCanonicalComposition(track, album) {
	const familyKey = getSongFamilyKey(track?.title, album?.artistSlug);
	const comp = familyKey ? canonicalCompositionMap.get(familyKey) || null : null;
	if (!comp) {
		return {
			composition: null,
			isPrimaryCompositionPage: true,
			suppressDuplicateStubLyrics: false
		};
	}

	const isPrimaryCompositionPage =
		comp.artistSlug === album.artistSlug &&
		comp.albumSlug === album.slug &&
		comp.trackSlug === (track.slug || track.fileName || track.id);

	const isUnrecordedStub = !track.isPlayable && !track.isrc;
	const trackFp = buildLyricsFingerprint(track.lyrics);
	const suppressDuplicateStubLyrics = Boolean(
		isUnrecordedStub &&
			!isPrimaryCompositionPage &&
			comp.isPlayable &&
			trackFp &&
			comp.lyricsFingerprint &&
			trackFp === comp.lyricsFingerprint
	);

	return {
		composition: comp,
		isPrimaryCompositionPage,
		suppressDuplicateStubLyrics
	};
}

/**
 * Builds canonical SEO metadata (`title`, `ogTitle`, `description`, `canonicalUrl`)
 * for an Artist Hub route (`/[artist]`).
 *
 * @param {import('#lib/data/musicData.js').ArtistSummary} artist
 */
export function buildArtistSeoMeta(artist) {
	const canonicalUrl = `${SITE_ORIGIN}/${artist.slug}`;
	const title = `${artist.name}: Free Song Samples, Albums & Lore | The Listening Room`;
	const ogTitle = truncateMeta(`${artist.name} — Free Samples, Albums & Lore`, 60);
	const description = truncateMeta(
		`Discover ${artist.name}: play free song samples across ${artist.albumCount} ${artist.albumCount === 1 ? 'release' : 'releases'}, read lyrics & lore, and stream high-res audio on your favorite app.`,
		155
	);
	return { canonicalUrl, title, ogTitle, description };
}

/**
 * Builds canonical SEO metadata (`title`, `ogTitle`, `description`, `canonicalUrl`,
 * `releaseDate`) for an Album route (`/[artist]/[album]`).
 *
 * @param {import('#lib/data/musicData.js').Album} album
 */
export function buildAlbumSeoMeta(album) {
	const canonicalUrl = `${SITE_ORIGIN}/${album.artistSlug}/${album.slug}`;
	const title = `${album.title} by ${album.artist}: Free Samples, Lyrics & Stream`;
	const ogTitle = truncateMeta(`${album.title} — ${album.artist}`, 60);
	const typeWord =
		album.albumType === 'live'
			? 'live album'
			: album.albumType === 'compilation'
				? 'anthology'
				: album.albumType === 'soundtrack'
					? 'soundtrack'
					: 'album';
	const realYear = ensureRealWorldDate(album.datePublished).slice(0, 4);
	const description = truncateMeta(
		`Play free song samples from ${album.title}, the ${album.year} story ${typeWord} by ${album.artist} (${realYear} release), read lyrics & lore, and stream lossless HD.`,
		155
	);
	const releaseDate = ensureRealWorldDate(album.datePublished);
	return { canonicalUrl, title, ogTitle, description, releaseDate };
}

/**
 * Builds canonical SEO metadata (`title`, `ogTitle`, `description`, `canonicalUrl`,
 * `releaseDate`, `durationSeconds`, `isIndexableRecording`) for a Canonical Track
 * route (`/[artist]/[album]/[track]`).
 *
 * @param {import('#lib/data/musicData.js').Track} track
 * @param {import('#lib/data/musicData.js').Album} album
 */
export function buildTrackSeoMeta(track, album) {
	const trackSlug = track.slug || track.fileName || track.id;
	const canonicalUrl = `${SITE_ORIGIN}/${album.artistSlug}/${album.slug}/${trackSlug}`;
	const displayTitle = getTrackDisplayTitle(track);
	const collisionKey = `${album.artistSlug}:::${displayTitle.toLowerCase()}`;
	const collision = trackTitleCollisionMap.get(collisionKey);

	const needsAlbumQualifier =
		collision && collision.count > 1 && collision.primaryAlbumSlug !== album.slug;

	const qualifiedTitle = needsAlbumQualifier ? `${displayTitle} (${album.title})` : displayTitle;
	const isIndexableRecording = Boolean(track.isPlayable || track.isrc);
	const durationSeconds = parseDurationToSeconds(track.duration);

	const title = isIndexableRecording
		? `${qualifiedTitle} by ${album.artist}: Free Sample, Lyrics & Stream`
		: `${qualifiedTitle} by ${album.artist}: Story Setlist & Lore`;
	const ogTitle = truncateMeta(`${qualifiedTitle} — ${album.artist}`, 60);

	const posLabel =
		(track.disc || 1) > 1 ? `Disc ${track.disc}, Track ${track.track}` : `Track ${track.track}`;
	const description = isIndexableRecording
		? truncateMeta(
				`Play a free sample of ${displayTitle} (${posLabel} on ${album.title}) by ${album.artist}, read lyrics & ${album.year} lore, and stream in lossless HD.`,
				155
			)
		: truncateMeta(
				`Explore ${displayTitle} (${posLabel} on ${album.title}) by ${album.artist}: ${album.year} story setlist notes and official Engine Room Records links.`,
				155
			);
	const releaseDate = ensureRealWorldDate(album.datePublished);

	return {
		canonicalUrl,
		displayTitle,
		title,
		ogTitle,
		description,
		releaseDate,
		durationSeconds,
		isIndexableRecording
	};
}

/**
 * Serializes a JSON-LD object safely for injection into `<svelte:head>`.
 *
 * @param {Record<string, any>} payload
 * @returns {string}
 */
export function serializeJsonLd(payload) {
	const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${safeJson}</` + 'script>';
}

/**
 * Builds a Schema.org `BreadcrumbList` node for inclusion in `@graph`.
 *
 * @param {string} pageUrl
 * @param {Array<{ name: string, url: string }>} crumbs
 */
export function createBreadcrumbNode(pageUrl, crumbs) {
	return {
		'@type': 'BreadcrumbList',
		'@id': `${pageUrl}#breadcrumb`,
		itemListElement: crumbs.map((crumb, idx) => ({
			'@type': 'ListItem',
			position: idx + 1,
			name: crumb.name,
			item: crumb.url
		}))
	};
}

/**
 * Builds a standalone serialized `BreadcrumbList` JSON-LD `<script>` tag for
 * editorial/collection routes (`/discography`, `/playlists`, `/radio`, etc.).
 * Accepts either `(pageUrl, crumbs)` or `(crumbs)` directly.
 *
 * @param {string | Array<{ name: string, url: string }>} pageUrlOrCrumbs
 * @param {Array<{ name: string, url: string }>} [maybeCrumbs]
 * @returns {string}
 */
export function buildBreadcrumbJsonLdScript(pageUrlOrCrumbs, maybeCrumbs) {
	const crumbs = Array.isArray(pageUrlOrCrumbs) ? pageUrlOrCrumbs : maybeCrumbs || [];
	const pageUrl =
		typeof pageUrlOrCrumbs === 'string'
			? pageUrlOrCrumbs
			: crumbs[crumbs.length - 1]?.url || `${SITE_ORIGIN}/`;
	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [createBreadcrumbNode(pageUrl, crumbs)]
	});
}

/**
 * Builds the complete `@graph` JSON-LD script for an Artist Hub (`/[artist]`).
 *
 * @param {import('#lib/data/musicData.js').ArtistSummary} artist
 * @param {import('#lib/data/musicData.js').Album[]} artistAlbums
 * @returns {string}
 */
export function buildArtistJsonLdScript(artist, artistAlbums) {
	const pageUrl = `${SITE_ORIGIN}/${artist.slug}`;
	const sameAs = buildDspSameAs(artist, 'artist');

	const musicGroup = {
		'@type': 'MusicGroup',
		'@id': `${pageUrl}#artist`,
		name: artist.name,
		url: pageUrl,
		image: artist.socialPreview || artist.logo || `${SITE_ORIGIN}/og-image.jpg`,
		...(artist.logo ? { logo: artist.logo } : {}),
		description: `Original music catalog by Michael P. Ragsdale (Engine Room Records) performed in-universe by the fictional band ${artist.name}. ${artist.description}`,
		disambiguatingDescription: `${artist.name} is a fictional band in the RaggieSoft narrative universe. All real-world compositions, sound recordings, and lyrics are created by Michael P. Ragsdale and published under Engine Room Records.`,
		genre: artist.genres,
		creator: { '@id': PERSON_ID },
		recordLabel: { '@id': ORG_ID },
		isPartOf: { '@id': WEBSITE_ID },
		...(sameAs.length > 0 ? { sameAs } : {}),
		album: artistAlbums.map((a) => ({
			'@type': 'MusicAlbum',
			'@id': `${SITE_ORIGIN}/${a.artistSlug}/${a.slug}#album`,
			name: a.title,
			url: `${SITE_ORIGIN}/${a.artistSlug}/${a.slug}`,
			image: a.artwork,
			datePublished: ensureRealWorldDate(a.datePublished),
			...(a.temporalCoverage || a.year ? { temporalCoverage: a.temporalCoverage || a.year } : {}),
			numTracks: a.totalTracksCount
		}))
	};

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'Home', url: `${SITE_ORIGIN}/` },
		{ name: 'Discography', url: `${SITE_ORIGIN}/discography` },
		{ name: artist.name, url: pageUrl }
	]);

	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [musicGroup, breadcrumb]
	});
}

/**
 * Builds the complete `@graph` JSON-LD script for an Album page (`/[artist]/[album]`).
 *
 * @param {import('#lib/data/musicData.js').Album} album
 * @returns {string}
 */
export function buildAlbumJsonLdScript(album) {
	const artistUrl = `${SITE_ORIGIN}/${album.artistSlug}`;
	const pageUrl = `${artistUrl}/${album.slug}`;
	const realReleaseDate = ensureRealWorldDate(album.datePublished);
	const realYear = parseInt(realReleaseDate.slice(0, 4), 10) || 2026;
	const sameAs = buildDspSameAs(album, 'album');
	const listenAction = buildDspListenAction(album);
	const seriesTitle = album.rockOperaSetId ? rockOperaSeriesTitles[album.rockOperaSetId] || '' : '';
	const cleanAlbumDesc = stripPlainText(album.description);

	const recordedTracks = (album.tracks || []).filter((t) => t.isPlayable || Boolean(t.isrc));

	const musicAlbum = {
		'@type': 'MusicAlbum',
		'@id': `${pageUrl}#album`,
		name: album.title,
		url: pageUrl,
		image: album.artwork,
		description: `Original ${realYear} ${album.genre} release written and produced by Michael P. Ragsdale under Engine Room Records (${album.year} story setting for ${album.artist}). Free 128 kbps song samples available on The Listening Room with full high-resolution streaming on official music platforms. ${cleanAlbumDesc}`.trim(),
		disambiguatingDescription: `Original ${realYear} Engine Room Records release by Michael P. Ragsdale; the ${album.year} narrative date, ${album.artist} band lore, and any in-universe record label references (such as Apex Records or OmniCorp) belong to the fictional RaggieSoft story universe.`,
		genre: album.genre,
		inLanguage: 'en-US',
		...(album.upc
			? {
					identifier: {
						'@type': 'PropertyValue',
						propertyID: 'UPC',
						value: String(album.upc).trim()
					}
				}
			: {}),
		albumProductionType:
			album.albumType === 'live'
				? 'https://schema.org/LiveAlbum'
				: album.albumType === 'compilation'
					? 'https://schema.org/CompilationAlbum'
					: album.albumType === 'soundtrack'
						? 'https://schema.org/SoundtrackAlbum'
						: 'https://schema.org/StudioAlbum',
		albumReleaseType: 'https://schema.org/AlbumRelease',
		byArtist: {
			'@type': 'MusicGroup',
			'@id': `${artistUrl}#artist`,
			name: album.artist,
			url: artistUrl
		},
		numTracks: album.totalTracksCount,
		datePublished: realReleaseDate,
		...(album.temporalCoverage || album.year
			? { temporalCoverage: album.temporalCoverage || album.year }
			: {}),
		recordLabel: { '@id': ORG_ID },
		creator: { '@id': PERSON_ID },
		copyrightHolder: { '@id': PERSON_ID },
		copyrightYear: realYear,
		isPartOf: seriesTitle
			? [
					{ '@id': WEBSITE_ID },
					{
						'@type': 'CreativeWorkSeries',
						'@id': `${artistUrl}#series-${album.rockOperaSetId}`,
						name: seriesTitle
					}
				]
			: { '@id': WEBSITE_ID },
		...(sameAs.length > 0 ? { sameAs } : {}),
		...(listenAction ? { potentialAction: listenAction } : {}),
		...(recordedTracks.length > 0
			? {
					track: recordedTracks.map((t, idx) => {
						const isoDur = formatIsoDuration(t.duration);
						const tSlug = t.slug || t.fileName || t.id;
						const tUrl = `${pageUrl}/${tSlug}`;
						const cleanIsrc = String(t.isrc || '')
							.trim()
							.toUpperCase();
						const primaryMaster = cleanIsrc ? primaryRecordingByIsrcMap.get(cleanIsrc) : null;
						const recordingId = primaryMaster ? primaryMaster.recordingId : `${tUrl}#recording`;

						return {
							'@type': 'MusicRecording',
							'@id': recordingId,
							name: getTrackDisplayTitle(t),
							url: primaryMaster ? primaryMaster.pageUrl : tUrl,
							position: album.tracks.some((x) => (x.disc || 1) > 1) ? idx + 1 : t.track,
							...(isoDur ? { duration: isoDur } : {}),
							...(t.isrc ? { isrcCode: t.isrc } : {}),
							publisher: { '@id': ORG_ID },
							datePublished: realReleaseDate
						};
					})
				}
			: {})
	};

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'Home', url: `${SITE_ORIGIN}/` },
		{ name: 'Discography', url: `${SITE_ORIGIN}/discography` },
		{ name: album.artist, url: artistUrl },
		{ name: album.title, url: pageUrl }
	]);

	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [musicAlbum, breadcrumb]
	});
}

/**
 * Builds the complete `@graph` JSON-LD script for a Canonical Track page
 * (`/[artist]/[album]/[track]`).
 *
 * - For recorded or ISRC-assigned tracks: emits a complete, validator-clean
 *   `MusicRecording` linked via `recordingOf` to its canonical `MusicComposition`,
 *   with album-only `inAlbum.sameAs`, track-only `MusicRecording.sameAs`,
 *   `publisher` (never `recordLabel` on `MusicRecording`), safe UPC `PropertyValue`,
 *   non-truncated dual-timeline `description` + `disambiguatingDescription`,
 *   `AudioObject` sample metadata, `ListenAction` DSP handoff, and 5-step `BreadcrumbList`.
 * - For unrecorded setlist stub pages (`!track.isPlayable && !track.isrc`):
 *   omits `MusicRecording` completely so search engines are never told a sound
 *   recording exists when none has been released yet.
 *
 * @param {import('#lib/data/musicData.js').Track} track
 * @param {import('#lib/data/musicData.js').Album} album
 * @returns {string}
 */
export function buildTrackJsonLdScript(track, album) {
	const artistUrl = `${SITE_ORIGIN}/${album.artistSlug}`;
	const albumUrl = `${artistUrl}/${album.slug}`;
	const trackSlug = track.slug || track.fileName || track.id;
	const pageUrl = `${albumUrl}/${trackSlug}`;
	const displayTitle = getTrackDisplayTitle(track);
	const realReleaseDate = ensureRealWorldDate(album.datePublished);
	const realYear = parseInt(realReleaseDate.slice(0, 4), 10) || 2026;
	const isoDuration = formatIsoDuration(track.duration);

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'Home', url: `${SITE_ORIGIN}/` },
		{ name: 'Discography', url: `${SITE_ORIGIN}/discography` },
		{ name: album.artist, url: artistUrl },
		{ name: album.title, url: albumUrl },
		{ name: displayTitle, url: pageUrl }
	]);

	const { composition, isPrimaryCompositionPage } = resolveCanonicalComposition(track, album);
	const compositionId = composition ? composition.compositionId : `${pageUrl}#composition`;
	const compositionUrl = composition ? composition.compositionUrl : pageUrl;
	const compositionName = composition ? composition.name : displayTitle;

	const cleanLyricsText = stripPlainText(track.lyrics);
	const recordingOfNode = {
		'@type': 'MusicComposition',
		'@id': compositionId,
		name: compositionName,
		url: compositionUrl,
		composer: { '@id': PERSON_ID },
		lyricist: { '@id': PERSON_ID },
		inLanguage: 'en-US',
		...(isPrimaryCompositionPage && cleanLyricsText
			? {
					lyrics: {
						'@type': 'CreativeWork',
						'@id': `${compositionUrl}#lyrics`,
						text: String(track.lyrics || '').trim(),
						inLanguage: 'en-US',
						author: { '@id': PERSON_ID },
						license: 'https://creativecommons.org/licenses/by-sa/4.0/'
					}
				}
			: {})
	};

	// Guard unrecorded lore-only concert/stub pages: NEVER emit a MusicRecording entity
	// when no audio master and no commercial ISRC exist.
	if (!track.isPlayable && !track.isrc) {
		const stubWebPage = {
			'@type': 'WebPage',
			'@id': `${pageUrl}#webpage`,
			url: pageUrl,
			name: `${displayTitle} (${album.title} — ${album.artist})`,
			description: `In-universe story setlist note for "${displayTitle}" on ${album.artist}'s ${album.year} release "${album.title}" in the fictional RaggieSoft literary universe.`,
			inLanguage: 'en-US',
			isPartOf: { '@id': WEBSITE_ID },
			about: recordingOfNode
		};

		return serializeJsonLd({
			'@context': 'https://schema.org',
			'@graph': [stubWebPage, breadcrumb]
		});
	}

	const albumSameAs = buildDspSameAs(album, 'album');
	const trackSameAs = buildDspSameAs(track, 'track', album);
	const listenAction = buildDspListenAction(album);

	const cleanIsrc = String(track.isrc || '')
		.trim()
		.toUpperCase();
	const primaryMaster = cleanIsrc ? primaryRecordingByIsrcMap.get(cleanIsrc) : null;
	const isSharedAnthologyMaster = Boolean(
		primaryMaster && primaryMaster.albumSlug !== album.slug
	);

	const currentInAlbum = {
		'@type': 'MusicAlbum',
		'@id': `${albumUrl}#album`,
		name: album.title,
		url: albumUrl,
		numTracks: album.totalTracksCount,
		recordLabel: { '@id': ORG_ID },
		...(album.upc
			? {
					identifier: {
						'@type': 'PropertyValue',
						propertyID: 'UPC',
						value: String(album.upc).trim()
					}
				}
			: {}),
		...(albumSameAs.length > 0 ? { sameAs: albumSameAs } : {})
	};

	const inAlbumValue =
		isSharedAnthologyMaster && primaryMaster
			? [
					currentInAlbum,
					{
						'@type': 'MusicAlbum',
						'@id': primaryMaster.albumId,
						name: primaryMaster.albumTitle,
						url: primaryMaster.albumUrl,
						numTracks: primaryMaster.numTracks,
						recordLabel: { '@id': ORG_ID }
					}
				]
			: currentInAlbum;

	const positionValue = (track.disc || 1) > 1 ? `${track.disc}.${track.track}` : track.track;
	const albumTypeWord =
		album.albumType === 'live'
			? 'live album'
			: album.albumType === 'compilation'
				? 'anthology'
				: album.albumType === 'soundtrack'
					? 'soundtrack'
					: 'album';
	const fullLoreSummary = stripPlainText(track.loreNote);
	const groundedLead = `Original ${realYear} ${album.genre} sound recording written and produced by Michael P. Ragsdale (Engine Room Records), set in-universe on ${album.artist}'s ${album.year} ${albumTypeWord} "${album.title}". Free 128 kbps reference preview available on The Listening Room with full high-resolution streaming on official music platforms.`;
	const fullDescription = fullLoreSummary
		? `${groundedLead} Story context: ${fullLoreSummary}`
		: groundedLead;

	const musicRecording = {
		'@type': 'MusicRecording',
		'@id':
			isSharedAnthologyMaster && primaryMaster ? primaryMaster.recordingId : `${pageUrl}#recording`,
		name: displayTitle,
		url: isSharedAnthologyMaster && primaryMaster ? primaryMaster.pageUrl : pageUrl,
		...(isSharedAnthologyMaster ? { mainEntityOfPage: pageUrl } : {}),
		image: album.artwork,
		...(isoDuration ? { duration: isoDuration } : {}),
		position: positionValue,
		...(track.isrc ? { isrcCode: track.isrc } : {}),
		datePublished: realReleaseDate,
		...(album.temporalCoverage || album.year
			? { temporalCoverage: album.temporalCoverage || album.year }
			: {}),
		genre: album.genre,
		inLanguage: 'en-US',
		publisher: { '@id': ORG_ID },
		creator: { '@id': PERSON_ID },
		copyrightHolder: { '@id': PERSON_ID },
		copyrightYear: realYear,
		license: 'https://creativecommons.org/licenses/by-sa/4.0/',
		disambiguatingDescription: `Original ${realYear} sound recording produced and owned by Michael P. Ragsdale under Engine Room Records; the ${album.year} release date, ${album.artist} band lore, and any in-universe label references (such as Apex Records or OmniCorp) belong to the fictional RaggieSoft story universe.`,
		description: fullDescription,
		byArtist: {
			'@type': 'MusicGroup',
			'@id': `${artistUrl}#artist`,
			name: album.artist,
			url: artistUrl
		},
		inAlbum: inAlbumValue,
		recordingOf: recordingOfNode,
		...(track.isPlayable && track.audioUrl
			? {
					audio: {
						'@type': 'AudioObject',
						name: `${displayTitle} (Free 128 kbps Discovery Sample)`,
						contentUrl: track.audioUrl,
						encodingFormat: 'audio/mpeg',
						bitrate: '128kbps',
						...(isoDuration ? { duration: isoDuration } : {}),
						uploadDate: realReleaseDate,
						isAccessibleForFree: true,
						description: `Free 128 kbps reference preview sample of ${displayTitle} by ${album.artist} on The Listening Room`
					}
				}
			: {}),
		...(listenAction ? { potentialAction: listenAction } : {}),
		...(trackSameAs.length > 0 ? { sameAs: trackSameAs } : {}),
		isPartOf: { '@id': WEBSITE_ID }
	};

	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [musicRecording, breadcrumb]
	});
}

/**
 * Builds the complete `@graph` JSON-LD script for a Curated Story Playlist
 * (`/playlists/[slug]`).
 *
 * @param {Record<string, any>} playlist
 * @param {Array<Record<string, any>>} [resolvedTracks]
 * @returns {string}
 */
export function buildPlaylistJsonLdScript(playlist, resolvedTracks = playlist?.tracks || []) {
	const pageUrl = `${SITE_ORIGIN}/playlists/${playlist.slug}`;
	const musicPlaylist = {
		'@type': 'MusicPlaylist',
		'@id': `${pageUrl}#playlist`,
		name: playlist.title,
		url: pageUrl,
		description: playlist.description,
		numTracks: resolvedTracks.length,
		datePublished: '2026-04-01',
		inLanguage: 'en-US',
		creator: { '@id': PERSON_ID },
		publisher: { '@id': ORG_ID },
		isPartOf: { '@id': WEBSITE_ID },
		track: resolvedTracks.map((t, idx) => {
			const isoDur = formatIsoDuration(t.duration);
			const tSlug = t.slug || t.fileName || t.id;
			const cleanIsrc = String(t.isrc || '')
				.trim()
				.toUpperCase();
			const primaryMaster = cleanIsrc ? primaryRecordingByIsrcMap.get(cleanIsrc) : null;
			const trackUrl =
				primaryMaster?.pageUrl ||
				(t.artistSlug && t.albumSlug && tSlug
					? `${SITE_ORIGIN}/${t.artistSlug}/${t.albumSlug}/${tSlug}`
					: undefined);
			const recordingId =
				primaryMaster?.recordingId || (trackUrl ? `${trackUrl}#recording` : undefined);
			return {
				'@type': 'MusicRecording',
				...(recordingId ? { '@id': recordingId } : {}),
				...(trackUrl ? { url: trackUrl } : {}),
				position: idx + 1,
				name: t.title,
				byArtist: {
					'@type': 'MusicGroup',
					...(t.artistSlug
						? {
								'@id': `${SITE_ORIGIN}/${t.artistSlug}#artist`,
								url: `${SITE_ORIGIN}/${t.artistSlug}`
							}
						: {}),
					name: t.artist
				},
				inAlbum: {
					'@type': 'MusicAlbum',
					...(t.artistSlug && t.albumSlug
						? {
								'@id': `${SITE_ORIGIN}/${t.artistSlug}/${t.albumSlug}#album`,
								url: `${SITE_ORIGIN}/${t.artistSlug}/${t.albumSlug}`
							}
						: {}),
					name: t.album
				},
				...(t.isrc ? { isrcCode: t.isrc } : {}),
				...(isoDur ? { duration: isoDur } : {})
			};
		})
	};

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'Home', url: `${SITE_ORIGIN}/` },
		{ name: 'Playlists', url: `${SITE_ORIGIN}/playlists` },
		{ name: playlist.title, url: pageUrl }
	]);

	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [musicPlaylist, breadcrumb]
	});
}
