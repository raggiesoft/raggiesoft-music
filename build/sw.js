/**
 * @license MIT
 * ============================================================================
 * static/sw.js — Progressive Web App (PWA) Service Worker
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is a Service Worker?
 *     Normally, JavaScript stops running the moment you close a browser tab,
 *     and if your Wi-Fi drops, clicking a link shows the browser's dinosaur /
 *     "No Internet" error screen. A Service Worker (`sw.js`) is a special
 *     background script installed by the browser for `music.raggiesoft.com`.
 *     It sits like a smart local proxy between the web app and the internet,
 *     saving ("caching") copies of HTML, CSS, JavaScript, and icons inside the
 *     browser's Cache Storage API (`caches`) so the app loads fast and can
 *     still open its shell offline!
 *
 *   Note on `self`:
 *     Because a Service Worker runs on a background thread without a webpage
 *     DOM, there is no `window` or `document` object here. Instead, `self`
 *     refers to the global `ServiceWorkerGlobalScope`.
 *
 *   Architecture & Five Caching Strategies Used Here:
 *     1. App Shell Pre-caching (`install` event): Downloads the home page shell
 *        and core app icons into `CACHE_NAME` right when the worker installs.
 *     2. Cache Rotation (`activate` event): Deletes outdated cache buckets
 *        (like `v5` when upgrading to `v6`) so old code never lingers.
 *     3. Audio Streaming & Crawler Bypass (`fetch` event): Lets `.mp3` / `.wav`
 *        streams and `Range` header requests go straight to the CDN (`206 Partial
 *        Content`) so scrubbing forward/backward in a long rock opera is instant.
 *     4. Network-First for HTML Navigation: Always tries the live internet first
 *        so listeners see newly released albums, falling back to cache if offline.
 *     5. Cache-First for Immutable Bundles (`/_app/**`, `/icons/**`): SvelteKit
 *        puts content hashes in filenames (`/_app/immutable/...`), meaning once
 *        downloaded they never change—so serving them straight from `STATIC_CACHE`
 *        gives near-zero-millisecond loads!
 * ============================================================================
 */

// Versioned cache bucket names. Bumping `v6` -> `v7` in a future release triggers
// automatic cleanup of old cached assets inside the `activate` listener below.
const CACHE_NAME = 'err-pwa-v6';
const STATIC_CACHE = 'err-static-v6';

// Core "App Shell" URLs saved immediately when the Service Worker installs.
// Exclude /manifest.json from precache and bypass in fetch so ManifestUpdateManager
// always reads live `launch_handler` and `handle_links` updates directly.
const PRECACHE_ASSETS = [
	'/',
	'/favicon.ico?v=3',
	'/favicon.svg?v=3',
	'/icons/icon-192.png?v=3',
	'/icons/icon-512.png?v=3',
	'/icons/apple-touch-icon.png'
];

// ============================================================================
// LIFECYCLE EVENT 1: `install`
// Fires once when the browser downloads a brand-new or updated `sw.js` file.
// ============================================================================
self.addEventListener('install', (event) => {
	// `event.waitUntil(...)` tells the browser not to consider installation
	// finished until the Promise inside (opening the cache & downloading all
	// `PRECACHE_ASSETS`) resolves.
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_ASSETS);
		})
	);
	// Activate this new Service Worker immediately instead of waiting for all
	// open Listening Room tabs to be closed first.
	self.skipWaiting();
});

// ============================================================================
// LIFECYCLE EVENT 2: `activate`
// Fires right after `install` finishes and this Service Worker takes control.
// ============================================================================
self.addEventListener('activate', (event) => {
	// List every cache bucket stored for `music.raggiesoft.com` and delete any
	// bucket whose name doesn't match our current `CACHE_NAME` or `STATIC_CACHE`.
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
					.map((key) => caches.delete(key))
			);
		})
	);
	// Immediately take control of any open Listening Room tabs in the browser.
	self.clients.claim();
});

