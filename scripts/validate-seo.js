/**
 * @license MIT
 * ============================================================================
 * scripts/validate-seo.js — Automated Static Build SEO, Entity Graph & CWV Validator
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript & Web Engineering Guide):
 *   What is this script, and why does it run after `vite build`?
 *     Think of `validate-seo.js` as an automated quality-control inspector that
 *     reads every single generated `.html` and `.xml` file inside `build/`
 *     before we ever deploy to `music.raggiesoft.com`. If even one page out of
 *     550+ pages is missing an `alt` description on an image, has two `<h1>`
 *     headings, has a broken internal `<a href>` link, or accidentally leaks an
 *     in-universe fictional year (`1987`) into a real-world Schema.org
 *     `datePublished` field, this script prints the exact route and exits with
 *     code `1` (`process.exit(1)`) to stop a broken deploy in its tracks!
 *
 * Audits the prerendered static build output (`build/`) of The Listening Room
 * (`https://music.raggiesoft.com`) to guarantee zero regressions across:
 *   1. Unique `<title>` and `<meta name="description">` across all indexable pages
 *   2. Single self-referencing `<link rel="canonical">` (no trailing slashes)
 *   3. Exact single `<h1>` heading per page (`558` indexable + `3` utility routes)
 *   4. Valid Schema.org JSON-LD (`JSON.parse`), ISO 8601 `PT...` durations, and
 *      ZERO fictional pre-2026 dates in `datePublished` or `music:release_date`
 *   5. Explicit `width`, `height`, and accessible `alt` on every `<img>` tag,
 *      zero `fetchpriority="high"` + `loading="lazy"` conflicts, and
 *      `<audio preload="none">` across all prerendered HTML
 *   6. Internal `<a href>` link integrity, zero trailing-slash links, and zero
 *      orphan indexable catalog pages
 *   7. 100% 1-to-1 parity between `sitemap.xml` + child sitemaps and built
 *      indexable pages, with `/settings`, `/studio`, and `/404` marked `noindex`
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const SITE_ORIGIN = 'https://music.raggiesoft.com';

// Build the set of routes expected to carry `<meta name="robots" content="noindex,...">`:
// utility routes (`/settings`, `/studio`, `/404`) PLUS unrecorded story-only setlist stub tracks.
const CATALOG_JSON_PATH = path.join(PROJECT_ROOT, 'src/lib/data/musicCatalog.json');
// IIFE `(() => { ... })()` runs once immediately at startup and assigns the resulting `Set`
const EXPECTED_NOINDEX_ROUTES = (() => {
	const set = new Set(['/settings', '/studio', '/404']);
	if (fs.existsSync(CATALOG_JSON_PATH)) {
		try {
			const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON_PATH, 'utf-8'));
			for (const album of catalog) {
				for (const track of album.tracks || []) {
					if (!track.slug) continue;
					if (!track.isPlayable && !track.isrc) {
						set.add(`/${album.artistSlug}/${album.slug}/${track.slug}`);
					}
				}
			}
		} catch {
			// Ignore parse issues here; caught downstream if catalog is invalid
		}
	}
	return set;
})();
const EXPECTED_CHILD_SITEMAPS = [
	'editorial.xml',
	'artists.xml',
	'albums.xml',
	'tracks.xml',
	'playlists.xml'
];

/**
 * Decodes basic HTML entities inside extracted `<title>` and attribute values.
 *
 * @param {string} value
 * @returns {string}
 */
function decodeEntities(value) {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&bull;/g, '•')
		.replace(/&mdash;/g, '—')
		.replace(/&ndash;/g, '–')
		.replace(/&rarr;/g, '→')
		.trim();
}

/**
 * Recursively collects canonical prerendered HTML files from `build/`,
 * skipping mirrored `<route>/index.html` bridge copies and `200.html` SPA
 * fallback while recording all canonical route paths.
 *
 * @param {string} dir
 * @param {Array<{ routePath: string, htmlPath: string }>} [results]
 * @returns {Array<{ routePath: string, htmlPath: string }>}
 */
