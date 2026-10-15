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
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base CDN domain for all hosted audio streams and album artwork
const CDN_BASE = 'https://assets.raggiesoft.com/engine-room-records/artists';

// Potential candidate paths for the raggiesoft-assets repository
const candidateAssetPaths = [
	path.resolve(__dirname, '../../raggiesoft-assets/engine-room-records/artists'),
	path.resolve(__dirname, '../../../raggiesoft-assets/engine-room-records/artists'),
	'/var/www/raggiesoft-assets/engine-room-records/artists'
];

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
 * Builds the canonical catalog of all artists, albums, and tracks.
 */
function buildCatalog() {
	const assetsDir = resolveAssetsDirectory();
	const outputPath = path.resolve(__dirname, '../src/lib/data/musicCatalog.json');

	if (!assetsDir) {
		console.warn('⚠️  Could not find local raggiesoft-assets directory.');
		if (fs.existsSync(outputPath)) {
			console.log('ℹ️  Retaining existing musicCatalog.json in src/lib/data.');
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

			// Resolve temporalCoverage and datePublished (ISO 8601)
			const temporalCoverage = albumData.temporalCoverage
				? String(albumData.temporalCoverage).trim()
				: albumData.narrativeReleaseDate
					? String(albumData.narrativeReleaseDate).trim()
					: '';
			const datePublished = albumData.datePublished
				? String(albumData.datePublished).trim()
				: albumData.albumRelease?.datePublished
					? String(albumData.albumRelease.datePublished).trim()
					: albumData.realReleaseDate
						? String(albumData.realReleaseDate).trim()
						: '';

			// Resolve narrative release year
			let year = '';
			const yearMatch = albumSlug.match(/^(\d{4})/);
			if (yearMatch) {
				year = yearMatch[1];
			} else if (temporalCoverage) {
				year = temporalCoverage.substring(0, 4);
			} else if (datePublished) {
				year = datePublished.substring(0, 4);
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

			// Process individual tracks and check physical audio file presence
			const formattedTracks = rawTracks.map((t, idx) => {
				const trackNum = typeof t.track === 'number' ? t.track : idx + 1;
				const discNum = typeof t.disc === 'number' ? t.disc : 1;
				const trackTitle = t.title || `Track ${trackNum}`;
				const isrc = t.isrc || '';
				const legacyTier = t.legacyTier || '';

				// Resolve audio file name first so we can check per-track lyrics/*.md files
				let fileName = t.fileName || '';
				if (!fileName && t.masterWavPath) {
					fileName = path.basename(t.masterWavPath);
				}

				// Extract lore note and lyrics from direct track definitions, per-album lyrics/*.md, or metadata.json
				let loreNote = t.loreNote || '';
				let lyrics = t.lyrics || '';

				if ((!loreNote || !lyrics) && fileName) {
					const trackMdPath = path.join(albumDir, 'lyrics', `${fileName}.md`);
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

				const hasPhysicalMp3 = Boolean(
					fileName && fs.existsSync(path.join(webMp3Dir, `${fileName}.mp3`))
				);

				const audioUrl = hasPhysicalMp3
					? `${CDN_BASE}/${artistSlug}/${albumSlug}/web-mp3/${fileName}.mp3`
					: '';

				// Detect WebVTT synchronized lyrics if available on disk
				let vttUrl = '';
				if (fileName) {
					if (fs.existsSync(path.join(albumDir, 'lyrics', `${fileName}.vtt`))) {
						vttUrl = `${CDN_BASE}/${artistSlug}/${albumSlug}/lyrics/${fileName}.vtt`;
					} else if (
						fs.existsSync(path.join(albumDir, 'streaming-services', 'lyrics', `${fileName}.vtt`))
					) {
						vttUrl = `${CDN_BASE}/${artistSlug}/${albumSlug}/streaming-services/lyrics/${fileName}.vtt`;
					}
				}

				// Format duration; if unrendered and duration is missing/zero, mark as In Studio
				let duration = t.duration || '0:00';
				if (!hasPhysicalMp3 && (duration === '0:00' || !duration)) {
					duration = 'In Studio';
				}

				return {
					id: `${artistSlug}-${albumSlug}-${discNum}-${trackNum}`,
					disc: discNum,
					track: trackNum,
					title: trackTitle,
					duration,
					isrc,
					legacyTier,
					loreNote,
					lyrics,
					audioUrl,
					vttUrl,
					isPlayable: hasPhysicalMp3
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

			// Match album against artist's albums.json manifest for DSP & Fourthwall store metadata
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

			catalog.push({
				id: `${artistSlug}-${albumSlug}`,
				slug: albumSlug,
				title: albumTitle,
				artist: artistName,
				artistSlug,
				artistLogo,
				artistSocialPreview,
				year,
				temporalCoverage,
				datePublished,
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
				spotifyId,
				appleId,
				amazonId,
				youtubeId,
				storeStandardUrl,
				storeAudiophileUrl,
				dspExempt,
				dspNotice,
				tracks: formattedTracks
			});
		}
	}

	// Sort catalog chronologically by ISO 8601 temporalCoverage/year, then title
	catalog.sort((a, b) => {
		const dateA = a.temporalCoverage || a.year || '9999';
		const dateB = b.temporalCoverage || b.year || '9999';
		if (dateA !== dateB) return dateA.localeCompare(dateB);
		return a.title.localeCompare(b.title);
	});

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
}

// Execute compilation
buildCatalog();
