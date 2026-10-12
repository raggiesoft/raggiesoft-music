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

		// Discover all potential album directories for this artist
		const albumFolders = fs
			.readdirSync(artistDir)
			.filter((name) => {
				const p = path.join(artistDir, name);
				if (!fs.statSync(p).isDirectory() || name.startsWith('.')) return false;
				// Skip non-album directories and known typo folders
				if (['master-wav', 'story', 'lyrics', 'christmas-album'].includes(name)) return false;
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
			let albumTitle = albumData.name;
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
				: '';
			const datePublished = albumData.datePublished
				? String(albumData.datePublished).trim()
				: (albumData.albumRelease?.datePublished
					? String(albumData.albumRelease.datePublished).trim()
					: '');

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
			const isRockOpera =
				genre.toLowerCase().includes('rock opera') ||
				description.toLowerCase().includes('rock opera') ||
				albumTitle.toLowerCase().includes('book 1') ||
				albumTitle.toLowerCase().includes('book 2') ||
				albumTitle.toLowerCase().includes('book 3');

			// Resolve cover artwork URL
			let artwork = `${CDN_BASE}/${artistSlug}/${albumSlug}/album-art.jpg`;
			if (fs.existsSync(path.join(albumDir, 'album-art.png'))) {
				artwork = `${CDN_BASE}/${artistSlug}/${albumSlug}/album-art.png`;
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

				// Extract lore note and lyrics from metadata.json or direct track definitions
				let loreNote = t.loreNote || '';
				let lyrics = t.lyrics || '';

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

				// Resolve audio file name and test physical presence on disk
				let fileName = t.fileName || '';
				if (!fileName && t.masterWavPath) {
					fileName = path.basename(t.masterWavPath);
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

			catalog.push({
				id: `${artistSlug}-${albumSlug}`,
				slug: albumSlug,
				title: albumTitle,
				artist: artistName,
				artistSlug,
				year,
				temporalCoverage,
				datePublished,
				genre,
				isRockOpera,
				status,
				statusLabel,
				playableTrackCount,
				totalTracksCount,
				artwork,
				description,
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
