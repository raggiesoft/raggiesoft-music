/**
 * @license MIT
 * ============================================================================
 * vite.config.js
 * ============================================================================
 * Vite 8 configuration for Engine Room Records (music.raggiesoft.com).
 * Configures Tailwind CSS v4, a dedicated static PWA adapter that outputs
 * production-ready HTML/JS/CSS bundles for high-performance Nginx hosting,
 * and the local Studio IDE filesystem middleware (`/__studio_api`) for
 * writing human-verified VTT files (`SYNC_TYPE: HUMAN_VERIFIED`), album
 * metadata, and track lore directly to `raggiesoft-assets` during `vite dev`.
 * ============================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * Custom static PWA adapter that exports static HTML/JS/CSS to `build/`
 * for zero-overhead Nginx static file serving with fallback routing.
 * @param {{ pages?: string, fallback?: string }} [options]
 * @returns {import('@sveltejs/kit').Adapter}
 */
function staticPwaAdapter(options = {}) {
	const out = options?.pages || 'build';
	const fallback = options?.fallback || '200.html';

	return {
		name: 'engine-room-static-pwa-adapter',
		async adapt(builder) {
			builder.rimraf(out);
			builder.mkdirp(out);

			builder.writeClient(out);
			builder.writePrerendered(out);

			if (fallback) {
				builder.generateFallback(`${out}/${fallback}`);
			}
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
	const candidateDirs = [
		path.resolve(import.meta.dirname, '../../../raggiesoft-assets/engine-room-records/artists'),
		path.resolve(import.meta.dirname, '../raggiesoft-assets/engine-room-records/artists')
	];
	const artistsDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
	const buildCatalogScript = path.resolve(import.meta.dirname, 'scripts/build-catalog.js');

	/**
	 * Safely resolves a path inside `artistsDir` and prevents path traversal.
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
	 * Sends a JSON response.
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
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url || !req.url.startsWith('/__studio_api/')) {
					return next();
				}

				const parsedUrl = new URL(req.url, 'http://localhost');
				const pathname = parsedUrl.pathname;

				try {
					// 1. GET /__studio_api/status
					if (req.method === 'GET' && pathname === '/__studio_api/status') {
						return sendJson(res, 200, {
							available: fs.existsSync(artistsDir),
							artistsDir
						});
					}

					// 2. GET /__studio_api/vtt
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

						res.writeHead(200, {
							'Content-Length': total,
							'Accept-Ranges': 'bytes',
							'Content-Type': 'audio/mp4'
						});
						fs.createReadStream(targetAudioPath).pipe(res);
						return;
					}

					// 4. POST /__studio_api/save-vtt
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

					// 5. POST /__studio_api/save-metadata
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
								fs.writeFileSync(
									albumJsonPath,
									JSON.stringify(albumJson, null, 2) + '\n',
									'utf-8'
								);
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

export default defineConfig({
	plugins: [
		engineRoomStudioDevApi(),
		tailwindcss(),
		sveltekit({
			adapter: staticPwaAdapter({ pages: 'build', fallback: '200.html' }),
			compilerOptions: {
				runes: true
			}
		})
	]
});
