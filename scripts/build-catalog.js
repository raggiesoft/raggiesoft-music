/**
 * @license MIT
 * ============================================================================
 * build-catalog.js
 * ============================================================================
 * Automated Discovery & Compilation Engine for Engine Room Records Catalog.
 *
 * Architecture & Design Decisions:
 * 1. Single Source of Truth: Scans `raggiesoft-assets/engine-room-records/artists`
 *    directly, eliminating tedious manual duplication of track/album metadata.
 * 2. Multi-Format Ingestion: Parses `album.json` (Schema.org), `tracks.json`,
 *    `albums.json` (eras/DSPs), and `metadata.json` (canonical lore & lyrics).
 * 3. CDN Audio Resolution: Formats progressive streaming endpoints mapped to
 *    `https://assets.raggiesoft.com/engine-room-records/artists/.../web-mp3/...`.
 * 4. Dual Target Output: Emits both a local bundled JSON file
 *    (`src/lib/data/musicCatalog.json`) for zero-latency offline PWA functionality,
 *    and a public CDN manifest (`catalog.json` in assets) for dynamic client sync.
 * 5. Canonical Track Slugs & Dual-Chronology Guardrails:
 *    - Generates collision-free URL slugs (`track.slug`) for all 501+ catalog songs
 *      so every track resolves to a static pre-rendered HTML route
 *      (`/[artist]/[album]/[track]`).
 *    - Enforces a strict real-world publication date guardrail (`year >= 2026`) on
 *      `datePublished`, guaranteeing fictional narrative dates (`temporalCoverage`)
 *      are never emitted as real-world phonogram release dates.
 * 6. Truthful `<lastmod>` & Multi-File XML Sitemap Hierarchy:
 *    - Computes truthful `YYYY-MM-DD` modification timestamps directly from physical
 *      source asset `mtime`s (`album.json`, `tracks.json`, `lyrics/*.md`, `*.vtt`)
 *      and generates `/sitemap.xml` + `/sitemaps/{editorial,artists,albums,tracks,playlists}.xml`.
 * ============================================================================
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base CDN domain for all hosted audio streams and album artwork
const CDN_BASE = 'https://assets.raggiesoft.com/engine-room-records/artists';
const HUB_BASE = 'https://raggiesoft.com';
const SITE_ORIGIN = 'https://music.raggiesoft.com';

/**
 * Converts an arbitrary string into a clean lowercase URL slug.
 * @param {string} raw
 * @returns {string}
 */
