/**
 * @license MIT
 * ============================================================================
 * vite.config.js — Build Bundler, Static PWA Adapter & Local Studio Dev API
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is Vite (`vite.config.js`)?
 *     Browsers don't natively understand `.svelte` component files or Tailwind
 *     CSS `@import 'tailwindcss'` directives out of the box. Vite is our lightning-fast
 *     build tool and local development server:
 *       - During `npm run dev`: Vite starts a local web server with instant
 *         Hot Module Replacement (HMR) and attaches our custom `/__studio_api/*`
 *         middleware so the local `/studio` editor can read/save lyrics & JSON.
 *       - During `npm run build`: Vite compiles all Svelte 5 Runes, Tailwind CSS
 *         v4 styles, and prerendered routes into static `.html`, `.js`, and `.css`
 *         files inside `build/` ready for Nginx on `music.raggiesoft.com`.
 *
 *   How this file connects to The Listening Room:
 *     1. `staticPwaAdapter()`: Custom SvelteKit adapter that writes prerendered
 *        HTML pages to `build/`, normalizes asset paths to `/_app/...`, hoists
 *        `<title>` and OpenGraph `<meta>` tags to the top of `<head>`, and creates
 *        `<route>/index.html` mirror files for zero-downtime static serving.
 *     2. `engineRoomStudioDevApi()`: Local-only Node HTTP middleware mounted at
 *        `/__studio_api/*` during `vite dev` (completely excluded from `build/`).
 *     3. `defineConfig(...)`: Wires together Studio Dev API + Tailwind CSS v4 +
 *        SvelteKit (with `runes: true` enforced globally).
 * ============================================================================
 */
// Node.js built-in modules for filesystem (`fs`), cross-OS paths (`path`), and running child scripts (`execFileSync`)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
// Official Tailwind CSS v4 Vite plugin (compiles `src/app.css` without needing PostCSS config)
import tailwindcss from '@tailwindcss/vite';
// Official SvelteKit Vite plugin (handles routing, SSR, prerendering, and `.svelte` compilation)
import { sveltekit } from '@sveltejs/kit/vite';
// Vite helper that provides IDE autocomplete for configuration properties
import { defineConfig } from 'vite';

/**
 * Custom static PWA adapter that exports static HTML/JS/CSS to `build/`
 * for zero-overhead Nginx static file serving with fallback routing.
 * @param {{ pages?: string, fallback?: string }} [options]
 * @returns {import('@sveltejs/kit').Adapter}
 */
