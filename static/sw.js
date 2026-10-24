/**
 * @license MIT
 * ============================================================================
 * sw.js (Service Worker)
 * ============================================================================
 * Core Progressive Web App Service Worker for Engine Room Records (music.raggiesoft.com).
 *
 * Architecture & Caching Strategies:
 * 1. App Shell Pre-caching (Install): Pre-caches the offline shell, manifest,
 *    and branding icons.
 * 2. Cache Rotation (Activate): Clears obsolete caches upon version increment.
 * 3. Cache-First (Static Assets): Delivers compiled JS/CSS bundles and icons
 *    instantly from cache, updating in background.
 * 4. Network-First (Navigation): Always attempts to fetch the latest catalog
 *    pages, falling back to cached shell if offline.
 * 5. Audio Streaming Bypass: Audio files (.mp3, .wav, .flac) and Range requests
 *    bypass caching to maintain smooth HTTP 206 scrubbing and streaming.
 * ============================================================================
 */

const CACHE_NAME = 'err-pwa-v4';
const STATIC_CACHE = 'err-static-v4';

const PRECACHE_ASSETS = [
	'/',
	'/manifest.json',
	'/favicon.ico?v=2',
	'/favicon.svg?v=2',
	'/icons/icon-192.png?v=2',
	'/icons/icon-512.png',
	'/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_ASSETS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
					.map((key) => caches.delete(key))
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	const url = new URL(request.url);

	// Bypass non-GET requests
	if (request.method !== 'GET') {
		return;
	}

	// Audio stream bypass: allow native browser handling for Range / 206 Partial Content
	if (
		url.pathname.endsWith('.mp3') ||
		url.pathname.endsWith('.wav') ||
		url.pathname.endsWith('.ogg') ||
		url.pathname.endsWith('.flac') ||
		request.headers.has('range')
	) {
		return;
	}

	// 0. Normalize legacy /artists/<slug> deep links to root /<slug> routes
	if (request.mode === 'navigate' && /^\/artists\//i.test(url.pathname)) {
		const targetUrl = new URL(url.href);
		targetUrl.pathname = url.pathname.replace(/^\/artists\//i, '/');
		event.respondWith(Response.redirect(targetUrl.href, 301));
		return;
	}

	// 1. Navigation requests (HTML pages): Network-first with cache fallback
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

	// 2. Static Assets (/_app/**, /icons/**): Cache-first (also rewrite any nested /.../_app/ requests to root /_app/)
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

	// Default: Network with cache fallback
	event.respondWith(
		fetch(request).catch(() => caches.match(request))
	);
});