function collectCanonicalHtmlFiles(dir, results = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '_app' || entry.name === 'sitemaps' || entry.name === 'icons') {
				continue;
			}
			collectCanonicalHtmlFiles(fullPath, results);
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			const relPath = path.relative(BUILD_DIR, fullPath).split(path.sep).join('/');
			if (relPath === '200.html') continue;
			if (relPath === 'index.html') {
				results.push({ routePath: '/', htmlPath: fullPath });
				continue;
			}
			// Skip mirrored `<route>/index.html` copies created by `staticPwaAdapter`
			if (entry.name === 'index.html') continue;

			const routePath = '/' + relPath.slice(0, -5);
			results.push({ routePath, htmlPath: fullPath });
		}
	}
	return results;
}

/**
 * Extracts an attribute value from an HTML tag string.
 *
 * @param {string} tagHtml
 * @param {string} attrName
 * @returns {string | null}
 */
function getAttr(tagHtml, attrName) {
	const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
	const match = tagHtml.match(regex);
	if (!match) return null;
	return match[1] ?? match[2] ?? match[3] ?? '';
}

/**
 * Recursively validates Schema.org JSON-LD nodes for ISO 8601 `duration` and
 * real-world `datePublished` (`>= 2026`).
 *
 * @param {unknown} node
 * @param {string} routePath
 * @param {string[]} errors
 */
