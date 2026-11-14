/**
 * @license MIT
 * ============================================================================
 * src/lib/seo.js
 * ============================================================================
 * Canonical Search Engine Optimization (SEO), Metadata & Schema.org JSON-LD
 * Entity Graph Engine for The Listening Room (`https://music.raggiesoft.com`).
 *
 * Architectural Guarantees:
 * 1. Stable Cross-Site Entity `@id`s:
 *    - WebSite:      `https://music.raggiesoft.com/#website`
 *    - Organization: `https://engineroom-records.com/#organization`
 *    - Parent Org:   `https://raggiesoft.com/#organization`
 *    - Person:       `https://michaelpragsdale.com/#person`
 *    - WebApp:       `https://music.raggiesoft.com/#webapp`
 *    - Artist:       `https://music.raggiesoft.com/[artist]#artist`
 *    - Album:        `https://music.raggiesoft.com/[artist]/[album]#album`
 *    - Track:        `https://music.raggiesoft.com/[artist]/[album]/[track]#recording`
 * 2. Strict Dual-Chronology Separation:
 *    - `datePublished` (and OpenGraph `music:release_date`) is ALWAYS the
 *      real-world publication date (`>= 2026`), NEVER an in-universe year.
 *    - `temporalCoverage` holds the fictional/in-universe narrative date.
 * 3. Guaranteed Unique `<title>` & `<meta name="description">` Across All Pages:
 *    - Automatically disambiguates tracks whose song titles appear on multiple
 *      albums (e.g., studio originals vs. live albums, compilations, and
 *      alternate language/version recordings) while keeping OpenGraph/Twitter
 *      titles concise (`<= 60` chars) and meta descriptions `<= 155` chars.
 * 4. Valid ISO 8601 Durations (`PT5M8S`) & Crawlable `BreadcrumbList` Schemas:
 *    - Converts `"mm:ss"` / `"hh:mm:ss"` track durations into Schema.org
 *      ISO 8601 `Duration` strings and omits unrendered `"In Studio"` values.
 * ============================================================================
 */

import { allAlbums, rockOperaSeriesTitles } from '#lib/data/musicData.js';

export const SITE_ORIGIN = 'https://music.raggiesoft.com';
export const WEBSITE_ID = 'https://music.raggiesoft.com/#website';
export const ORG_ID = 'https://engineroom-records.com/#organization';
export const RAGGIESOFT_ORG_ID = 'https://raggiesoft.com/#organization';
export const PERSON_ID = 'https://michaelpragsdale.com/#person';
export const WEBAPP_ID = 'https://music.raggiesoft.com/#webapp';

/**
 * Truncates text cleanly on a word boundary to stay within `maxLen` characters.
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
 * Strips HTML tags and normalizes whitespace from compiled prose snippets.
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
 * Collects all public external DSP, Fourthwall storefront, ISRC registry, and
 * canonical lore URLs for a given Artist, Album, or Track entity for `sameAs`.
 *
 * @param {Record<string, any>} item
 * @param {'artist' | 'album' | 'track'} [entityType='album']
 * @returns {string[]}
 */