function staticPwaAdapter(options = {}) {
	// Default output directory is `build/`, with `200.html` as the Single-Page App (SPA) fallback shell
	const out = options?.pages || 'build';
	const fallback = options?.fallback || '200.html';

	return {
		name: 'engine-room-static-pwa-adapter',
		// SvelteKit calls `adapt(builder)` at the very end of `vite build` once JS/CSS/SSR bundles are ready
		async adapt(builder) {
			// Step 1: Delete any previous `build/` folder (`rimraf`) and recreate an empty `build/` directory (`mkdirp`)
			builder.rimraf(out);
			builder.mkdirp(out);

			// Step 2: Write static client assets (`static/*` + `/_app/immutable/*`) and all prerendered `.html` routes
			builder.writeClient(out);
			builder.writePrerendered(out);

			// Step 3: Emit `build/200.html` fallback shell for client-side dynamic/offline PWA routing
			if (fallback) {
				builder.generateFallback(`${out}/${fallback}`);
			}

			// Step 4: Post-process generated HTML so social-media link previews (Discord, iMessage, Bluesky, Facebook)
			// always find `<title>`, `<link rel="canonical">`, and `og:*` / `twitter:*` meta tags within the first ~2 KB
			// of `<head>`, rather than buried underneath dozens of `<link rel="modulepreload">` tags.
			//
			// CRITICAL SVELTE 5 HYDRATION INVARIANT:
			//   SvelteKit emits `%sveltekit.head%` in three consecutive sections:
			//     1. Contiguous `<link href="/_app/immutable/..." rel="modulepreload">` links
			//     2. `<title>...</title>` + `<!--<hash>--> ...all <svelte:head> tags... <!---->`
			//     3. `<link href="/_app/immutable/assets/..." rel="stylesheet">`
			//   Never pluck individual `<meta>` or `<link>` tags out from inside `<!--<hash>-->...<!---->`,
			//   because Svelte 5's client `head(hash, ...)` hydration walks exact `nextSibling` offsets starting
			//   at `<!--<hash>-->`! Instead, we swap Section 1 (`modulepreload` links) and Section 2 (the entire
			//   atomic `<svelte:head>` block, untouched) so all SEO/OpenGraph tags sit at the top of `<head>` AND
			//   every DOM node inside `<!--<hash>-->...<!---->` stays 100% intact for Svelte 5 hydration!
			/** @param {string} rawHtml */
			function hoistSeoHeadTagsAbovePreloads(rawHtml) {
				const headEnd = rawHtml.indexOf('</head>');
				if (headEnd === -1) {
					return rawHtml;
				}
				const headContent = rawHtml.slice(0, headEnd);

				// Match the contiguous block of `<link href="/_app/immutable/..." rel="modulepreload">` lines
				// followed immediately by the intact `<svelte:head>` payload up to the stylesheet `<link>`!
				const svelteHeadSwapRegex =
					/((?:[ \t]*<link\s+href="\/_app\/immutable\/[^"]+"\s+rel="modulepreload"\s*\/?>\r?\n)+)([\s\S]*?)(?=[ \t]*<link\s+href="\/_app\/immutable\/assets\/)/;

				const swappedHead = headContent.replace(
					svelteHeadSwapRegex,
					(fullMatch, preloadBlock, svelteHeadBlock) => {
						// SPA fallback (`200.html`) has an empty `<svelte:head>` slot—leave it unchanged
						if (!svelteHeadBlock || !svelteHeadBlock.trim()) {
							return fullMatch;
						}
						const normalizedHeadBlock = svelteHeadBlock.endsWith('\n')
							? svelteHeadBlock
							: svelteHeadBlock + '\n';
						return normalizedHeadBlock + preloadBlock;
					}
				);

				if (swappedHead === headContent) {
					return rawHtml;
				}
				return swappedHead + rawHtml.slice(headEnd);
			}

			// Recursively walk every folder in `build/` to rewrite relative `../_app/` paths to `/_app/`
			// and apply `hoistSeoHeadTagsAbovePreloads` to every `.html` file.
			/** @param {string} dir */
			function normalizeHtmlAssetPaths(dir) {
				for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						normalizeHtmlAssetPaths(fullPath);
					} else if (entry.isFile() && entry.name.endsWith('.html')) {
						const html = fs.readFileSync(fullPath, 'utf-8');
						const assetFixed = html
							.replace(/(href|src)="(\.\.?\/)+_app\//g, '$1="/_app/')
							.replace(/import\("(\.\.?\/)+_app\//g, 'import("/_app/');
						const normalized = hoistSeoHeadTagsAbovePreloads(assetFixed);
						if (normalized !== html) {
							fs.writeFileSync(fullPath, normalized, 'utf-8');
						}
					}
				}
			}
			normalizeHtmlAssetPaths(out);

			// Step 5: Mirror `<route>.html` (e.g., `build/discography.html`) to `build/discography/index.html`
			// so static file servers resolve both clean paths and directory lookups seamlessly.
			// Mirror prerendered `<route>.html` files (`trailingSlash = 'never'`) to
			// `<route>/index.html` as a zero-downtime static bridge while keeping
			// `<route>.html` at its canonical path for `try_files $uri $uri.html =404;`
			// and `error_page 404 /404.html;`.
			/** @param {string} dir */
			function mirrorDirectoryIndexes(dir) {
				for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						// Skip asset/sitemap folders that never contain prerendered route pages
						if (entry.name === '_app' || entry.name === 'sitemaps' || entry.name === 'icons') {
							continue;
						}
						mirrorDirectoryIndexes(fullPath);
					} else if (entry.isFile() && entry.name.endsWith('.html')) {
						// Skip root `index.html`, SPA fallback `200.html`, and error page `404.html`
						if (
							entry.name === 'index.html' ||
							entry.name === '200.html' ||
							entry.name === '404.html'
						) {
							continue;
						}
						// Strip `.html` (5 characters) to get the directory name and copy `<route>.html` -> `<route>/index.html`
						const baseName = entry.name.slice(0, -5);
						const indexTarget = path.join(dir, baseName, 'index.html');
						if (!fs.existsSync(indexTarget)) {
							fs.mkdirSync(path.dirname(indexTarget), { recursive: true });
							fs.copyFileSync(fullPath, indexTarget);
						}
					}
				}
			}
			mirrorDirectoryIndexes(out);
		}
	};
}