function validateJsonLdNode(node, routePath, errors, isNoindexRoute = false) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const item of node) {
			validateJsonLdNode(item, routePath, errors, isNoindexRoute);
		}
		return;
	}

	const record = /** @type {Record<string, unknown>} */ (node);
	const nodeType = record['@type'];

	// 1. Organization guard: never claim Organization owl:sameAs the WebApplication domain
	if (nodeType === 'Organization' && Array.isArray(record.sameAs)) {
		for (const rawSameAs of record.sameAs) {
			const s = String(rawSameAs || '').replace(/\/+$/, '');
			if (s === SITE_ORIGIN) {
				errors.push(
					`[${routePath}] Organization.sameAs must not contain WebSite/WebApp URL "${rawSameAs}"`
				);
			}
		}
	}

	// 2. MusicRecording schema domain, sameAs contamination, and unrecorded-stub guards
	if (nodeType === 'MusicRecording') {
		if (isNoindexRoute) {
			errors.push(
				`[${routePath}] Unrecorded/noindex page must not emit a Schema.org MusicRecording node`
			);
		}
		if ('recordLabel' in record) {
			errors.push(
				`[${routePath}] Invalid Schema.org property "recordLabel" on MusicRecording (use "publisher" on MusicRecording and "recordLabel" on inAlbum)`
			);
		}
		if (Array.isArray(record.sameAs)) {
			for (const rawSameAs of record.sameAs) {
				const u = String(rawSameAs || '');
				if (
					/open\.spotify\.com\/album\//i.test(u) ||
					(/music\.apple\.com\/[^?]*\/album\//i.test(u) && !/[?&]i=/.test(u)) ||
					/music\.amazon\.com\/albums\//i.test(u) ||
					/music\.youtube\.com\/playlist\?list=/i.test(u) ||
					/store\.raggiesoft\.com\/products\//i.test(u)
				) {
					errors.push(
						`[${routePath}] MusicRecording.sameAs contaminated with album or store URL: "${u}"`
					);
				}
			}
		}
	}

	// 3. MusicAlbum & MusicGroup sameAs store-product guard
	if ((nodeType === 'MusicAlbum' || nodeType === 'MusicGroup') && Array.isArray(record.sameAs)) {
		for (const rawSameAs of record.sameAs) {
			const u = String(rawSameAs || '');
			if (/store\.raggiesoft\.com\/products\//i.test(u)) {
				errors.push(`[${routePath}] ${nodeType}.sameAs must not include store product URL: "${u}"`);
			}
			if (nodeType === 'MusicGroup' && /\/album(s)?\//i.test(u)) {
				errors.push(`[${routePath}] MusicGroup.sameAs must not include album URL: "${u}"`);
			}
		}
	}

	if ('duration' in record && record.duration !== undefined && record.duration !== null) {
		const dur = String(record.duration);
		if (!/^PT(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/.test(dur)) {
			errors.push(`[${routePath}] Invalid non-ISO-8601 JSON-LD duration: "${dur}"`);
		}
	}

	if (
		'datePublished' in record &&
		record.datePublished !== undefined &&
		record.datePublished !== null
	) {
		const pub = String(record.datePublished).trim();
		const yearMatch = pub.match(/^(\d{4})/);
		const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : NaN;
		if (!Number.isFinite(year) || year < 2026) {
			errors.push(`[${routePath}] Fictional or pre-2026 JSON-LD datePublished detected: "${pub}"`);
		}
	}

	for (const val of Object.values(record)) {
		validateJsonLdNode(val, routePath, errors, isNoindexRoute);
	}
}

function main() {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	if (!fs.existsSync(BUILD_DIR)) {
		console.error(`❌ Build directory not found at ${BUILD_DIR}. Run "vite build" first.`);
		process.exit(1);
	}

	// 1. Verify static SEO infrastructure files exist in build/
	for (const requiredRel of ['404.html', 'robots.txt', 'sitemap.xml']) {
		if (!fs.existsSync(path.join(BUILD_DIR, requiredRel))) {
			errors.push(`Missing required build artifact: build/${requiredRel}`);
		}
	}

	const canonicalPages = collectCanonicalHtmlFiles(BUILD_DIR).sort((a, b) =>
		a.routePath.localeCompare(b.routePath)
	);
	const allRoutePaths = new Set(canonicalPages.map((p) => p.routePath));

	/** @type {Map<string, string>} title -> first routePath */
	const seenTitles = new Map();
	/** @type {Map<string, string>} description -> first routePath */
	const seenDescriptions = new Map();
	/** @type {Set<string>} */
	const indexableCanonicalUrls = new Set();
	/** @type {Map<string, number>} routePath -> incoming internal link count */
	const incomingLinkCounts = new Map();

	for (const { routePath } of canonicalPages) {
		if (!EXPECTED_NOINDEX_ROUTES.has(routePath)) {
			incomingLinkCounts.set(routePath, 0);
		}
	}

	// 2. Audit every canonical prerendered HTML page
	for (const { routePath, htmlPath } of canonicalPages) {
		// Ensure mirrored `<route>/index.html` exists for non-root, non-404 routes
		if (routePath !== '/' && routePath !== '/404') {
			const mirroredIndex = path.join(BUILD_DIR, routePath.slice(1), 'index.html');
			if (!fs.existsSync(mirroredIndex)) {
				errors.push(`[${routePath}] Missing mirrored directory index: ${mirroredIndex}`);
			}
		}

		const html = fs.readFileSync(htmlPath, 'utf-8');
		const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

		if (!headMatch || !bodyMatch) {
			errors.push(`[${routePath}] Malformed HTML missing <head> or <body>`);
			continue;
		}

		const headHtml = headMatch[1].replace(/<!--[\s\S]*?-->/g, '');
		const bodyWithoutScripts = bodyMatch[1]
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

		// Robots meta inspection
		const metaTags = headHtml.match(/<meta\b[^>]*>/gi) || [];
		let robotsContent = '';
		let descriptionContent = '';
		let ogTitle = '';
		let ogDescription = '';
		let ogUrl = '';
		let ogImage = '';
		let twitterCard = '';
		let hasMobileWebAppCapable = false;

		for (const tag of metaTags) {
			const name = (getAttr(tag, 'name') || '').toLowerCase();
			const prop = (getAttr(tag, 'property') || '').toLowerCase();
			const content = decodeEntities(getAttr(tag, 'content') ?? '');

			if (name === 'robots') robotsContent = content.toLowerCase();
			if (name === 'description') descriptionContent = content;
			if (name === 'mobile-web-app-capable' && content.toLowerCase() === 'yes') {
				hasMobileWebAppCapable = true;
			}
			if (name === 'twitter:url') {
				errors.push(`[${routePath}] Non-standard <meta name="twitter:url"> tag should be omitted`);
			}
			if (prop === 'og:title') ogTitle = content;
			if (prop === 'og:description') ogDescription = content;
			if (prop === 'og:url') ogUrl = content;
			if (prop === 'og:image') ogImage = content;
			if (name === 'twitter:card') twitterCard = content;

			if (prop === 'music:release_date') {
				const yrMatch = content.match(/^(\d{4})/);
				const yr = yrMatch ? Number.parseInt(yrMatch[1], 10) : NaN;
				if (!Number.isFinite(yr) || yr < 2026) {
					errors.push(
						`[${routePath}] Fictional or pre-2026 music:release_date meta tag: "${content}"`
					);
				}
			}
		}

		if (!hasMobileWebAppCapable) {
			errors.push(`[${routePath}] Missing <meta name="mobile-web-app-capable" content="yes">`);
		}

		// Verify `<title>` and `<link rel="canonical">` appear ABOVE iOS splash screens and modulepreloads
		const titlePos = headHtml.search(/<title\b/i);
		const splashPos = headHtml.search(/<link\b[^>]*rel=["']apple-touch-startup-image["']/i);
		const preloadPos = headHtml.search(/<link\b[^>]*rel=["']modulepreload["']/i);
		if (titlePos !== -1 && splashPos !== -1 && titlePos > splashPos) {
			errors.push(`[${routePath}] <title> is buried below apple-touch-startup-image links`);
		}
		if (titlePos !== -1 && preloadPos !== -1 && titlePos > preloadPos) {
			errors.push(`[${routePath}] <title> is buried below modulepreload links`);
		}

		const isNoindex = robotsContent.includes('noindex');
		const shouldBeNoindex = EXPECTED_NOINDEX_ROUTES.has(routePath);

		if (shouldBeNoindex && !isNoindex) {
			errors.push(
				`[${routePath}] Expected utility route to include <meta name="robots" content="noindex,...">`
			);
		}
		if (!shouldBeNoindex && isNoindex) {
			errors.push(`[${routePath}] Indexable catalog route unexpectedly marked noindex`);
		}

		// Exact single `<h1>` check across ALL pages
		const h1Matches = bodyWithoutScripts.match(/<h1\b[^>]*>/gi) || [];
		if (h1Matches.length !== 1) {
			errors.push(`[${routePath}] Expected exactly 1 <h1> element, found ${h1Matches.length}`);
		}

		// `<img>` audit across ALL pages
		const imgTags = bodyWithoutScripts.match(/<img\b[^>]*>/gi) || [];
		for (const imgTag of imgTags) {
			const alt = getAttr(imgTag, 'alt');
			const width = getAttr(imgTag, 'width');
			const height = getAttr(imgTag, 'height');
			const ariaHidden = getAttr(imgTag, 'aria-hidden');
			const role = getAttr(imgTag, 'role');
			const fetchPriority = (getAttr(imgTag, 'fetchpriority') || '').toLowerCase();
			const loading = (getAttr(imgTag, 'loading') || '').toLowerCase();

			if (alt === null) {
				errors.push(`[${routePath}] <img> missing alt attribute: ${imgTag}`);
			} else if (alt.trim() === '' && ariaHidden !== 'true' && role !== 'presentation') {
				errors.push(
					`[${routePath}] Decorative <img alt=""> must include aria-hidden="true" or role="presentation": ${imgTag}`
				);
			}

			if (!width || !height) {
				errors.push(`[${routePath}] <img> missing explicit width/height attributes: ${imgTag}`);
			}

			if (fetchPriority === 'high' && loading === 'lazy') {
				errors.push(
					`[${routePath}] <img> combines fetchpriority="high" with loading="lazy": ${imgTag}`
				);
			}
		}

		// `<audio>` preload audit across ALL pages
		const audioTags = bodyWithoutScripts.match(/<audio\b[^>]*>/gi) || [];
		for (const audioTag of audioTags) {
			const preload = (getAttr(audioTag, 'preload') || '').toLowerCase();
			if (preload !== 'none') {
				errors.push(`[${routePath}] <audio> must set preload="none" in static HTML: ${audioTag}`);
			}
		}

		// JSON-LD syntax & entity date/duration validation
		const ldJsonRegex =
			/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
		let ldMatch;
		let ldCount = 0;
		let hasTopTrackRecordingOf = false;
		let breadcrumbItemCount = 0;
		while ((ldMatch = ldJsonRegex.exec(html)) !== null) {
			ldCount += 1;
			try {
				const parsed = JSON.parse(ldMatch[1]);
				validateJsonLdNode(parsed, routePath, errors, shouldBeNoindex);
				const graphNodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
				for (const gNode of graphNodes) {
					if (gNode && gNode['@type'] === 'MusicRecording' && gNode.recordingOf) {
						hasTopTrackRecordingOf = true;
					}
					if (gNode && gNode['@type'] === 'BreadcrumbList' && Array.isArray(gNode.itemListElement)) {
						breadcrumbItemCount = gNode.itemListElement.length;
					}
				}
			} catch (err) {
				errors.push(
					`[${routePath}] Malformed JSON-LD script block: ${err instanceof Error ? err.message : String(err)}`
				);
			}
		}

		// Verify catalog hierarchy pages have matching BreadcrumbList depth and MusicComposition links
		const pathSegments = routePath.split('/').filter(Boolean);
		const isCatalogRoute =
			pathSegments.length >= 1 &&
			![
				'discography',
				'playlists',
				'radio',
				'behind-the-scenes',
				'privacy',
				'terms',
				'settings',
				'studio',
				'404'
			].includes(pathSegments[0]);
		if (isCatalogRoute) {
			const expectedCrumbs = pathSegments.length + 2; // Home + Discography + [artist, album?, track?]
			if (breadcrumbItemCount !== expectedCrumbs) {
				errors.push(
					`[${routePath}] Expected ${expectedCrumbs} BreadcrumbList items to match visible breadcrumb DOM, found ${breadcrumbItemCount}`
				);
			}
			if (pathSegments.length === 3 && !shouldBeNoindex && !hasTopTrackRecordingOf) {
				errors.push(
					`[${routePath}] Indexable track MusicRecording missing recordingOf (MusicComposition)`
				);
			}
		}

		if (shouldBeNoindex) {
			continue;
		}

		// Indexable-only checks
		const expectedCanonical = routePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${routePath}`;
		indexableCanonicalUrls.add(expectedCanonical);

		if (ldCount === 0) {
			errors.push(`[${routePath}] Indexable page has 0 JSON-LD structured data blocks`);
		}

		// Title uniqueness
		const titleMatch = headHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const pageTitle = titleMatch ? decodeEntities(titleMatch[1]) : '';
		if (!pageTitle) {
			errors.push(`[${routePath}] Missing or empty <title>`);
		} else if (seenTitles.has(pageTitle)) {
			errors.push(
				`[${routePath}] Duplicate <title> "${pageTitle}" (already used by ${seenTitles.get(pageTitle)})`
			);
		} else {
			seenTitles.set(pageTitle, routePath);
		}

		// Meta description uniqueness & length
		if (!descriptionContent) {
			errors.push(`[${routePath}] Missing or empty <meta name="description">`);
		} else {
			if (
				/\bundefined\b|\bNaN\b/.test(descriptionContent) ||
				/\bundefined\b|\bNaN\b/.test(pageTitle)
			) {
				errors.push(
					`[${routePath}] Unresolved "undefined" or "NaN" token in <title> or <meta name="description">`
				);
			}
			if (descriptionContent.length > 160) {
				errors.push(
					`[${routePath}] <meta name="description"> exceeds 160 chars (${descriptionContent.length}): "${descriptionContent}"`
				);
			}
			if (seenDescriptions.has(descriptionContent)) {
				errors.push(
					`[${routePath}] Duplicate <meta name="description"> (already used by ${seenDescriptions.get(descriptionContent)})`
				);
			} else {
				seenDescriptions.set(descriptionContent, routePath);
			}
		}

		// Canonical link verification
		const canonicalTags = headHtml.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || [];
		if (canonicalTags.length !== 1) {
			errors.push(
				`[${routePath}] Expected exactly 1 <link rel="canonical">, found ${canonicalTags.length}`
			);
		} else {
			const canonicalHref = getAttr(canonicalTags[0], 'href') || '';
			if (canonicalHref !== expectedCanonical) {
				errors.push(
					`[${routePath}] Canonical mismatch: expected "${expectedCanonical}", got "${canonicalHref}"`
				);
			}
		}

		// OpenGraph & Twitter card completeness
		if (!ogTitle || !ogDescription || !ogUrl || !ogImage || !twitterCard) {
			errors.push(
				`[${routePath}] Incomplete OpenGraph/Twitter tags (ogTitle=${Boolean(ogTitle)}, ogDescription=${Boolean(ogDescription)}, ogUrl=${Boolean(ogUrl)}, ogImage=${Boolean(ogImage)}, twitterCard=${Boolean(twitterCard)})`
			);
		} else if (ogUrl !== expectedCanonical) {
			errors.push(
				`[${routePath}] og:url mismatch: expected "${expectedCanonical}", got "${ogUrl}"`
			);
		}

		// Internal `<a href>` link graph & broken-link check
		const anchorTags = bodyWithoutScripts.match(/<a\b[^>]*>/gi) || [];
		for (const aTag of anchorTags) {
			const rawHref = decodeEntities(getAttr(aTag, 'href') || '');
			if (
				!rawHref ||
				rawHref.startsWith('#') ||
				rawHref.startsWith('mailto:') ||
				rawHref.startsWith('tel:')
			) {
				continue;
			}

			let internalPath;
			if (rawHref.startsWith('/')) {
				internalPath = rawHref;
			} else if (rawHref.startsWith(SITE_ORIGIN)) {
				internalPath = rawHref.slice(SITE_ORIGIN.length) || '/';
			} else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref)) {
				const resolved = new URL(rawHref, `${SITE_ORIGIN}${routePath}`);
				internalPath = resolved.pathname + resolved.search + resolved.hash;
			} else {
				continue;
			}

			const withoutHash = internalPath.split('#')[0] || '/';
			const cleanPath = withoutHash.split('?')[0] || '/';

			if (cleanPath !== '/' && cleanPath.endsWith('/')) {
				errors.push(`[${routePath}] Internal link contains trailing slash: "${rawHref}"`);
			}

			const normalizedTarget =
				cleanPath !== '/' && cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;

			if (allRoutePaths.has(normalizedTarget)) {
				if (normalizedTarget !== routePath && incomingLinkCounts.has(normalizedTarget)) {
					incomingLinkCounts.set(
						normalizedTarget,
						(incomingLinkCounts.get(normalizedTarget) || 0) + 1
					);
				}
			} else {
				// Allow static files inside build/ (e.g., icons, manifest, sitemaps)
				const staticCandidate = path.join(BUILD_DIR, normalizedTarget.slice(1));
				if (!fs.existsSync(staticCandidate)) {
					errors.push(`[${routePath}] Broken internal link target: "${rawHref}"`);
				}
			}
		}
	}

	// 3. Orphan catalog page check (every non-root indexable page must have >= 1 incoming internal `<a href>` link
	//    so search engine crawlers and keyboard users can reach every Artist, Album, Track, and Playlist naturally!)
	for (const [routePath, count] of incomingLinkCounts.entries()) {
		if (routePath === '/') continue;
		if (count === 0) {
			errors.push(`[${routePath}] Orphan indexable page: 0 incoming internal links`);
		}
	}

	// 4. Unified XML Sitemap (`build/sitemap.xml`) & category sitemaps parity check:
	//    Guarantees exact two-way set equality (`rootUrlSet` === `indexableCanonicalUrls` === `sitemapUrls`)
	//    so `sitemap.xml` never omits a live page and never lists a `noindex` or deleted page.
	const sitemapIndexPath = path.join(BUILD_DIR, 'sitemap.xml');
	if (fs.existsSync(sitemapIndexPath)) {
		const rootXml = fs.readFileSync(sitemapIndexPath, 'utf-8');
		if (!rootXml.includes('<urlset')) {
			errors.push('build/sitemap.xml is not a valid unified <urlset> document');
		} else {
			const rootLocs = [...rootXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
			const rootLastmods = [...rootXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) =>
				m[1].trim()
			);
			if (rootLastmods.length !== rootLocs.length) {
				errors.push(
					`build/sitemap.xml has ${rootLocs.length} <loc> tags but ${rootLastmods.length} <lastmod> tags`
				);
			}
			const rootUrlSet = new Set();
			for (const loc of rootLocs) {
				if (rootUrlSet.has(loc)) {
					errors.push(`Duplicate URL inside unified build/sitemap.xml: ${loc}`);
				}
				rootUrlSet.add(loc);
			}
			for (const builtUrl of indexableCanonicalUrls) {
				if (!rootUrlSet.has(builtUrl)) {
					errors.push(`Indexable built page missing from unified build/sitemap.xml: ${builtUrl}`);
				}
			}
			for (const smUrl of rootUrlSet) {
				if (!indexableCanonicalUrls.has(smUrl)) {
					errors.push(
						`Unified build/sitemap.xml contains URL that is not an indexable built page: ${smUrl}`
					);
				}
			}
		}
	}

	/** @type {Set<string>} */
	const sitemapUrls = new Set();
	/** @type {Record<string, number>} */
	const sitemapCounts = {};

	for (const childName of EXPECTED_CHILD_SITEMAPS) {
		const childPath = path.join(BUILD_DIR, 'sitemaps', childName);
		if (!fs.existsSync(childPath)) {
			errors.push(`Missing child sitemap: build/sitemaps/${childName}`);
			continue;
		}
		const xml = fs.readFileSync(childPath, 'utf-8');
		const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
		const lastmodMatches = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) =>
			m[1].trim()
		);
		sitemapCounts[childName] = locMatches.length;

		if (lastmodMatches.length !== locMatches.length) {
			errors.push(
				`build/sitemaps/${childName} has ${locMatches.length} <loc> tags but ${lastmodMatches.length} <lastmod> tags`
			);
		}
		for (const lm of lastmodMatches) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(lm)) {
				errors.push(`build/sitemaps/${childName} has invalid <lastmod> format: "${lm}"`);
			}
		}

		for (const loc of locMatches) {
			if (sitemapUrls.has(loc)) {
				errors.push(`Duplicate URL across XML sitemaps: ${loc}`);
			}
			sitemapUrls.add(loc);
		}
	}

	for (const builtUrl of indexableCanonicalUrls) {
		if (!sitemapUrls.has(builtUrl)) {
			errors.push(`Indexable built page missing from XML sitemaps: ${builtUrl}`);
		}
	}
	for (const smUrl of sitemapUrls) {
		if (!indexableCanonicalUrls.has(smUrl)) {
			errors.push(`XML sitemap contains URL that is not an indexable built page: ${smUrl}`);
		}
	}

	if (warnings.length > 0) {
		for (const w of warnings) {
			console.warn(`⚠️  ${w}`);
		}
	}

	if (errors.length > 0) {
		console.error(`\n❌ SEO Validation FAILED with ${errors.length} error(s):`);
		for (const err of errors.slice(0, 50)) {
			console.error(`   - ${err}`);
		}
		if (errors.length > 50) {
			console.error(`   ... and ${errors.length - 50} additional error(s).`);
		}
		process.exit(1);
	}

	const breakdown = EXPECTED_CHILD_SITEMAPS.map((n) => `${n}=${sitemapCounts[n] ?? 0}`).join(', ');
	console.log(
		`✅ SEO Validation PASSED: ${indexableCanonicalUrls.size} indexable pages, ${EXPECTED_NOINDEX_ROUTES.size} noindex utility routes, 0 duplicate titles/descriptions, 0 orphan pages, 100% sitemap parity (${breakdown}).`
	);
}

main();