function toUrlSlug(raw) {
	return String(raw || '')
		.toLowerCase()
		.trim()
		.replace(/[’‘']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Derives a deterministic, human-readable canonical track slug from `fileName`
 * (stripping leading disc-track prefixes like `1-08-` or `08-`) with a fallback
 * to `title` + `version`, and disambiguates any within-album collision.
 *
 * @param {string} fileName
 * @param {string} title
 * @param {string} version
 * @param {number} discNum
 * @param {number} trackNum
 * @param {Set<string>} seenSlugs
 * @returns {string}
 */
function buildCanonicalTrackSlug(fileName, title, version, discNum, trackNum, seenSlugs) {
	let base = '';
	if (fileName) {
		const stripped = String(fileName)
			.replace(/\.mp3$/i, '')
			.replace(/^\d+-\d+-/, '')
			.replace(/^\d+-/, '');
		base = toUrlSlug(stripped);
	}
	if (!base) {
		base = toUrlSlug(version ? `${title}-${version}` : title);
	}
	if (!base) {
		base = `track-${discNum}-${trackNum}`;
	}

	let candidate = base;
	if (seenSlugs.has(candidate)) {
		const versionSlug = toUrlSlug(version);
		if (versionSlug && !candidate.endsWith(versionSlug)) {
			candidate = `${base}-${versionSlug}`;
		}
	}
	if (seenSlugs.has(candidate)) {
		candidate =
			discNum > 1 ? `${base}-disc-${discNum}-track-${trackNum}` : `${base}-track-${trackNum}`;
	}
	seenSlugs.add(candidate);
	return candidate;
}

/**
 * Computes the latest `YYYY-MM-DD` modification date across a set of candidate
 * file paths on disk. Never manufactures daily timestamps for unchanged files.
 *
 * @param {Array<string | null | undefined>} filePaths
 * @param {string} [fallbackDate='2026-04-01']
 * @returns {string}
 */
function getLatestMtimeDate(filePaths, fallbackDate = '2026-04-01') {
	let maxMs = 0;
	for (const p of filePaths) {
		if (!p) continue;
		try {
			if (fs.existsSync(p)) {
				const stat = fs.statSync(p);
				if (stat.mtimeMs > maxMs) {
					maxMs = stat.mtimeMs;
				}
			}
		} catch {
			// Ignore stat errors on optional files
		}
	}
	if (maxMs <= 0) return fallbackDate;
	return new Date(maxMs).toISOString().slice(0, 10);
}

/**
 * Validates whether a candidate date string represents a genuine real-world
 * Engine Room Records publication date (`year >= 2026`), rejecting all
 * in-universe narrative dates (`1978`–`2017`, etc.).
 *
 * @param {unknown} candidate
 * @returns {string} Clean ISO date string if valid real-world date, else `""`.
 */
function parseValidRealWorldReleaseDate(candidate) {
	const raw = String(candidate || '').trim();
	if (!raw) return '';
	const match = /^(\d{4})(?:-\d{2}(?:-\d{2})?)?$/.exec(raw);
	if (!match) return '';
	const yearNum = parseInt(match[1], 10);
	if (yearNum < 2026) return '';
	return raw;
}

/**
 * Resolves a guaranteed real-world `datePublished` (`>= 2026`) for an album.
 * Checks explicit `albumData` and `albums.json` fields first, then falls back
 * to the physical `album.json` / `tracks.json` modification date (clamped to
 * `>= 2026-03-29`), ensuring fictional dates are NEVER emitted as `datePublished`.
 *
 * @param {Record<string, any>} albumData
 * @param {Record<string, any>} matchedManifestAlbum
 * @param {string[]} fallbackFiles
 * @returns {string}
 */
function resolveRealWorldDatePublished(albumData, matchedManifestAlbum, fallbackFiles) {
	const candidates = [
		albumData?.datePublished,
		albumData?.realReleaseDate,
		matchedManifestAlbum?.datePublished,
		matchedManifestAlbum?.realReleaseDate,
		albumData?.albumRelease?.datePublished
	];
	for (const candidate of candidates) {
		const valid = parseValidRealWorldReleaseDate(candidate);
		if (valid) return valid;
	}
	const derivedMtime = getLatestMtimeDate(fallbackFiles, '2026-04-01');
	return derivedMtime < '2026-03-29' ? '2026-04-01' : derivedMtime;
}

/**
 * Escapes special XML characters inside `<loc>` and `<lastmod>` elements.
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Formats an XML `<urlset>` document from an array of `{ loc, lastmod }` entries.
 * @param {Array<{ loc: string, lastmod: string }>} entries
 * @returns {string}
 */
function renderUrlSetXml(entries) {
	const body = entries
		.map(
			(item) =>
				`  <url>\n    <loc>${escapeXml(item.loc)}</loc>\n    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n  </url>`
		)
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * Generates `/static/sitemap.xml` as a single, self-contained `<urlset>` containing
 * all ~552 canonical URLs (`editorial` + `artists` + `albums` + `tracks` + `playlists`)
 * so Google Search Console discovers 100% of pages in a single atomic fetch without
 * `<sitemapindex>` child-fetch queue failures ("Couldn't fetch"), while ALSO keeping
 * `/static/sitemaps/{editorial,artists,albums,tracks,playlists}.xml` generated for
 * category diagnostics and `sarah-deploy.sh` IndexNow pings.
 *
 * Excludes non-indexable utility routes (`/settings`, `/studio`, `/404`),
 * query-string search URLs, API endpoints, and raw audio files.
 *
 * @param {Array<any>} catalog
 */
function writeXmlSitemaps(catalog) {
	const projectRoot = path.resolve(__dirname, '..');
	const staticDir = path.join(projectRoot, 'static');
	const sitemapsDir = path.join(staticDir, 'sitemaps');
	fs.mkdirSync(sitemapsDir, { recursive: true });

	// 1. Artists Sitemap (`/sitemaps/artists.xml`)
	/** @type {Map<string, string>} */
	const artistLastmodMap = new Map();
	for (const album of catalog) {
		const prev = artistLastmodMap.get(album.artistSlug) || '';
		const candidate = album.lastmod || album.datePublished || '2026-04-01';
		if (candidate > prev) {
			artistLastmodMap.set(album.artistSlug, candidate);
		}
	}
	const artistRouteFile = path.join(projectRoot, 'src/routes/[artist]/+page.svelte');
	const artistTemplateLastmod = getLatestMtimeDate([artistRouteFile], '2026-04-01');

	const artistEntries = Array.from(artistLastmodMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([artistSlug, catMod]) => ({
			loc: `${SITE_ORIGIN}/${artistSlug}`,
			lastmod: catMod > artistTemplateLastmod ? catMod : artistTemplateLastmod
		}));

	// 2. Albums Sitemap (`/sitemaps/albums.xml`)
	const albumRouteFile = path.join(projectRoot, 'src/routes/[artist]/[album]/+page.svelte');
	const albumTemplateLastmod = getLatestMtimeDate([albumRouteFile], '2026-04-01');
	const albumEntries = [...catalog]
		.sort((a, b) => `${a.artistSlug}/${a.slug}`.localeCompare(`${b.artistSlug}/${b.slug}`))
		.map((album) => {
			const baseMod = album.lastmod || album.datePublished || '2026-04-01';
			return {
				loc: `${SITE_ORIGIN}/${album.artistSlug}/${album.slug}`,
				lastmod: baseMod > albumTemplateLastmod ? baseMod : albumTemplateLastmod
			};
		});

	// 3. Tracks Sitemap (`/sitemaps/tracks.xml`)
	const trackRouteFile = path.join(projectRoot, 'src/routes/[artist]/[album]/[track]/+page.svelte');
	const trackTemplateLastmod = getLatestMtimeDate([trackRouteFile], '2026-04-01');
	/** @type {Array<{ loc: string, lastmod: string }>} */
	const trackEntries = [];
	for (const album of catalog) {
		for (const track of album.tracks || []) {
			if (!track.slug) continue;
			const baseMod = track.lastmod || album.lastmod || album.datePublished || '2026-04-01';
			trackEntries.push({
				loc: `${SITE_ORIGIN}/${album.artistSlug}/${album.slug}/${track.slug}`,
				lastmod: baseMod > trackTemplateLastmod ? baseMod : trackTemplateLastmod
			});
		}
	}
	trackEntries.sort((a, b) => a.loc.localeCompare(b.loc));

	// 4. Playlists Sitemap (`/sitemaps/playlists.xml`)
	const playlistsSourceFile = path.join(projectRoot, 'src/lib/playlists.svelte.js');
	const playlistRouteFile = path.join(projectRoot, 'src/routes/playlists/[slug]/+page.svelte');
	const playlistLastmod = getLatestMtimeDate(
		[playlistsSourceFile, playlistRouteFile],
		'2026-04-01'
	);
	/** @type {string[]} */
	const playlistSlugs = [];
	if (fs.existsSync(playlistsSourceFile)) {
		const rawPlaylists = fs.readFileSync(playlistsSourceFile, 'utf-8');
		const slugRegex = /^\s*slug:\s*['"]([^'"]+)['"]/gm;
		let m;
		while ((m = slugRegex.exec(rawPlaylists)) !== null) {
			if (m[1] && !playlistSlugs.includes(m[1])) {
				playlistSlugs.push(m[1]);
			}
		}
	}
	const playlistEntries = playlistSlugs.sort().map((slug) => ({
		loc: `${SITE_ORIGIN}/playlists/${slug}`,
		lastmod: playlistLastmod
	}));

	// 5. Editorial & Hub Sitemap (`/sitemaps/editorial.xml`)
	const maxCatalogLastmod = albumEntries.reduce(
		(acc, item) => (item.lastmod > acc ? item.lastmod : acc),
		'2026-04-01'
	);
	const editorialRoutes = [
		{
			loc: `${SITE_ORIGIN}/`,
			files: [path.join(projectRoot, 'src/routes/+page.svelte')],
			includeCatalogMod: true
		},
		{
			loc: `${SITE_ORIGIN}/discography`,
			files: [path.join(projectRoot, 'src/routes/discography/+page.svelte')],
			includeCatalogMod: true
		},
		{
			loc: `${SITE_ORIGIN}/playlists`,
			files: [path.join(projectRoot, 'src/routes/playlists/+page.svelte'), playlistsSourceFile],
			includeCatalogMod: false
		},
		{
			loc: `${SITE_ORIGIN}/radio`,
			files: [path.join(projectRoot, 'src/routes/radio/+page.svelte')],
			includeCatalogMod: true
		},
		{
			loc: `${SITE_ORIGIN}/behind-the-scenes`,
			files: [path.join(projectRoot, 'src/routes/behind-the-scenes/+page.svelte')],
			includeCatalogMod: false
		},
		{
			loc: `${SITE_ORIGIN}/privacy`,
			files: [path.join(projectRoot, 'src/routes/privacy/+page.svelte')],
			includeCatalogMod: false
		},
		{
			loc: `${SITE_ORIGIN}/terms`,
			files: [path.join(projectRoot, 'src/routes/terms/+page.svelte')],
			includeCatalogMod: false
		}
	];

	const editorialEntries = editorialRoutes.map((route) => {
		const fileMod = getLatestMtimeDate(route.files, '2026-04-01');
		const lastmod =
			route.includeCatalogMod && maxCatalogLastmod > fileMod ? maxCatalogLastmod : fileMod;
		return { loc: route.loc, lastmod };
	});

	const sitemapFiles = [
		{ name: 'editorial.xml', entries: editorialEntries },
		{ name: 'artists.xml', entries: artistEntries },
		{ name: 'albums.xml', entries: albumEntries },
		{ name: 'tracks.xml', entries: trackEntries },
		{ name: 'playlists.xml', entries: playlistEntries }
	];

	for (const sm of sitemapFiles) {
		fs.writeFileSync(path.join(sitemapsDir, sm.name), renderUrlSetXml(sm.entries), 'utf-8');
	}

	// Emit a unified, flat `<urlset>` directly at `/static/sitemap.xml` (well under the
	// 50,000-URL / 50MB Sitemaps protocol ceiling) so Google Search Console discovers all
	// canonical URLs immediately upon reading `/sitemap.xml` without deferred child-sitemap
	// "Couldn't fetch" errors.
	const unifiedEntries = [
		...editorialEntries,
		...artistEntries,
		...albumEntries,
		...trackEntries,
		...playlistEntries
	];
	fs.writeFileSync(path.join(staticDir, 'sitemap.xml'), renderUrlSetXml(unifiedEntries), 'utf-8');

	const totalUrls = unifiedEntries.length;
	console.log(
		`🗺️  Generated unified /sitemap.xml (<urlset>) + 5 category sitemaps (${totalUrls} canonical URLs: ${editorialEntries.length} editorial, ${artistEntries.length} artists, ${albumEntries.length} albums, ${trackEntries.length} tracks, ${playlistEntries.length} playlists).`
	);
}

// Potential candidate paths for the raggiesoft-assets repository
const candidateAssetPaths = [
	path.resolve(__dirname, '../../../../raggiesoft-assets/engine-room-records/artists'),
	path.resolve(__dirname, '../../raggiesoft-assets/engine-room-records/artists'),
	path.resolve(__dirname, '../../../raggiesoft-assets/engine-room-records/artists'),
	'/var/www/raggiesoft-assets/engine-room-records/artists'
];

// Potential candidate paths for the raggiesoft-hub repository (to verify live lore pages)
const candidateHubPaths = [
	path.resolve(__dirname, '../../../www'),
	path.resolve(__dirname, '../../www'),
	path.resolve(__dirname, '../../raggiesoft-hub'),
	path.resolve(__dirname, '../../../raggiesoft-hub'),
	'/var/www/raggiesoft-hub'
];

// Potential candidate paths for stardust-parsedown.php (canonical Markdown parser)
const candidateParsedownPaths = [
	path.resolve(__dirname, '../../../www/includes/classes/stardust-parsedown.php'),
	path.resolve(__dirname, '../../books/includes/classes/stardust-parsedown.php'),
	path.resolve(__dirname, '../../../../raggiesoft.com/www/includes/classes/stardust-parsedown.php'),
	path.resolve(
		__dirname,
		'../../../../raggiesoft.com/subdomains/books/includes/classes/stardust-parsedown.php'
	),
	'/var/www/raggiesoft-hub/includes/classes/stardust-parsedown.php',
	'/var/www/raggiesoft-book-library/includes/classes/stardust-parsedown.php'
];

/**
 * Resolves the canonical `stardust-parsedown.php` file on disk if available.
 * @returns {string | null}
 */
function resolveStardustParsedownPath() {
	for (const candidate of candidateParsedownPaths) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
			return candidate;
		}
	}
	return null;
}

/**
 * Pure-JavaScript fallback renderer mirroring `StardustParsedown` in case PHP CLI
 * is unavailable in a minimal build environment.
 *
 * @param {string} rawMarkdown
 * @returns {string}
 */
function fallbackStardustMarkdownToHtml(rawMarkdown) {
	if (!rawMarkdown || typeof rawMarkdown !== 'string') return '';
	let text = rawMarkdown
		.replace(/\r\n/g, '\n')
		.replace(/\\?\[Note to the AI:[\s\S]*?\\?\]/gi, '')
		.replace(/\{\{cms\}\}/g, 'https://assets.raggiesoft.com')
		.trim();
	if (!text) return '';

	const escapeHtml = (/** @type {string} */ s) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	const formatInline = (/** @type {string} */ line) => {
		let out = escapeHtml(line);
		out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
		out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
		out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
		out = out.replace(
			/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
		);
		return out;
	};

	const blocks = text.split(/\n{2,}/);
	return blocks
		.map((block) => {
			const lines = block.split('\n').map((l) => formatInline(l));
			return `<p>${lines.join('<br />\n')}</p>`;
		})
		.join('\n');
}

/**
 * Batch-compiles an array of Markdown strings into formatted HTML using the canonical
 * PHP `StardustParsedown` engine (`stardust-parsedown.php` with `setBreaksEnabled(true)`).
 * Falls back cleanly to `fallbackStardustMarkdownToHtml` if PHP CLI is not available.
 *
 * @param {string[]} markdownItems
 * @returns {string[]}
 */
function batchCompileStardustParsedown(markdownItems) {
	const parsedownPath = resolveStardustParsedownPath();
	if (parsedownPath) {
		try {
			const phpCode = `
				require_once ${JSON.stringify(parsedownPath)};
				$pd = new StardustParsedown();
				$pd->setBreaksEnabled(true);
				$input = json_decode(stream_get_contents(STDIN), true);
				if (!is_array($input)) {
					echo json_encode([]);
					exit(0);
				}
				$out = [];
				foreach ($input as $md) {
					$trimmed = is_string($md) ? trim($md) : '';
					$out[] = $trimmed !== '' ? $pd->text($trimmed) : '';
				}
				echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
			`;
			const res = spawnSync('php', ['-r', phpCode], {
				input: JSON.stringify(markdownItems),
				encoding: 'utf-8',
				maxBuffer: 50 * 1024 * 1024
			});
			if (res.status === 0 && res.stdout) {
				const parsed = JSON.parse(res.stdout);
				if (Array.isArray(parsed) && parsed.length === markdownItems.length) {
					console.log(
						`✨ Compiled ${markdownItems.length} Markdown lore/lyric blocks via stardust-parsedown.php`
					);
					return parsed;
				}
			}
		} catch (err) {
			console.warn('⚠️  stardust-parsedown.php batch execution failed, using JS fallback:', err);
		}
	}
	return markdownItems.map((md) => fallbackStardustMarkdownToHtml(md));
}

/**
 * Resolves the active assets directory from candidate filesystem paths.
 * @returns {string | null}
 */
function resolveAssetsDirectory() {
	for (const candidate of candidateAssetPaths) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
			return candidate;
		}
	}
	return null;
}