// ============================================================================
// LIFECYCLE EVENT 3: `fetch`
// Fires every single time the webpage requests a file, page, image, or stream.
// Calling `event.respondWith(...)` lets us supply a custom or cached Response;
// returning early (`return;`) tells the browser to handle the request normally.
// ============================================================================
self.addEventListener('fetch', (event) => {
	const request = event.request;
	// Parse the request URL string into a structured `URL` object (`.pathname`, `.origin`, etc.)
	const url = new URL(request.url);

	// Bypass non-GET requests (such as POST calls to `/__studio_api/*` in dev),
	// live PWA manifest checks, and SEO/crawler verification files (`robots.txt`, `sitemap.xml`).
	if (
		request.method !== 'GET' ||
		url.pathname === '/manifest.json' ||
		url.pathname === '/robots.txt' ||
		url.pathname === '/sitemap.xml' ||
		url.pathname.startsWith('/sitemaps/') ||
		url.pathname.endsWith('.txt')
	) {
		return;
	}

	// Audio stream bypass: HTML5 `<audio>` elements use HTTP `Range: bytes=...` headers
	// and `206 Partial Content` responses so users can jump straight to minute 10:00 of a song
	// without downloading the whole file first. Standard Cache API does not support partial
	// 206 responses cleanly, so we let the browser stream audio directly from our CDN.
	if (
		url.pathname.endsWith('.mp3') ||
		url.pathname.endsWith('.wav') ||
		url.pathname.endsWith('.ogg') ||
		url.pathname.endsWith('.flac') ||
		request.headers.has('range')
	) {
		return;
	}

	// 0. Offline/PWA safeguard: Normalize legacy `/artists/<slug>` deep links to root `/<slug>` routes
	// (`request.mode === 'navigate'` means the user clicked a link or typed a URL for a full page load)
	if (request.mode === 'navigate' && /^\/artists\//i.test(url.pathname)) {
		const targetUrl = new URL(url.href);
		targetUrl.pathname = url.pathname.replace(/^\/artists\//i, '/');
		event.respondWith(Response.redirect(targetUrl.href, 301));
		return;
	}

	// 1. Navigation requests (HTML pages): "Network-First, Cache-Fallback" strategy.
	//    Try fetching the freshest HTML from the server first. If it succeeds (`response.ok`),
	//    clone the response stream (because an HTTP Response body can only be read once!) and
	//    store a copy in `CACHE_NAME`. If the user is offline (`.catch()`), serve the cached
	//    page—or fall back to the cached home shell `'/'`.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() => {
					return caches.match(request).then((cached) => {
						return cached || caches.match('/');
					});
				})
		);
		return;
	}

	// 2. Static Assets (`/_app/**`, `/icons/**`): "Cache-First, Network-Fallback" strategy.
	//    Also defensively rewrites any nested `/.../_app/` path back to root `/_app/`.
	//    If `caches.match(...)` finds the JS/CSS/icon in `STATIC_CACHE`, return it immediately
	//    without touching the network; otherwise fetch it once and save a clone for next time.
	if (url.pathname.includes('/_app/') || url.pathname.startsWith('/icons/')) {
		const normalizedRequest =
			url.pathname.includes('/_app/') && !url.pathname.startsWith('/_app/')
				? new Request(new URL(url.pathname.slice(url.pathname.indexOf('/_app/')), url.origin), request)
				: request;
		event.respondWith(
			caches.match(normalizedRequest).then((cached) => {
				if (cached) return cached;
				return fetch(normalizedRequest).then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches.open(STATIC_CACHE).then((cache) => cache.put(normalizedRequest, copy));
					}
					return response;
				});
			})
		);
		return;
	}

	// 3. Default strategy for all other GET requests (such as external artwork or `.vtt` files):
	//    Fetch from the network, falling back to any cached match if offline.
	event.respondWith(
		fetch(request).catch(() => caches.match(request))
	);
});