/**
 * Local Vite Dev Server Middleware for the Engine Room Records Studio IDE (`/studio`).
 * Provides direct read/write access to `../raggiesoft-assets/engine-room-records/artists/`
 * when running `npm run dev` or `./studio.sh` locally, without interfering with
 * static production builds (`vite build`).
 *
 * Endpoints:
 * - GET  /__studio_api/status
 * - GET  /__studio_api/vtt?artist=...&album=...&fileName=...
 * - GET  /__studio_api/audio?artist=...&album=...&fileName=...
 * - POST /__studio_api/save-vtt
 * - POST /__studio_api/save-metadata
 *
 * @returns {import('vite').Plugin}
 */
function engineRoomStudioDevApi() {
	// Locate the local `raggiesoft-assets/engine-room-records/artists` sibling folder on disk
	const candidateDirs = [
		path.resolve(import.meta.dirname, '../../../raggiesoft-assets/engine-room-records/artists'),
		path.resolve(import.meta.dirname, '../raggiesoft-assets/engine-room-records/artists')
	];
	const artistsDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
	const buildCatalogScript = path.resolve(import.meta.dirname, 'scripts/build-catalog.js');

	/**
	 * Safely resolves a path inside `artistsDir` and prevents path traversal.
	 * Security note: If someone passed `"../../etc/passwd"`, `resolved.startsWith(...)`
	 * catches that it escaped `artistsDir` and throws an error immediately.
	 * @param  {...string} segments
	 */
	function resolveSafeArtistPath(...segments) {
		const resolved = path.resolve(artistsDir, ...segments);
		if (!resolved.startsWith(artistsDir + path.sep)) {
			throw new Error('Invalid path outside artists directory');
		}
		return resolved;
	}

	/**
	 * Reads JSON body from an incoming Node HTTP request.
	 * In raw Node.js HTTP servers, POST request bodies arrive in streaming chunks
	 * (`req.on('data', ...)` followed by `req.on('end', ...)`). Wrapping this in a
	 * `new Promise(...)` lets our route handlers simply write `await readJsonBody(req)`.
	 * @param {import('node:http').IncomingMessage} req
	 * @returns {Promise<any>}
	 */
	function readJsonBody(req) {
		return new Promise((resolve, reject) => {
			let data = '';
			req.on('data', (chunk) => {
				data += chunk;
			});
			req.on('end', () => {
				try {
					resolve(data ? JSON.parse(data) : {});
				} catch (err) {
					reject(err);
				}
			});
			req.on('error', reject);
		});
	}

	/**
	 * Sends a JSON response with UTF-8 encoding and the given HTTP status code (e.g., 200 OK, 400 Bad Request).
	 * @param {import('node:http').ServerResponse} res
	 * @param {number} statusCode
	 * @param {any} payload
	 */
	function sendJson(res, statusCode, payload) {
		res.statusCode = statusCode;
		res.setHeader('Content-Type', 'application/json; charset=utf-8');
		res.end(JSON.stringify(payload));
	}

	return {
		name: 'engine-room-studio-dev-api',
		// `configureServer(server)` ONLY runs during `vite dev`—never during production `vite build`!
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				// Ignore normal page/asset requests; pass them along to SvelteKit via `next()`
				if (!req.url || !req.url.startsWith('/__studio_api/')) {
					return next();
				}

				const parsedUrl = new URL(req.url, 'http://localhost');
				const pathname = parsedUrl.pathname;

				try {
					// 1. GET /__studio_api/status — Tells `/studio` UI whether local disk write mode is available
					if (req.method === 'GET' && pathname === '/__studio_api/status') {
						return sendJson(res, 200, {
							available: fs.existsSync(artistsDir),
							artistsDir
						});
					}

					// 2. GET /__studio_api/vtt — Reads raw `.vtt` synchronized lyrics file from local disk
					if (req.method === 'GET' && pathname === '/__studio_api/vtt') {
						const artist = parsedUrl.searchParams.get('artist') || '';
						const album = parsedUrl.searchParams.get('album') || '';
						const fileName = parsedUrl.searchParams.get('fileName') || '';
						if (!artist || !album || !fileName) {
							return sendJson(res, 400, { error: 'Missing artist, album, or fileName' });
						}

						const vttPath = resolveSafeArtistPath(artist, album, 'lyrics', `${fileName}.vtt`);
						if (!fs.existsSync(vttPath)) {
							return sendJson(res, 200, {
								exists: false,
								vttContent: '',
								verified: false,
								vttPath
							});
						}

						const vttContent = fs.readFileSync(vttPath, 'utf-8');
						const verified = vttContent.includes('SYNC_TYPE: HUMAN_VERIFIED');
						return sendJson(res, 200, {
							exists: true,
							vttContent,
							verified,
							vttPath
						});
					}

					// 3. GET /__studio_api/audio (Local disk M4A stream with HTTP Range support)
					//    Implements HTTP 206 Partial Content byte-range streaming so the `/studio`
					//    waveform/lyric-timing editor can scrub freely across local `.m4a` files.
					if (req.method === 'GET' && pathname === '/__studio_api/audio') {
						const artist = parsedUrl.searchParams.get('artist') || '';
						const album = parsedUrl.searchParams.get('album') || '';
						const fileName = parsedUrl.searchParams.get('fileName') || '';
						if (!artist || !album || !fileName) {
							return sendJson(res, 400, { error: 'Missing artist, album, or fileName' });
						}

						const m4aPath = resolveSafeArtistPath(artist, album, 'm4a', `${fileName}.m4a`);
						const streamM4aPath = resolveSafeArtistPath(
							artist,
							album,
							'streaming-services',
							'm4a',
							`${fileName}.m4a`
						);
						const targetAudioPath = fs.existsSync(m4aPath)
							? m4aPath
							: fs.existsSync(streamM4aPath)
								? streamM4aPath
								: null;

						if (!targetAudioPath) {
							res.statusCode = 404;
							return res.end('Audio file not found on local disk');
						}

						const stat = fs.statSync(targetAudioPath);
						const total = stat.size;
						const range = req.headers.range;

						// If the `<audio>` tag sent a `Range: bytes=start-end` header, stream just that byte slice (HTTP 206)
						if (range) {
							const parts = range.replace(/bytes=/, '').split('-');
							const start = parseInt(parts[0], 10);
							const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
							const chunkSize = end - start + 1;
							res.writeHead(206, {
								'Content-Range': `bytes ${start}-${end}/${total}`,
								'Accept-Ranges': 'bytes',
								'Content-Length': chunkSize,
								'Content-Type': 'audio/mp4'
							});
							fs.createReadStream(targetAudioPath, { start, end }).pipe(res);
							return;
						}

						// Otherwise stream the entire audio file from byte 0 (HTTP 200)
						res.writeHead(200, {
							'Content-Length': total,
							'Accept-Ranges': 'bytes',
							'Content-Type': 'audio/mp4'
						});
						fs.createReadStream(targetAudioPath).pipe(res);
						return;
					}

					// 4. POST /__studio_api/save-vtt — Saves human-verified WebVTT cues to disk & rebuilds catalog
					if (req.method === 'POST' && pathname === '/__studio_api/save-vtt') {
						const body = await readJsonBody(req);
						const { artistSlug, albumId, fileName, vttContent } = body;
						if (!artistSlug || !albumId || !fileName || typeof vttContent !== 'string') {
							return sendJson(res, 400, {
								error: 'Missing artistSlug, albumId, fileName, or vttContent'
							});
						}

						// Guarantee the Harper human-verified header is present
						let normalizedVtt = vttContent.trim();
						if (!normalizedVtt.startsWith('WEBVTT')) {
							normalizedVtt = `WEBVTT\nNOTE SYNC_TYPE: HUMAN_VERIFIED\n\n${normalizedVtt}`;
						} else if (!normalizedVtt.includes('SYNC_TYPE: HUMAN_VERIFIED')) {
							normalizedVtt = normalizedVtt.replace(
								/^WEBVTT[^\n]*\n?/,
								'WEBVTT\nNOTE SYNC_TYPE: HUMAN_VERIFIED\n\n'
							);
						}
						normalizedVtt += '\n';

						const primaryLyricsDir = resolveSafeArtistPath(artistSlug, albumId, 'lyrics');
						fs.mkdirSync(primaryLyricsDir, { recursive: true });
						const primaryVttPath = path.join(primaryLyricsDir, `${fileName}.vtt`);
						fs.writeFileSync(primaryVttPath, normalizedVtt, 'utf-8');

						// Also mirror to streaming-services/lyrics if streaming-services exists
						const streamingDir = resolveSafeArtistPath(artistSlug, albumId, 'streaming-services');
						let mirroredVttPath = null;
						if (fs.existsSync(streamingDir)) {
							const streamingLyricsDir = path.join(streamingDir, 'lyrics');
							fs.mkdirSync(streamingLyricsDir, { recursive: true });
							mirroredVttPath = path.join(streamingLyricsDir, `${fileName}.vtt`);
							fs.writeFileSync(mirroredVttPath, normalizedVtt, 'utf-8');
						}

						// Rebuild catalog so vttVerified is updated in musicCatalog.json & catalog.json
						execFileSync(process.execPath, [buildCatalogScript], {
							cwd: import.meta.dirname,
							stdio: 'ignore'
						});

						return sendJson(res, 200, {
							ok: true,
							primaryVttPath,
							mirroredVttPath
						});
					}

					// 5. POST /__studio_api/save-metadata — Updates `album.json`, `tracks.json`, and `lyrics/{fileName}.md`
					if (req.method === 'POST' && pathname === '/__studio_api/save-metadata') {
						const body = await readJsonBody(req);
						const { artistSlug, albumId, albumUpdates, trackUpdates } = body;
						if (!artistSlug || !albumId) {
							return sendJson(res, 400, { error: 'Missing artistSlug or albumId' });
						}

						const albumDir = resolveSafeArtistPath(artistSlug, albumId);
						const savedFiles = [];

						// 5A. Update album.json if albumUpdates provided
						if (albumUpdates && typeof albumUpdates === 'object') {
							const albumJsonPath = path.join(albumDir, 'album.json');
							if (fs.existsSync(albumJsonPath)) {
								const albumJson = JSON.parse(fs.readFileSync(albumJsonPath, 'utf-8'));
								if (typeof albumUpdates.title === 'string') albumJson.name = albumUpdates.title;
								if (typeof albumUpdates.subtitle === 'string') {
									if (albumUpdates.subtitle.trim()) {
										albumJson.subtitle = albumUpdates.subtitle.trim();
									} else {
										delete albumJson.subtitle;
									}
								}
								if (typeof albumUpdates.genre === 'string') albumJson.genre = albumUpdates.genre;
								if (typeof albumUpdates.year === 'string') {
									albumJson.temporalCoverage = albumUpdates.year;
								}
								if (typeof albumUpdates.datePublished === 'string') {
									albumJson.datePublished = albumUpdates.datePublished;
								}
								if (typeof albumUpdates.upc === 'string') {
									albumJson.gtin12 = albumUpdates.upc;
								}
								if (typeof albumUpdates.description === 'string') {
									albumJson.description = albumUpdates.description;
								}
								if (Array.isArray(albumUpdates.linerNotes)) {
									albumJson.linerNotes = albumUpdates.linerNotes.filter(
										(/** @type {string} */ p) => p && p.trim()
									);
								}
								fs.writeFileSync(albumJsonPath, JSON.stringify(albumJson, null, 2) + '\n', 'utf-8');
								savedFiles.push(albumJsonPath);
							}
						}

						// 5B. Update tracks.json and lyrics/{fileName}.md if trackUpdates provided
						if (trackUpdates && typeof trackUpdates === 'object' && trackUpdates.fileName) {
							const tracksJsonPath = path.join(albumDir, 'tracks.json');
							if (fs.existsSync(tracksJsonPath)) {
								const tracksData = JSON.parse(fs.readFileSync(tracksJsonPath, 'utf-8'));
								const updateTrackEntry = (/** @type {any} */ t) => {
									if (t.fileName === trackUpdates.fileName) {
										if (typeof trackUpdates.title === 'string') t.title = trackUpdates.title;
										if (typeof trackUpdates.isrc === 'string') t.isrc = trackUpdates.isrc;
										if (typeof trackUpdates.legacyTier === 'string') {
											t.legacyTier = trackUpdates.legacyTier;
										}
										if (typeof trackUpdates.stylePrompt === 'string') {
											t.stylePrompt = trackUpdates.stylePrompt;
										}
										if (typeof trackUpdates.loreNote === 'string') {
											t.loreNote = trackUpdates.loreNote;
										}
									}
								};

								// Handle all three supported `tracks.json` shapes (flat array, `{ discs: [...] }`, or `{ tracks: [...] }`)
								if (Array.isArray(tracksData)) {
									tracksData.forEach(updateTrackEntry);
								} else if (tracksData && Array.isArray(tracksData.discs)) {
									tracksData.discs.forEach((/** @type {any} */ d) => {
										if (Array.isArray(d.tracks)) d.tracks.forEach(updateTrackEntry);
									});
								} else if (tracksData && Array.isArray(tracksData.tracks)) {
									tracksData.tracks.forEach(updateTrackEntry);
								}

								fs.writeFileSync(
									tracksJsonPath,
									JSON.stringify(tracksData, null, 2) + '\n',
									'utf-8'
								);
								savedFiles.push(tracksJsonPath);
							}

							// Update lyrics/{fileName}.md
							if (
								typeof trackUpdates.loreNote === 'string' ||
								typeof trackUpdates.lyrics === 'string'
							) {
								const lyricsDir = path.join(albumDir, 'lyrics');
								fs.mkdirSync(lyricsDir, { recursive: true });
								const mdPath = path.join(lyricsDir, `${trackUpdates.fileName}.md`);
								const loreText = (trackUpdates.loreNote || '').trim();
								const lyricsText = (trackUpdates.lyrics || '').trim();
								const mdOut = `**LORE NOTE:**\n${loreText}\n\n**LYRICS:**\n${lyricsText}\n`;
								fs.writeFileSync(mdPath, mdOut, 'utf-8');
								savedFiles.push(mdPath);
							}
						}

						// Rebuild catalog so musicCatalog.json & catalog.json reflect changes immediately
						execFileSync(process.execPath, [buildCatalogScript], {
							cwd: import.meta.dirname,
							stdio: 'ignore'
						});

						return sendJson(res, 200, {
							ok: true,
							savedFiles
						});
					}

					return sendJson(res, 404, { error: 'Unknown Studio API endpoint' });
				} catch (err) {
					return sendJson(res, 500, {
						error: err instanceof Error ? err.message : String(err)
					});
				}
			});
		}
	};
}

// ============================================================================
// MAIN VITE CONFIGURATION EXPORT
// ============================================================================
export default defineConfig({
	// Plugins run in order: Studio local API -> Tailwind CSS v4 compiler -> SvelteKit
	plugins: [
		engineRoomStudioDevApi(),
		tailwindcss(),
		sveltekit({
			// Export static HTML/JS/CSS into `build/` with `200.html` SPA fallback
			adapter: staticPwaAdapter({ pages: 'build', fallback: '200.html' }),
			paths: {
				// Emit root-absolute `/_app/...` URLs rather than relative `../_app/...` URLs
				relative: false
			},
			compilerOptions: {
				// Globally enable Svelte 5 Runes mode (`$state`, `$derived`, `$effect`, `$props`)
				runes: true
			}
		})
	]
});