/**
 * Resolves the active raggiesoft-hub directory from candidate filesystem paths.
 * @returns {string | null}
 */
function resolveHubDirectory() {
	for (const candidate of candidateHubPaths) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
			return candidate;
		}
	}
	return null;
}

/**
 * Recursively collects all `.json` files inside a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function walkJsonFiles(dir) {
	if (!fs.existsSync(dir)) return [];
	/** @type {string[]} */
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkJsonFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.json')) {
			results.push(fullPath);
		}
	}
	return results;
}

/**
 * Scans `raggiesoft-hub/data/routes/**\/*.json` and verifies that each route's
 * backing `.php` view file physically exists on disk. Returns a Set of verified
 * route paths (e.g., `/engine-room/artists/stardust-engine/discography/2004-progress-street`).
 *
 * @returns {Set<string>}
 */
function loadVerifiedHubRoutes() {
	/** @type {Set<string>} */
	const verifiedRoutes = new Set();
	const hubDir = resolveHubDirectory();
	if (!hubDir) return verifiedRoutes;

	const routesRoot = path.join(hubDir, 'data', 'routes');
	const routeFiles = walkJsonFiles(routesRoot);

	for (const file of routeFiles) {
		try {
			const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
			for (const [routeKey, routeConfig] of Object.entries(data)) {
				if (!routeKey.startsWith('/') || !routeConfig || typeof routeConfig !== 'object') {
					continue;
				}
				let viewRel = routeConfig.view || '';
				if (!viewRel) continue;
				if (!viewRel.endsWith('.php')) {
					viewRel += '.php';
				}
				const fullPhpPath = path.join(hubDir, viewRel.replace(/^\/+/, ''));
				if (fs.existsSync(fullPhpPath)) {
					verifiedRoutes.add(routeKey);
				}
			}
		} catch (err) {
			console.warn(`⚠️  Failed to parse hub route file ${file}:`, err);
		}
	}

	console.log(`🔗 Verified ${verifiedRoutes.size} live lore routes in raggiesoft-hub.`);
	return verifiedRoutes;
}