export function buildDspSameAs(item, entityType = 'album') {
	if (!item) return [];
	/** @type {Set<string>} */
	const urls = new Set();

	const isExempt = Boolean(item.dspExempt);
	const targetKind = entityType === 'artist' ? item.dspTargetType || 'artist' : 'album';

	if (!isExempt) {
		const spotifyId = String(item.spotifyId || '').trim();
		const appleId = String(item.appleId || '').trim();
		const amazonId = String(item.amazonId || '').trim();
		const youtubeId = String(item.youtubeId || '').trim();

		if (spotifyId) {
			urls.add(
				targetKind === 'artist'
					? `https://open.spotify.com/artist/${spotifyId}`
					: `https://open.spotify.com/album/${spotifyId}`
			);
		}
		if (appleId) {
			urls.add(
				targetKind === 'artist'
					? `https://music.apple.com/us/artist/${appleId}`
					: `https://music.apple.com/us/album/${appleId}`
			);
		}
		if (amazonId) {
			urls.add(
				targetKind === 'artist'
					? `https://music.amazon.com/artists/${amazonId}`
					: `https://music.amazon.com/albums/${amazonId}`
			);
		}
		if (youtubeId) {
			if (youtubeId.startsWith('UC')) {
				urls.add(`https://music.youtube.com/channel/${youtubeId}`);
			} else if (youtubeId.startsWith('OLAK') || youtubeId.startsWith('PL')) {
				urls.add(`https://music.youtube.com/playlist?list=${youtubeId}`);
			} else if (youtubeId.startsWith('MPRE')) {
				urls.add(`https://music.youtube.com/browse/${youtubeId}`);
			} else {
				urls.add(`https://music.youtube.com/watch?v=${youtubeId}`);
			}
		}
	}

	if (item.storefrontUrl) urls.add(String(item.storefrontUrl).trim());
	if (item.storeStandardUrl) urls.add(String(item.storeStandardUrl).trim());
	if (item.storeAudiophileUrl) urls.add(String(item.storeAudiophileUrl).trim());
	if (entityType === 'artist' && item.loreUrl) urls.add(String(item.loreUrl).trim());
	if (entityType === 'album' && item.loreUrl) urls.add(String(item.loreUrl).trim());
	if (entityType === 'track' && item.isrc) {
		urls.add(
			`https://engineroom.raggiesoft.com/isrc?code=${encodeURIComponent(String(item.isrc).trim())}`
		);
	}

	return Array.from(urls).filter(Boolean);
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
 * Precomputed lookup map identifying the primary (earliest non-compilation)
 * album for every `(artistSlug, displayTitle)` pair so multi-album songs
 * receive disambiguated `<title>` tags on live/compilation/remix appearances.
 * @type {Map<string, { count: number, primaryAlbumSlug: string }>}
 */
const trackTitleCollisionMap = (() => {
	/** @type {Map<string, Array<{ albumSlug: string, isComp: number, sortDate: string }>>} */
	const buckets = new Map();
	for (const album of allAlbums) {
		for (const track of album.tracks || []) {
			const disp = getTrackDisplayTitle(track).toLowerCase();
			const key = `${album.artistSlug}:::${disp}`;
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key)?.push({
				albumSlug: album.slug,
				isComp: album.albumType === 'compilation' ? 1 : 0,
				sortDate: album.temporalCoverage || album.year || '9999'
			});
		}
	}

	/** @type {Map<string, { count: number, primaryAlbumSlug: string }>} */
	const out = new Map();
	for (const [key, list] of buckets.entries()) {
		list.sort((a, b) => {
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
 * Builds canonical SEO metadata (`title`, `ogTitle`, `description`, `canonicalUrl`)
 * for an Artist Hub route (`/[artist]`).
 *
 * @param {import('#lib/data/musicData.js').ArtistSummary} artist
 */
export function buildArtistSeoMeta(artist) {
	const canonicalUrl = `${SITE_ORIGIN}/${artist.slug}`;
	const title = `${artist.name}: Albums, Songs & Lore | The Listening Room`;
	const ogTitle = truncateMeta(`${artist.name} — Albums, Songs & Lore`, 60);
	const description = truncateMeta(
		`Explore ${artist.name}: ${artist.albumCount} ${artist.albumCount === 1 ? 'release' : 'releases'}, ${artist.trackCount} songs, lyrics, lore, free 128 kbps previews & official Engine Room Records streams.`,
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
	const title = `${album.title} by ${album.artist}: Lyrics, Lore & Preview`;
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
		`Explore ${album.title}, the fictional ${album.year} ${typeWord} by ${album.artist} (${realYear} DSP release). Preview ${album.totalTracksCount} songs, lyrics & lore.`,
		155
	);
	const releaseDate = ensureRealWorldDate(album.datePublished);
	return { canonicalUrl, title, ogTitle, description, releaseDate };
}

/**
 * Builds canonical SEO metadata (`title`, `ogTitle`, `description`, `canonicalUrl`,
 * `releaseDate`) for a Canonical Track route (`/[artist]/[album]/[track]`).
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

	const title = `${qualifiedTitle} by ${album.artist}: Lyrics, Lore & Stream`;
	const ogTitle = truncateMeta(`${qualifiedTitle} — ${album.artist}`, 60);

	const posLabel =
		(track.disc || 1) > 1 ? `Disc ${track.disc}, Track ${track.track}` : `Track ${track.track}`;
	const actionVerb = track.isPlayable ? 'Preview' : 'Explore';
	const description = truncateMeta(
		`${actionVerb} ${displayTitle} (${posLabel} on ${album.title}) by ${album.artist}: lyrics, ${album.year} story lore & 2026 official streams.`,
		155
	);
	const releaseDate = ensureRealWorldDate(album.datePublished);

	return {
		canonicalUrl,
		displayTitle,
		title,
		ogTitle,
		description,
		releaseDate
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
 * Models the fictional band as a `MusicGroup` with explicit fictional-universe
 * provenance (`disambiguatingDescription`), real creator (`Michael P. Ragsdale`),
 * real label (`Engine Room Records`), real `datePublished`, and `BreadcrumbList`.
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
		description: artist.description,
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
		{ name: 'The Listening Room', url: `${SITE_ORIGIN}/` },
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
	const seriesTitle = album.rockOperaSetId ? rockOperaSeriesTitles[album.rockOperaSetId] || '' : '';

	const musicAlbum = {
		'@type': 'MusicAlbum',
		'@id': `${pageUrl}#album`,
		name: album.title,
		url: pageUrl,
		image: album.artwork,
		description: album.description,
		genre: album.genre,
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
		track: album.tracks.map((t, idx) => {
			const isoDur = formatIsoDuration(t.duration);
			const tSlug = t.slug || t.fileName || t.id;
			const tUrl = `${pageUrl}/${tSlug}`;
			return {
				'@type': 'MusicRecording',
				'@id': `${tUrl}#recording`,
				name: getTrackDisplayTitle(t),
				url: tUrl,
				position: album.tracks.some((x) => (x.disc || 1) > 1) ? idx + 1 : t.track,
				...(isoDur ? { duration: isoDur } : {}),
				...(t.isrc ? { isrcCode: t.isrc } : {}),
				datePublished: realReleaseDate
			};
		})
	};

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'The Listening Room', url: `${SITE_ORIGIN}/` },
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

	const sameAs = Array.from(
		new Set([...buildDspSameAs(album, 'album'), ...buildDspSameAs(track, 'track')])
	);

	const positionValue = (track.disc || 1) > 1 ? `${track.disc}.${track.track}` : track.track;

	const musicRecording = {
		'@type': 'MusicRecording',
		'@id': `${pageUrl}#recording`,
		name: displayTitle,
		url: pageUrl,
		image: album.artwork,
		...(isoDuration ? { duration: isoDuration } : {}),
		position: positionValue,
		inAlbum: {
			'@type': 'MusicAlbum',
			'@id': `${albumUrl}#album`,
			name: album.title,
			url: albumUrl,
			numTracks: album.totalTracksCount
		},
		byArtist: {
			'@type': 'MusicGroup',
			'@id': `${artistUrl}#artist`,
			name: album.artist,
			url: artistUrl
		},
		datePublished: realReleaseDate,
		...(album.temporalCoverage || album.year
			? { temporalCoverage: album.temporalCoverage || album.year }
			: {}),
		...(track.isrc ? { isrcCode: track.isrc } : {}),
		genre: album.genre,
		recordLabel: { '@id': ORG_ID },
		creator: { '@id': PERSON_ID },
		copyrightHolder: { '@id': PERSON_ID },
		copyrightYear: realYear,
		license: 'https://creativecommons.org/licenses/by-sa/4.0/',
		...(track.loreNote ? { description: truncateMeta(stripPlainText(track.loreNote), 260) } : {}),
		...(track.isPlayable && track.audioUrl
			? {
					audio: {
						'@type': 'AudioObject',
						contentUrl: track.audioUrl,
						encodingFormat: 'audio/mpeg',
						bitrate: '128kbps',
						description: `Free 128 kbps reference preview stream of ${displayTitle} by ${album.artist}`
					}
				}
			: {}),
		...(sameAs.length > 0 ? { sameAs } : {}),
		isPartOf: { '@id': WEBSITE_ID }
	};

	const breadcrumb = createBreadcrumbNode(pageUrl, [
		{ name: 'The Listening Room', url: `${SITE_ORIGIN}/` },
		{ name: album.artist, url: artistUrl },
		{ name: album.title, url: albumUrl },
		{ name: displayTitle, url: pageUrl }
	]);

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
		creator: { '@id': PERSON_ID },
		publisher: { '@id': ORG_ID },
		isPartOf: { '@id': WEBSITE_ID },
		track: resolvedTracks.map((t, idx) => {
			const isoDur = formatIsoDuration(t.duration);
			const tSlug = t.slug || t.fileName || t.id;
			const trackUrl =
				t.artistSlug && t.albumSlug && tSlug
					? `${SITE_ORIGIN}/${t.artistSlug}/${t.albumSlug}/${tSlug}`
					: undefined;
			return {
				'@type': 'MusicRecording',
				...(trackUrl ? { '@id': `${trackUrl}#recording`, url: trackUrl } : {}),
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
		{ name: 'The Listening Room', url: `${SITE_ORIGIN}/` },
		{ name: 'Playlists', url: `${SITE_ORIGIN}/playlists` },
		{ name: playlist.title, url: pageUrl }
	]);

	return serializeJsonLd({
		'@context': 'https://schema.org',
		'@graph': [musicPlaylist, breadcrumb]
	});
}