/**
 * Builds the canonical catalog of all artists, albums, and tracks.
 */
function buildCatalog() {
	const assetsDir = resolveAssetsDirectory();
	const verifiedHubRoutes = loadVerifiedHubRoutes();
	const outputPath = path.resolve(__dirname, '../src/lib/data/musicCatalog.json');

	if (!assetsDir) {
		console.warn('⚠️  Could not find local raggiesoft-assets directory.');
		if (fs.existsSync(outputPath)) {
			console.log('ℹ️  Retaining existing musicCatalog.json in src/lib/data.');
			const existingCatalog = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
			writeXmlSitemaps(existingCatalog);
			return;
		}
		throw new Error('Assets directory not found and no existing musicCatalog.json present.');
	}

	console.log(`🔍 Scanning Engine Room Records catalog in: ${assetsDir}`);

	// 1. Ingest narrative lore and lyrics from metadata.json if available
	/** @type {Map<string, string>} */
	const metadataMap = new Map();
	const metaFilePath = path.join(assetsDir, 'metadata.json');
	if (fs.existsSync(metaFilePath)) {
		try {
			const metaRaw = fs.readFileSync(metaFilePath, 'utf-8');
			const metaItems = JSON.parse(metaRaw);
			for (const item of metaItems) {
				if (item.artist && item.title) {
					const key = `${item.artist.trim().toLowerCase()}:::${item.title.trim().toLowerCase()}`;
					metadataMap.set(key, item.content || '');
				}
			}
			console.log(`📖 Ingested ${metadataMap.size} track narrative entries from metadata.json.`);
		} catch (err) {
			console.warn('⚠️  Failed to parse metadata.json:', err);
		}
	}

	// 2. Discover all artist subdirectories
	const artistSlugs = fs
		.readdirSync(assetsDir)
		.filter((name) => {
			const p = path.join(assetsDir, name);
			return fs.statSync(p).isDirectory() && !name.startsWith('.');
		})
		.sort();

	/** @type {Array<any>} */
	const catalog = [];
	let totalTracks = 0;

	for (const artistSlug of artistSlugs) {
		const artistDir = path.join(assetsDir, artistSlug);

		// Determine human-readable artist display name
		let artistName = artistSlug
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');

		if (artistSlug === 'the-stardust-engine') artistName = 'The Stardust Engine';
		else if (artistSlug === 'the-paper-wall') artistName = 'The Paper Wall';
		else if (artistSlug === 'fractured-prisms') artistName = 'Fractured Prisms';
		else if (artistSlug === 'mana-canvas') artistName = 'Mana Canvas';
		else if (artistSlug === 'crimson-node') artistName = 'Crimson Node';
		else if (artistSlug === 'the-winter-palace') artistName = 'The Winter Palace';
		else if (artistSlug === 'the-arctic-symphony-project')
			artistName = 'The Arctic Symphony Project';
		else if (artistSlug === 'firelight') artistName = 'Firelight';
		else if (artistSlug === 'steel-horizon') artistName = 'Steel Horizon';
		else if (artistSlug === 'the-hoshizora-ensemble') artistName = 'The Hoshizora Ensemble';

		// Resolve artist logo if band-logo.png or band-logo.jpg exists
		const artistLogo = fs.existsSync(path.join(artistDir, 'band-logo.png'))
			? `${CDN_BASE}/${artistSlug}/band-logo.png`
			: fs.existsSync(path.join(artistDir, 'band-logo.jpg'))
				? `${CDN_BASE}/${artistSlug}/band-logo.jpg`
				: null;

		// Resolve artist-level Open Graph 16:9 social preview banner if present
		const artistSocialPreview = fs.existsSync(path.join(artistDir, 'social-preview.jpg'))
			? `${CDN_BASE}/${artistSlug}/social-preview.jpg`
			: fs.existsSync(path.join(artistDir, 'discography-social-preview.jpg'))
				? `${CDN_BASE}/${artistSlug}/discography-social-preview.jpg`
				: null;

		// Resolve canonical artist-level lore URL on stardust.raggiesoft.com or engineroom.raggiesoft.com
		const artistLoreUrl =
			artistSlug === 'the-stardust-engine'
				? 'https://stardust.raggiesoft.com'
				: `https://engineroom.raggiesoft.com/artists/${artistSlug}`;

		// Parse artist-level albums.json for DSP IDs (Spotify, Apple, Amazon, YouTube)
		// and Fourthwall direct storefront URLs (Standard MP3/OGG & Audiophile WAV/FLAC)
		/** @type {Array<any>} */
		const artistAlbumsManifest = [];
		const artistAlbumsFile = path.join(artistDir, 'albums.json');
		if (fs.existsSync(artistAlbumsFile)) {
			try {
				const rawManifest = JSON.parse(fs.readFileSync(artistAlbumsFile, 'utf-8'));
				if (Array.isArray(rawManifest.eras)) {
					for (const era of rawManifest.eras) {
						if (Array.isArray(era.albums)) {
							artistAlbumsManifest.push(...era.albums);
						}
					}
				} else if (rawManifest && typeof rawManifest === 'object') {
					for (const era of Object.values(rawManifest)) {
						if (era && typeof era === 'object' && Array.isArray(era.albums)) {
							artistAlbumsManifest.push(...era.albums);
						}
					}
				}
			} catch (err) {
				console.warn(`⚠️  Failed to parse albums.json for ${artistSlug}:`, err);
			}
		}

		// Discover all potential album directories for this artist
		const albumFolders = fs
			.readdirSync(artistDir)
			.filter((name) => {
				const p = path.join(artistDir, name);
				if (!fs.statSync(p).isDirectory() || name.startsWith('.')) return false;
				// Skip non-album directories, legacy unsplit duplicates, and known typo folders
				if (
					[
						'master-wav',
						'story',
						'lyrics',
						'christmas-album',
						'2017-silver-gauntlet-of-aethel',
						'2025-silver-gauntlet-of-aethel'
					].includes(name)
				)
					return false;
				if (name.includes('gaultlet')) return false; // Ignore typo folder
				return true;
			})
			.sort();

		for (const albumSlug of albumFolders) {
			const albumDir = path.join(artistDir, albumSlug);
			const tracksFile = path.join(albumDir, 'tracks.json');
			const albumFile = path.join(albumDir, 'album.json');

			// Check for track manifest
			/** @type {Array<any>} */
			let rawTracks = [];
			if (fs.existsSync(tracksFile)) {
				try {
					const tracksContent = fs.readFileSync(tracksFile, 'utf-8');
					const tracksJson = JSON.parse(tracksContent);
					rawTracks = tracksJson.tracks || [];
				} catch (err) {
					console.warn(`⚠️  Failed to parse tracks.json in ${albumSlug}:`, err);
				}
			}

			// Exclude releases that do not have tracks (e.g. canceled or work-in-progress releases)
			if (!rawTracks || rawTracks.length === 0) {
				continue;
			}

			// Ingest album schema metadata if available
			let albumData = {};
			if (fs.existsSync(albumFile)) {
				try {
					const albumContent = fs.readFileSync(albumFile, 'utf-8');
					albumData = JSON.parse(albumContent);
				} catch (err) {
					console.warn(`⚠️  Failed to parse album.json in ${albumSlug}:`, err);
				}
			}

			// Resolve album title
			let albumTitle = albumData.name || albumData.albumName;
			if (!albumTitle) {
				// Derive title from directory slug (strip leading 4-digit year if present)
				const cleanSlug = albumSlug.replace(/^\d{4}-/, '');
				albumTitle = cleanSlug
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');
			}

			// Match album against artist's albums.json manifest early so DSP & release metadata are available
			const matchedManifestAlbum =
				artistAlbumsManifest.find((entry) => {
					if (entry.folder && entry.folder === albumSlug) return true;
					if (entry.slug && entry.slug === albumSlug) return true;
					if (entry.url && path.basename(entry.url) === albumSlug) return true;
					if (entry.img && String(entry.img).includes(`/${albumSlug}/`)) return true;
					if (
						entry.title &&
						String(entry.title).trim().toLowerCase() === albumTitle.trim().toLowerCase()
					) {
						return true;
					}
					return false;
				}) || {};

			// Resolve temporalCoverage (in-universe narrative era) and datePublished (real-world >= 2026 release)
			const temporalCoverage = albumData.temporalCoverage
				? String(albumData.temporalCoverage).trim()
				: albumData.narrativeReleaseDate
					? String(albumData.narrativeReleaseDate).trim()
					: '';
			const usReleaseDate = albumData.usReleaseDate ? String(albumData.usReleaseDate).trim() : '';
			const datePublished = resolveRealWorldDatePublished(albumData, matchedManifestAlbum, [
				albumFile,
				tracksFile
			]);

			// Resolve narrative release year strictly from albumSlug or temporalCoverage
			let year = '';
			const yearMatch = albumSlug.match(/^(\d{4})/);
			if (yearMatch) {
				year = yearMatch[1];
			} else if (temporalCoverage) {
				year = temporalCoverage.substring(0, 4);
			}

			// Resolve genre and description
			const genre = albumData.genre || 'Rock';
			const description =
				albumData.description || `Studio release by ${artistName} on Engine Room Records.`;

			// Determine if release is an overarching rock opera
			const isRockOperaInitial = Boolean(
				albumData.isRockOpera ||
				genre.toLowerCase().includes('rock opera') ||
				description.toLowerCase().includes('rock opera') ||
				albumTitle.toLowerCase().includes('book 1') ||
				albumTitle.toLowerCase().includes('book 2') ||
				albumTitle.toLowerCase().includes('book 3')
			);

			// Resolve album production type (StudioAlbum, LiveAlbum, CompilationAlbum)
			const rawProdType = albumData.albumProductionType || 'StudioAlbum';
			let albumType = 'studio';
			let albumTypeLabel = 'Studio Album';

			if (rawProdType === 'LiveAlbum' || albumSlug.includes('live-in-chicago')) {
				albumType = 'live';
				albumTypeLabel = 'Live Album';
			} else if (rawProdType === 'CompilationAlbum' || albumSlug.includes('war-chest')) {
				albumType = 'compilation';
				albumTypeLabel = 'Compilation';
			} else if (rawProdType === 'SoundtrackAlbum') {
				albumType = 'soundtrack';
				albumTypeLabel = 'Soundtrack';
			}

			// Resolve cover artwork URL (1:1 square master)
			let artwork = `${CDN_BASE}/${artistSlug}/${albumSlug}/album-art.jpg`;
			if (fs.existsSync(path.join(albumDir, 'album-art.png'))) {
				artwork = `${CDN_BASE}/${artistSlug}/${albumSlug}/album-art.png`;
			}

			// Resolve Open Graph social preview banner URL (1200x630 landscape)
			// Checks for physical social-preview.jpg/png on disk; falls back to square artwork if absent.
			let socialPreview = `${CDN_BASE}/${artistSlug}/${albumSlug}/social-preview.jpg`;
			if (fs.existsSync(path.join(albumDir, 'social-preview.png'))) {
				socialPreview = `${CDN_BASE}/${artistSlug}/${albumSlug}/social-preview.png`;
			} else if (!fs.existsSync(path.join(albumDir, 'social-preview.jpg'))) {
				socialPreview = artwork;
			}

			// Web MP3 audio directory path
			const webMp3Dir = path.join(albumDir, 'web-mp3');

			// Detect CC BY-SA 4.0 Free 128kbps MP3 ZIP Archive inside web-mp3/ if available on disk
			let freeArchiveUrl = '';
			if (fs.existsSync(webMp3Dir)) {
				try {
					const zipFiles = fs
						.readdirSync(webMp3Dir)
						.filter((f) => f.endsWith('-free-archive.zip') && !f.startsWith('--'))
						.sort();
					if (zipFiles.length > 0) {
						freeArchiveUrl = `${CDN_BASE}/${artistSlug}/${albumSlug}/web-mp3/${zipFiles[zipFiles.length - 1]}`;
					}
				} catch {
					// Ignore read errors
				}
			}

			/** @type {Set<string>} */
			const seenTrackSlugs = new Set();

			// Process individual tracks and check physical audio file presence
			const formattedTracks = rawTracks.map((t, idx) => {
				const trackNum = typeof t.track === 'number' ? t.track : idx + 1;
				const discNum = typeof t.disc === 'number' ? t.disc : 1;
				const trackTitle = t.title || `Track ${trackNum}`;
				const trackVersion = t.version ? String(t.version).trim() : '';
				const isrc = t.isrc || '';
				const legacyTier = t.legacyTier || '';

				// Resolve audio file name first so we can check per-track lyrics/*.md files
				let fileName = t.fileName || '';
				if (!fileName && t.masterWavPath) {
					fileName = path.basename(t.masterWavPath);
				}

				const trackSlug = buildCanonicalTrackSlug(
					fileName,
					trackTitle,
					trackVersion,
					discNum,
					trackNum,
					seenTrackSlugs
				);

				// Extract lore note and lyrics from direct track definitions, per-album lyrics/*.md, or metadata.json
				let loreNote = t.loreNote || '';
				let lyrics = t.lyrics || '';
				const trackMdPath = fileName ? path.join(albumDir, 'lyrics', `${fileName}.md`) : null;

				if ((!loreNote || !lyrics) && trackMdPath) {
					if (fs.existsSync(trackMdPath)) {
						try {
							const mdRaw = fs.readFileSync(trackMdPath, 'utf-8');
							if (mdRaw.includes('**LORE NOTE:**')) {
								const parts = mdRaw.split('**LORE NOTE:**');
								const loreSection = parts[1].split('**LYRICS:**')[0].trim();
								if (!loreNote) {
									loreNote = loreSection.replace(/\r\n/g, '\n');
								}
								if (parts[1].includes('**LYRICS:**') && !lyrics) {
									lyrics = parts[1].split('**LYRICS:**')[1].trim().replace(/\r\n/g, '\n');
								}
							} else if (mdRaw.includes('**LYRICS:**') && !lyrics) {
								lyrics = mdRaw.split('**LYRICS:**')[1].trim().replace(/\r\n/g, '\n');
							} else if (!lyrics) {
								lyrics = mdRaw.trim().replace(/\r\n/g, '\n');
							}
						} catch {
							// Ignore unreadable markdown file
						}
					}
				}

				if (!loreNote || !lyrics) {
					const lookupKey = `${artistName.toLowerCase()}:::${trackTitle.toLowerCase()}`;
					const narrative = metadataMap.get(lookupKey) || '';
					if (narrative.includes('**LORE NOTE:**')) {
						const parts = narrative.split('**LORE NOTE:**');
						const loreSection = parts[1].split('**LYRICS:**')[0].trim();
						if (!loreNote) {
							loreNote = loreSection.replace(/\r\n/g, '\n');
						}
						if (parts[1].includes('**LYRICS:**') && !lyrics) {
							lyrics = parts[1].split('**LYRICS:**')[1].trim().replace(/\r\n/g, '\n');
						}
					} else if (narrative.includes('**LYRICS:**') && !lyrics) {
						lyrics = narrative.split('**LYRICS:**')[1].trim().replace(/\r\n/g, '\n');
					}
				}

				// Strip any accidental WebVTT header lines so human-facing lyrics remain clean
				if (lyrics) {
					lyrics = lyrics
						.replace(/^WEBVTT\b.*$/gim, '')
						.replace(/^NOTE\s+SYNC_TYPE:.*$/gim, '')
						.trim();
				}

				const mp3Path = fileName ? path.join(webMp3Dir, `${fileName}.mp3`) : null;
				const hasPhysicalMp3 = Boolean(mp3Path && fs.existsSync(mp3Path));

				const audioUrl = hasPhysicalMp3
					? `${CDN_BASE}/${artistSlug}/${albumSlug}/web-mp3/${fileName}.mp3`
					: '';

				// Detect WebVTT synchronized lyrics if available on disk & check HUMAN_VERIFIED status
				let vttUrl = '';
				let vttVerified = false;
				const vttPath1 = fileName ? path.join(albumDir, 'lyrics', `${fileName}.vtt`) : null;
				const vttPath2 = fileName
					? path.join(albumDir, 'streaming-services', 'lyrics', `${fileName}.vtt`)
					: null;

				if (vttPath1 && fs.existsSync(vttPath1)) {
					vttUrl = `${CDN_BASE}/${artistSlug}/${albumSlug}/lyrics/${fileName}.vtt`;
					try {
						vttVerified = fs.readFileSync(vttPath1, 'utf-8').includes('SYNC_TYPE: HUMAN_VERIFIED');
					} catch {
						// Ignore read errors
					}
				} else if (vttPath2 && fs.existsSync(vttPath2)) {
					vttUrl = `${CDN_BASE}/${artistSlug}/${albumSlug}/streaming-services/lyrics/${fileName}.vtt`;
					try {
						vttVerified = fs.readFileSync(vttPath2, 'utf-8').includes('SYNC_TYPE: HUMAN_VERIFIED');
					} catch {
						// Ignore read errors
					}
				}

				// Format duration; if unrendered and duration is missing/zero, mark as In Studio
				let duration = t.duration || '0:00';
				if (!hasPhysicalMp3 && (duration === '0:00' || !duration)) {
					duration = 'In Studio';
				}

				const trackLastmod = getLatestMtimeDate(
					[tracksFile, albumFile, trackMdPath, vttPath1, vttPath2, mp3Path],
					datePublished
				);

				return {
					id: `${artistSlug}-${albumSlug}-${discNum}-${trackNum}`,
					slug: trackSlug,
					fileName,
					disc: discNum,
					discName: t.discName || '',
					track: trackNum,
					title: trackTitle,
					version: trackVersion,
					duration,
					isrc,
					legacyTier,
					stylePrompt: t.stylePrompt || '',
					loreNote,
					loreNoteHtml: '',
					lyrics,
					lyricsHtml: '',
					audioUrl,
					vttUrl,
					vttVerified,
					isPlayable: hasPhysicalMp3,
					lastmod: trackLastmod
				};
			});

			totalTracks += formattedTracks.length;

			// Automated Album Status Determination based on physical MP3 availability
			const playableTracks = formattedTracks.filter((t) => t.isPlayable);
			const playableTrackCount = playableTracks.length;
			const totalTracksCount = formattedTracks.length;

			let status = 'released';
			let statusLabel = 'Released';
			if (playableTrackCount === 0) {
				status = 'coming-soon';
				statusLabel = 'Coming Soon';
			} else if (playableTrackCount < totalTracksCount) {
				status = 'in-progress';
				statusLabel = 'In Production';
			}

			const spotifyId = String(matchedManifestAlbum.spotifyId || albumData.spotifyId || '').trim();
			const appleId = String(matchedManifestAlbum.appleId || albumData.appleId || '').trim();
			const amazonId = String(matchedManifestAlbum.amazonId || albumData.amazonId || '').trim();
			// Clean any accidental trailing '&' on youtubeId
			const youtubeId = String(matchedManifestAlbum.youtubeId || albumData.youtubeId || '')
				.trim()
				.replace(/&+$/, '');

			const storeStandardUrl = String(
				matchedManifestAlbum.storeStandardUrl || albumData.storeStandardUrl || ''
			).trim();
			const storeAudiophileUrl = String(
				matchedManifestAlbum.storeAudiophileUrl || albumData.storeAudiophileUrl || ''
			).trim();

			const dspExempt = Boolean(matchedManifestAlbum.dspExempt || albumData.dspExempt || false);
			const dspNotice = String(matchedManifestAlbum.dspNotice || albumData.dspNotice || '').trim();
			const rockOperaSetId = String(
				matchedManifestAlbum.rockOperaSetId || albumData.rockOperaSetId || ''
			).trim();
			const isRockOpera = Boolean(
				isRockOperaInitial || matchedManifestAlbum.isRockOpera || rockOperaSetId
			);

			// Extract migrated liner notes, studio archives, live transcripts, and lore links from album.json
			const subtitle = String(albumData.subtitle || '').trim();
			const upc = String(albumData.gtin12 || albumData.identifier || '').trim();
			const linerNotes = Array.isArray(albumData.linerNotes) ? albumData.linerNotes : [];
			const studioArchives = Array.isArray(albumData.studioArchives)
				? albumData.studioArchives
				: [];
			const liveTranscript = albumData.liveTranscript || null;
			const loreLinks = Array.isArray(albumData.loreLinks) ? albumData.loreLinks : [];

			// Resolve non-discography story lore URL on stardust.raggiesoft.com or engineroom.raggiesoft.com if present
			const rawManifestUrl = String(matchedManifestAlbum.url || albumData.loreUrl || '').trim();

			let loreUrl = '';
			if (rawManifestUrl && !rawManifestUrl.includes('/discography/')) {
				if (
					rawManifestUrl.startsWith('https://stardust.raggiesoft.com') ||
					rawManifestUrl.startsWith('https://engineroom.raggiesoft.com')
				) {
					loreUrl = rawManifestUrl;
				} else if (rawManifestUrl.startsWith(HUB_BASE)) {
					const route = rawManifestUrl.slice(HUB_BASE.length);
					if (verifiedHubRoutes.has(route)) {
						loreUrl = rawManifestUrl;
					}
				}
			}

			// Compute truthful album-level lastmod from album/tracks manifests and per-track lastmods
			const baseAlbumLastmod = getLatestMtimeDate(
				[albumFile, tracksFile, artistAlbumsFile],
				datePublished
			);
			const albumLastmod = formattedTracks.reduce(
				(maxDate, tr) => (tr.lastmod && tr.lastmod > maxDate ? tr.lastmod : maxDate),
				baseAlbumLastmod
			);

			catalog.push({
				id: `${artistSlug}-${albumSlug}`,
				slug: albumSlug,
				title: albumTitle,
				subtitle,
				upc,
				artist: artistName,
				artistSlug,
				artistLogo,
				artistSocialPreview,
				artistLoreUrl,
				loreUrl,
				year,
				temporalCoverage,
				usReleaseDate,
				datePublished,
				lastmod: albumLastmod,
				genre,
				isRockOpera,
				rockOperaSetId,
				albumType,
				albumTypeLabel,
				status,
				statusLabel,
				playableTrackCount,
				totalTracksCount,
				artwork,
				socialPreview,
				description,
				linerNotes,
				studioArchives,
				liveTranscript,
				loreLinks,
				spotifyId,
				appleId,
				amazonId,
				youtubeId,
				storeStandardUrl,
				storeAudiophileUrl,
				freeArchiveUrl,
				dspExempt,
				dspNotice,
				tracks: formattedTracks
			});
		}
	}

	// =========================================================================
	// Batch-compile track loreNote & lyrics Markdown via StardustParsedown
	// (stardust-parsedown.php) so The Listening Room renders formatted HTML
	// while retaining raw loreNote/lyrics for search and /studio editing.
	// =========================================================================
	const allTracksFlat = [];
	const markdownPayload = [];
	for (const album of catalog) {
		for (const track of album.tracks) {
			allTracksFlat.push(track);
			markdownPayload.push(track.loreNote || '');
			markdownPayload.push(track.lyrics || '');
		}
	}
	const compiledHtmlList = batchCompileStardustParsedown(markdownPayload);
	for (let i = 0; i < allTracksFlat.length; i++) {
		allTracksFlat[i].loreNoteHtml = compiledHtmlList[i * 2] || '';
		allTracksFlat[i].lyricsHtml = compiledHtmlList[i * 2 + 1] || '';
	}
	console.log(
		`📝 Compiled ${allTracksFlat.length} track loreNote & lyrics blocks via StardustParsedown (stardust-parsedown.php).`
	);

	// Sort catalog chronologically by ISO 8601 temporalCoverage/year, then title
	catalog.sort((a, b) => {
		const dateA = a.temporalCoverage || a.year || '9999';
		const dateB = b.temporalCoverage || b.year || '9999';
		if (dateA !== dateB) return dateA.localeCompare(dateB);
		return a.title.localeCompare(b.title);
	});

	// =========================================================================
	// Canonicalize Cross-Site RaggieSoft URLs across all string fields
	// (`loreUrl`, `artistLoreUrl`, `loreLinks`, `loreNoteHtml`, `description`, etc.)
	// so `books.raggiesoft.com/books/<slug>` -> `books.raggiesoft.com/<slug>` and
	// `music.raggiesoft.com/...?track=...` -> `music.raggiesoft.com/[artist]/[album]/[track]`.
	// =========================================================================
	const canonicalTrackLookup = new Map();
	for (const album of catalog) {
		for (const tr of album.tracks || []) {
			const canonicalUrl = `${SITE_ORIGIN}/${album.artistSlug}/${album.slug}/${tr.slug}`;
			if (tr.fileName)
				canonicalTrackLookup.set(`${album.artistSlug}/${album.slug}?${tr.fileName}`, canonicalUrl);
			if (tr.id)
				canonicalTrackLookup.set(`${album.artistSlug}/${album.slug}?${tr.id}`, canonicalUrl);
			if (tr.slug)
				canonicalTrackLookup.set(`${album.artistSlug}/${album.slug}?${tr.slug}`, canonicalUrl);
		}
	}

	const normalizeRaggieSoftUrls = (val) => {
		if (typeof val === 'string') {
			return val
				.replace(
					/https:\/\/books\.raggiesoft\.com\/books\/([a-z0-9/-]+)/gi,
					'https://books.raggiesoft.com/$1'
				)
				.replace(
					/https:\/\/music\.raggiesoft\.com\/(?:artists\/)?([a-z0-9-]+)\/([a-z0-9-]+)\?track=([a-z0-9-]+)/gi,
					(full, art, alb, trk) => {
						const mapped = canonicalTrackLookup.get(
							`${art.toLowerCase()}/${alb.toLowerCase()}?${trk.toLowerCase()}`
						);
						if (mapped) return mapped;
						const fallbackSlug = trk
							.toLowerCase()
							.replace(/^\d+-\d+-/, '')
							.replace(/^\d+-/, '');
						return `${SITE_ORIGIN}/${art.toLowerCase()}/${alb.toLowerCase()}/${fallbackSlug}`;
					}
				);
		}
		if (Array.isArray(val)) {
			return val.map(normalizeRaggieSoftUrls);
		}
		if (val && typeof val === 'object') {
			for (const k of Object.keys(val)) {
				// Preserve raw `loreNote` / `lyrics` markdown strings for /studio editing while normalizing all URL/HTML fields
				if (k === 'lyrics') continue;
				val[k] = normalizeRaggieSoftUrls(val[k]);
			}
			return val;
		}
		return val;
	};
	normalizeRaggieSoftUrls(catalog);

	// Write output file in raggiesoft-music
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf-8');
	console.log(`✅ Saved ${catalog.length} albums (${totalTracks} tracks) to: ${outputPath}`);

	// Also write to raggiesoft-assets if available so CDN can host it directly
	const assetsCatalogPath = path.resolve(assetsDir, '../catalog.json');
	try {
		fs.writeFileSync(assetsCatalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
		console.log(`✅ Emitted CDN manifest to: ${assetsCatalogPath}`);
	} catch (err) {
		console.warn('⚠️  Could not write to assets catalog.json:', err);
	}

	// Generate XML sitemap index + category sitemaps with truthful <lastmod> dates
	writeXmlSitemaps(catalog);
}

// Execute compilation
buildCatalog();
