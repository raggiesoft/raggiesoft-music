<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * src/routes/studio/+page.svelte
	 * ============================================================================
	 * Engine Room Records — Local Studio IDE & DistroKid-Style Hold-Spacebar
	 * VTT Lyric Synchronizer (`/studio`).
	 *
	 * Architectural Overview:
	 * 1. DistroKid-Style Hold-Spacebar VTT Synchronizer:
	 *    - Loads any Artist -> Album -> Track from `musicCatalog.json`.
	 *    - Streams audio directly from `raggiesoft-assets` via `/__studio_api/audio`
	 *      when running locally (`./studio.sh` / `npm run dev`), or falls back to
	 *      the DigitalOcean Spaces CDN (`track.audioUrl`).
	 *    - Parses either an existing `.vtt` file or strips structural markdown
	 *      headers (`[Verse 1]`, `[Chorus]`, `*stage directions*`) from `track.lyrics`
	 *      into clean, singable lyric lines.
	 *    - Hold-Spacebar Capture Engine:
	 *      - Pressing and HOLDING `Spacebar` stamps `startTime = currentTime` on
	 *        the active lyric line (`isHoldingSpace = true`).
	 *      - RELEASING `Spacebar` stamps `endTime = currentTime`, marks the cue
	 *        synced, and automatically advances `activeLineIndex` to the next line.
	 *    - One-click save writes `WEBVTT\nNOTE SYNC_TYPE: HUMAN_VERIFIED` directly
	 *      to `raggiesoft-assets/engine-room-records/artists/{artist}/{album}/lyrics/{fileName}.vtt`
	 *      (and `streaming-services/lyrics/{fileName}.vtt`), causing `harper.sh`
	 *      (`04-track-processor.sh`) to automatically skip AI WhisperX overwriting.
	 *
	 * 2. Album & Track Metadata / Lore Editor:
	 *    - Edits `album.json` (`title`, `subtitle`, `genre`, `year`, `datePublished`,
	 *      `upc`, `description`, `linerNotes`) and `tracks.json` + `lyrics/{fileName}.md`
	 *      (`title`, `isrc`, `legacyTier`, `stylePrompt`, `loreNote`, `lyrics`)
	 *      and saves directly to disk via `/__studio_api/save-metadata`.
	 * ============================================================================
	 */
	import { onMount } from 'svelte';
	import { allAlbums, allArtists } from '#lib/data/musicData.js';
	import { player } from '#lib/player.svelte.js';

	// ---------------------------------------------------------------------------
	// 1. STUDIO NAVIGATION & SELECTION STATE
	// ---------------------------------------------------------------------------
	let selectedArtistSlug = $state(allArtists[0]?.slug || 'the-stardust-engine');
	let selectedArtist = $derived(
		allArtists.find((a) => a.slug === selectedArtistSlug) || allArtists[0]
	);

	let artistAlbums = $derived(
		allAlbums.filter((al) => al.artistSlug === selectedArtist?.slug)
	);

	let selectedAlbumId = $state(allAlbums[0]?.id || '');
	let selectedAlbum = $derived(
		artistAlbums.find((al) => al.id === selectedAlbumId) || artistAlbums[0]
	);

	let selectedTrackFileName = $state(
		allAlbums[0]?.tracks?.[0]?.fileName || allAlbums[0]?.tracks?.[0]?.id || ''
	);
	let selectedTrack = $derived(
		selectedAlbum?.tracks?.find((t) => (t.fileName || t.id) === selectedTrackFileName) ||
			selectedAlbum?.tracks?.[0]
	);
	let activeTrackFile = $derived(selectedTrack?.fileName || selectedTrack?.id || '');

	/** @type {'vtt' | 'metadata'} */
	let studioTab = $state('vtt');

	// Local Vite Dev Server API connection state
	let localApiAvailable = $state(false);
	let statusMessage = $state('');
	let statusTone = $state(/** @type {'info' | 'success' | 'error'} */ ('info'));
	let isSaving = $state(false);

	// ---------------------------------------------------------------------------
	// 2. AUDIO DECK STATE (Dedicated Studio Audio Element)
	// ---------------------------------------------------------------------------
	/** @type {HTMLAudioElement | null} */
	let audioEl = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let playbackRate = $state(1.0);
	let audioSourceUrl = $derived.by(() => {
		if (!selectedArtist || !selectedAlbum || !selectedTrack) return '';
		if (localApiAvailable && activeTrackFile) {
			const params = new URLSearchParams({
				artist: selectedArtist.slug,
				album: selectedAlbum.id,
				fileName: activeTrackFile
			});
			return `/__studio_api/audio?${params.toString()}`;
		}
		return selectedTrack.audioUrl || '';
	});

	// ---------------------------------------------------------------------------
	// 3. DISTROKID-STYLE HOLD-SPACEBAR VTT SYNCHRONIZER STATE
	// ---------------------------------------------------------------------------
	/**
	 * @typedef {Object} LyricCueDraft
	 * @property {number} id
	 * @property {string} text
	 * @property {number | null} startTime
	 * @property {number | null} endTime
	 * @property {boolean} synced
	 */

	/** @type {LyricCueDraft[]} */
	let cueDrafts = $state([]);
	let activeLineIndex = $state(0);
	let isHoldingSpace = $state(false);
	let isHumanVerifiedOnDisk = $state(false);

	// Which cue is currently active during audio playback (for live preview highlight)
	let livePlaybackCueIndex = $derived.by(() => {
		for (let i = 0; i < cueDrafts.length; i++) {
			const c = cueDrafts[i];
			if (
				c.startTime !== null &&
				c.endTime !== null &&
				currentTime >= c.startTime &&
				currentTime <= c.endTime
			) {
				return i;
			}
		}
		return -1;
	});

	// Generated WebVTT file content with HUMAN_VERIFIED header for Harper
	let generatedVttText = $derived.by(() => {
		const lines = ['WEBVTT', 'NOTE SYNC_TYPE: HUMAN_VERIFIED', ''];
		for (const cue of cueDrafts) {
			const cleanText = cue.text.trim();
			if (!cleanText) continue;
			const start = cue.startTime !== null ? cue.startTime : 0;
			const end =
				cue.endTime !== null
					? Math.max(start + 0.2, cue.endTime)
					: start + 2.5;
			lines.push(`${formatVttTimestamp(start)} --> ${formatVttTimestamp(end)}`);
			lines.push(cleanText);
			lines.push('');
		}
		return lines.join('\n');
	});

	let syncedCount = $derived(cueDrafts.filter((c) => c.synced).length);

	// ---------------------------------------------------------------------------
	// 4. ALBUM & TRACK METADATA EDITOR STATE
	// ---------------------------------------------------------------------------
	let editAlbumTitle = $state('');
	let editAlbumSubtitle = $state('');
	let editAlbumGenre = $state('');
	let editAlbumYear = $state('');
	let editAlbumDatePublished = $state('');
	let editAlbumUpc = $state('');
	let editAlbumDescription = $state('');
	let editAlbumLinerNotes = $state('');

	let editTrackTitle = $state('');
	let editTrackIsrc = $state('');
	let editTrackLegacyTier = $state('');
	let editTrackStylePrompt = $state('');
	let editTrackLoreNote = $state('');
	let editTrackLyrics = $state('');

	// ---------------------------------------------------------------------------
	// 5. INITIALIZATION & TRACK LOADING
	// ---------------------------------------------------------------------------
	onMount(async () => {
		try {
			const res = await fetch('/__studio_api/status');
			if (res.ok) {
				const data = await res.json();
				localApiAvailable = Boolean(data.available);
			}
		} catch {
			localApiAvailable = false;
		}
		await loadTrackIntoStudio();
	});

	/**
	 * Formats seconds into WebVTT timestamp `HH:MM:SS.mmm`.
	 * @param {number} sec
	 * @returns {string}
	 */
	function formatVttTimestamp(sec) {
		const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
		const hrs = Math.floor(safe / 3600);
		const mins = Math.floor((safe % 3600) / 60);
		const secs = Math.floor(safe % 60);
		const ms = Math.round((safe - Math.floor(safe)) * 1000);
		return (
			String(hrs).padStart(2, '0') +
			':' +
			String(mins).padStart(2, '0') +
			':' +
			String(secs).padStart(2, '0') +
			'.' +
			String(ms).padStart(3, '0')
		);
	}

	/**
	 * Formats seconds into compact `MM:SS.d` display for cue badges.
	 * @param {number | null} sec
	 * @returns {string}
	 */
	function formatShortTime(sec) {
		if (sec === null || !Number.isFinite(sec)) return '--:--.-';
		const safe = Math.max(0, sec);
		const mins = Math.floor(safe / 60);
		const secs = (safe % 60).toFixed(1).padStart(4, '0');
		return `${String(mins).padStart(2, '0')}:${secs}`;
	}

	/**
	 * Extracts clean, singable lyric lines from raw markdown lyrics by stripping
	 * structural section headers (`[Verse 1]`, `[Chorus]`), stage directions,
	 * and empty lines.
	 * @param {string} rawLyrics
	 * @returns {string[]}
	 */
	function extractSingableLines(rawLyrics) {
		return (rawLyrics || '')
			.split(/\r?\n/)
			.map((/** @type {string} */ l) => l.trim())
			.filter((/** @type {string} */ l) => {
				if (!l) return false;
				if (/^\[.*\]$/.test(l)) return false;
				if (/^\*\(.*\)\*$/.test(l)) return false;
				if (/^\*[^*]+\*$/.test(l)) return false;
				if (/^\(.*instrumental.*\)$/i.test(l)) return false;
				return true;
			});
	}

	/**
	 * Loads the currently selected Album & Track into both the VTT Synchronizer
	 * and the Metadata/Lore Editor.
	 */
	async function loadTrackIntoStudio() {
		if (!selectedArtist || !selectedAlbum || !selectedTrack) return;

		// Populate Metadata Editor fields
		editAlbumTitle = selectedAlbum.title || '';
		editAlbumSubtitle = selectedAlbum.subtitle || '';
		editAlbumGenre = selectedAlbum.genre || '';
		editAlbumYear = selectedAlbum.year || '';
		editAlbumDatePublished = selectedAlbum.datePublished || '';
		editAlbumUpc = selectedAlbum.upc || '';
		editAlbumDescription = selectedAlbum.description || '';
		editAlbumLinerNotes = (selectedAlbum.linerNotes || []).join('\n\n');

		editTrackTitle = selectedTrack.title || '';
		editTrackIsrc = selectedTrack.isrc || '';
		editTrackLegacyTier = selectedTrack.legacyTier || '';
		editTrackStylePrompt = selectedTrack.stylePrompt || '';
		editTrackLoreNote = selectedTrack.loreNote || '';
		editTrackLyrics = selectedTrack.lyrics || '';

		isHoldingSpace = false;
		activeLineIndex = 0;
		isHumanVerifiedOnDisk = Boolean(selectedTrack.vttVerified);

		// Attempt to load existing VTT from local disk API or CDN
		let rawVtt = '';
		if (localApiAvailable && activeTrackFile) {
			try {
				const params = new URLSearchParams({
					artist: selectedArtist.slug,
					album: selectedAlbum.id,
					fileName: activeTrackFile
				});
				const res = await fetch(`/__studio_api/vtt?${params.toString()}`);
				if (res.ok) {
					const data = await res.json();
					if (data.exists && data.vttContent) {
						rawVtt = data.vttContent;
						isHumanVerifiedOnDisk = Boolean(data.verified);
					}
				}
			} catch {
				// Fallback to CDN below
			}
		}

		if (!rawVtt && selectedTrack.vttUrl) {
			try {
				const res = await fetch(selectedTrack.vttUrl);
				if (res.ok) {
					rawVtt = await res.text();
					if (rawVtt.includes('SYNC_TYPE: HUMAN_VERIFIED')) {
						isHumanVerifiedOnDisk = true;
					}
				}
			} catch {
				// Fallback to raw lyrics below
			}
		}

		const parsedCues = rawVtt ? player.parseVtt(rawVtt) : [];
		if (parsedCues.length > 0) {
			cueDrafts = parsedCues.map((c, idx) => ({
				id: idx + 1,
				text: c.text,
				startTime: Number(c.start.toFixed(2)),
				endTime: Number(c.end.toFixed(2)),
				synced: true
			}));
		} else {
			resetCuesFromRawLyrics();
		}
	}

	/**
	 * Resets the VTT cue list from the track's clean singable lyrics so the user
	 * can tap/hold `Spacebar` from line 1.
	 */
	function resetCuesFromRawLyrics() {
		const lines = extractSingableLines(editTrackLyrics || selectedTrack?.lyrics || '');
		cueDrafts = lines.map((line, idx) => ({
			id: idx + 1,
			text: line,
			startTime: null,
			endTime: null,
			synced: false
		}));
		activeLineIndex = 0;
		isHoldingSpace = false;
		setStatus(
			`Loaded ${cueDrafts.length} singable lyric lines. Press Play and hold Spacebar while each line is sung!`,
			'info'
		);
	}

	/**
	 * Clears timestamps on all lines while keeping the current line texts intact.
	 */
	function clearAllTimestamps() {
		cueDrafts = cueDrafts.map((c) => ({
			...c,
			startTime: null,
			endTime: null,
			synced: false
		}));
		activeLineIndex = 0;
		isHoldingSpace = false;
		if (audioEl) {
			audioEl.currentTime = 0;
		}
		setStatus('Cleared all cue timestamps and rewound to 00:00.0.', 'info');
	}

	// ---------------------------------------------------------------------------
	// 6. DISTROKID-STYLE HOLD-SPACEBAR KEYBOARD HANDLERS
	// ---------------------------------------------------------------------------
	/**
	 * Handles `keydown` across the window. When in VTT mode and not typing in an
	 * `<input>` / `<textarea>`, holding `Spacebar` stamps `startTime` on the
	 * active lyric line.
	 * @param {KeyboardEvent} event
	 */
	function handleWindowKeyDown(event) {
		if (studioTab !== 'vtt') return;
		const target = /** @type {HTMLElement | null} */ (event.target);
		if (
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable)
		) {
			return;
		}

		if (event.code === 'Space') {
			event.preventDefault();
			if (event.repeat || isHoldingSpace) return;
			if (activeLineIndex < 0 || activeLineIndex >= cueDrafts.length) return;

			// Auto-play audio if paused when user starts holding Spacebar
			if (audioEl && audioEl.paused) {
				audioEl.play().catch(() => {});
			}

			const now = Number((audioEl ? audioEl.currentTime : currentTime).toFixed(2));
			isHoldingSpace = true;

			// If previous cue's endTime overlaps with this cue's startTime, clamp previous cue
			if (activeLineIndex > 0) {
				const prev = cueDrafts[activeLineIndex - 1];
				if (prev.endTime !== null && prev.endTime > now) {
					prev.endTime = now;
				}
			}

			cueDrafts[activeLineIndex].startTime = now;
			cueDrafts[activeLineIndex].endTime = null;
			cueDrafts[activeLineIndex].synced = false;
			scrollCueIntoView(activeLineIndex);
		}
	}

	/**
	 * Handles `keyup` across the window. Releasing `Spacebar` stamps `endTime`
	 * on the active lyric line and advances `activeLineIndex` to the next line.
	 * @param {KeyboardEvent} event
	 */
	function handleWindowKeyUp(event) {
		if (studioTab !== 'vtt') return;
		if (event.code === 'Space' && isHoldingSpace) {
			event.preventDefault();
			isHoldingSpace = false;

			if (activeLineIndex >= 0 && activeLineIndex < cueDrafts.length) {
				const cue = cueDrafts[activeLineIndex];
				const start = cue.startTime ?? currentTime;
				const now = Number(
					Math.max(start + 0.25, audioEl ? audioEl.currentTime : currentTime).toFixed(2)
				);
				cue.endTime = now;
				cue.synced = true;

				if (activeLineIndex < cueDrafts.length - 1) {
					activeLineIndex += 1;
					scrollCueIntoView(activeLineIndex);
				} else {
					setStatus(
						'All lyric lines synced! Click "Save Human-Verified VTT" to stamp SYNC_TYPE: HUMAN_VERIFIED.',
						'success'
					);
				}
			}
		}
	}

	/**
	 * Smoothly scrolls the active lyric row into the center of the cue list container.
	 * @param {number} index
	 */
	function scrollCueIntoView(index) {
		const el = document.getElementById(`studio-cue-row-${index}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	/**
	 * Selects a specific cue row as the active target for Spacebar syncing,
	 * optionally seeking the audio 1.5s prior to its start time (or the previous
	 * line's end time) for effortless re-recording.
	 * @param {number} index
	 * @param {boolean} [seekToCue=false]
	 */
	function selectCueLine(index, seekToCue = false) {
		activeLineIndex = index;
		isHoldingSpace = false;
		if (seekToCue && audioEl) {
			const cue = cueDrafts[index];
			const prev = index > 0 ? cueDrafts[index - 1] : null;
			if (cue.startTime !== null) {
				audioEl.currentTime = Math.max(0, cue.startTime - 1.5);
			} else if (prev?.endTime !== null && prev?.endTime !== undefined) {
				audioEl.currentTime = Math.max(0, prev.endTime - 1.0);
			}
		}
	}

	/**
	 * Nudges a cue's `startTime` or `endTime` by `delta` seconds (e.g., -0.1 or +0.1).
	 * @param {number} index
	 * @param {'startTime' | 'endTime'} field
	 * @param {number} delta
	 */
	function nudgeCueTime(index, field, delta) {
		const cue = cueDrafts[index];
		if (!cue) return;
		const base = cue[field] ?? currentTime;
		cue[field] = Number(Math.max(0, base + delta).toFixed(2));
		if (cue.startTime !== null && cue.endTime !== null) {
			cue.synced = true;
		}
	}

	/**
	 * Inserts a new blank lyric line directly below `index`.
	 * @param {number} index
	 */
	function insertLineBelow(index) {
		const next = [...cueDrafts];
		next.splice(index + 1, 0, {
			id: Date.now(),
			text: '',
			startTime: null,
			endTime: null,
			synced: false
		});
		cueDrafts = next;
	}

	/**
	 * Removes a lyric line at `index`.
	 * @param {number} index
	 */
	function removeLineAt(index) {
		if (cueDrafts.length <= 1) return;
		cueDrafts = cueDrafts.filter((_, i) => i !== index);
		if (activeLineIndex >= cueDrafts.length) {
			activeLineIndex = Math.max(0, cueDrafts.length - 1);
		}
	}

	// ---------------------------------------------------------------------------
	// 7. AUDIO CONTROLS
	// ---------------------------------------------------------------------------
	function toggleAudioPlay() {
		if (!audioEl) return;
		if (audioEl.paused) {
			audioEl.play().catch(() => {});
		} else {
			audioEl.pause();
		}
	}

	/**
	 * Skips audio backward or forward by `delta` seconds.
	 * @param {number} delta
	 */
	function skipAudio(delta) {
		if (!audioEl) return;
		audioEl.currentTime = Math.max(0, Math.min(duration || 9999, audioEl.currentTime + delta));
	}

	/**
	 * Updates playback speed (`0.75x`, `0.9x`, `1.0x`, `1.25x`).
	 * @param {number} rate
	 */
	function changePlaybackRate(rate) {
		playbackRate = rate;
		if (audioEl) {
			audioEl.playbackRate = rate;
		}
	}

	// ---------------------------------------------------------------------------
	// 8. SAVE HUMAN-VERIFIED VTT & METADATA TO DISK
	// ---------------------------------------------------------------------------
	/**
	 * Displays a status banner message.
	 * @param {string} msg
	 * @param {'info' | 'success' | 'error'} tone
	 */
	function setStatus(msg, tone = 'info') {
		statusMessage = msg;
		statusTone = tone;
	}

	/**
	 * Saves the human-verified `.vtt` file (`NOTE SYNC_TYPE: HUMAN_VERIFIED`)
	 * directly to `raggiesoft-assets` via `/__studio_api/save-vtt` (or downloads
	 * the `.vtt` file if running in static browser mode).
	 */
	async function saveVerifiedVtt() {
		if (!selectedArtist || !selectedAlbum || !selectedTrack || !activeTrackFile) return;
		isSaving = true;
		try {
			if (localApiAvailable) {
				const res = await fetch('/__studio_api/save-vtt', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						artistSlug: selectedArtist.slug,
						albumId: selectedAlbum.id,
						fileName: activeTrackFile,
						vttContent: generatedVttText
					})
				});
				const data = await res.json();
				if (!res.ok || !data.ok) {
					throw new Error(data.error || 'Failed to write VTT file to disk');
				}
				isHumanVerifiedOnDisk = true;
				selectedTrack.vttVerified = true;
				setStatus(
					`Saved HUMAN_VERIFIED VTT to ${data.primaryVttPath}${data.mirroredVttPath ? ' + streaming-services/lyrics/' : ''} and rebuilt catalog! Harper will now skip AI lyric syncing for this track.`,
					'success'
				);
			} else {
				downloadVttFile();
			}
		} catch (err) {
			setStatus(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Downloads the generated `.vtt` file directly in the browser.
	 */
	function downloadVttFile() {
		if (!selectedTrack || !activeTrackFile) return;
		const blob = new Blob([generatedVttText], { type: 'text/vtt;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${activeTrackFile}.vtt`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		setStatus(
			`Downloaded ${activeTrackFile}.vtt with NOTE SYNC_TYPE: HUMAN_VERIFIED.`,
			'success'
		);
	}

	/**
	 * Saves Album & Track Metadata, Lore Notes, and Markdown Lyrics directly to
	 * `album.json`, `tracks.json`, and `lyrics/{fileName}.md` via `/__studio_api/save-metadata`.
	 */
	async function saveMetadataAndLore() {
		if (!selectedArtist || !selectedAlbum || !selectedTrack || !activeTrackFile) return;
		if (!localApiAvailable) {
			setStatus(
				'Direct disk write requires running the local Studio IDE (`./studio.sh` or `npm run dev`).',
				'error'
			);
			return;
		}
		isSaving = true;
		try {
			const linerParagraphs = editAlbumLinerNotes
				.split(/\n\s*\n/)
				.map((p) => p.trim())
				.filter(Boolean);

			const res = await fetch('/__studio_api/save-metadata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					artistSlug: selectedArtist.slug,
					albumId: selectedAlbum.id,
					albumUpdates: {
						title: editAlbumTitle,
						subtitle: editAlbumSubtitle,
						genre: editAlbumGenre,
						year: editAlbumYear,
						datePublished: editAlbumDatePublished,
						upc: editAlbumUpc,
						description: editAlbumDescription,
						linerNotes: linerParagraphs
					},
					trackUpdates: {
						fileName: activeTrackFile,
						title: editTrackTitle,
						isrc: editTrackIsrc,
						legacyTier: editTrackLegacyTier,
						stylePrompt: editTrackStylePrompt,
						loreNote: editTrackLoreNote,
						lyrics: editTrackLyrics
					}
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				throw new Error(data.error || 'Failed to save metadata to disk');
			}
			setStatus(
				`Saved album.json, tracks.json, and lyrics/${activeTrackFile}.md to disk and rebuilt catalog!`,
				'success'
			);
		} catch (err) {
			setStatus(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} onkeyup={handleWindowKeyUp} />

<svelte:head>
	<title>Engine Room Studio IDE &amp; VTT Lyric Sync | The Listening Room</title>
</svelte:head>

<!-- Hidden dedicated Studio Audio Element -->
<audio
	bind:this={audioEl}
	src={audioSourceUrl}
	onplay={() => (isPlaying = true)}
	onpause={() => (isPlaying = false)}
	ontimeupdate={() => {
		if (audioEl) currentTime = audioEl.currentTime;
	}}
	onloadedmetadata={() => {
		if (audioEl) {
			duration = audioEl.duration || 0;
			audioEl.playbackRate = playbackRate;
		}
	}}
></audio>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Studio Header -->
	<div
		class="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl md:flex-row md:items-center"
	>
		<div>
			<div class="flex flex-wrap items-center gap-2.5">
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-bold tracking-wider text-indigo-300 uppercase"
				>
					Engine Room Studio IDE
				</span>
				{#if localApiAvailable}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
					>
						● Local Disk Write Connected (raggiesoft-assets)
					</span>
				{:else}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"
					>
						○ Browser Export Mode (Run ./studio.sh for Direct Disk Save)
					</span>
				{/if}
			</div>
			<h1 class="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
				Album IDE &amp; DistroKid-Style VTT Lyric Synchronizer
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				Hold down <kbd class="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200">Spacebar</kbd> while a lyric line is sung and release when the line ends. Saving stamps <code class="text-indigo-300">NOTE SYNC_TYPE: HUMAN_VERIFIED</code> so <code class="text-indigo-300">harper.sh</code> skips AI overwriting.
			</p>
		</div>

		<!-- Studio Mode Switcher -->
		<div class="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1">
			<button
				type="button"
				onclick={() => (studioTab = 'vtt')}
				class="rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition {studioTab ===
				'vtt'
					? 'bg-indigo-600 text-white shadow'
					: 'text-slate-400 hover:text-white'}"
			>
				Hold-Spacebar VTT Sync
			</button>
			<button
				type="button"
				onclick={() => (studioTab = 'metadata')}
				class="rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition {studioTab ===
				'metadata'
					? 'bg-indigo-600 text-white shadow'
					: 'text-slate-400 hover:text-white'}"
			>
				Album &amp; Track Lore IDE
			</button>
		</div>
	</div>

	<!-- Artist / Album / Track Selector Bar -->
	<div
		class="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 md:grid-cols-3"
	>
		<div>
			<label
				for="studio-artist-select"
				class="mb-1.5 block text-xs font-bold tracking-wider text-slate-400 uppercase"
			>
				1. Artist Roster
			</label>
			<select
				id="studio-artist-select"
				bind:value={selectedArtistSlug}
				onchange={() => {
					const firstAlbum = allAlbums.find((al) => al.artistSlug === selectedArtistSlug);
					selectedAlbumId = firstAlbum?.id || '';
					selectedTrackFileName =
						firstAlbum?.tracks?.[0]?.fileName || firstAlbum?.tracks?.[0]?.id || '';
					loadTrackIntoStudio();
				}}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
			>
				{#each allArtists as artist (artist.slug)}
					<option value={artist.slug}>{artist.name} ({artist.albumCount} Albums)</option>
				{/each}
			</select>
		</div>

		<div>
			<label
				for="studio-album-select"
				class="mb-1.5 block text-xs font-bold tracking-wider text-slate-400 uppercase"
			>
				2. Album Release
			</label>
			<select
				id="studio-album-select"
				bind:value={selectedAlbumId}
				onchange={() => {
					const alb = artistAlbums.find((al) => al.id === selectedAlbumId) || artistAlbums[0];
					selectedTrackFileName = alb?.tracks?.[0]?.fileName || alb?.tracks?.[0]?.id || '';
					loadTrackIntoStudio();
				}}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
			>
				{#each artistAlbums as album (album.id)}
					<option value={album.id}>{album.year} — {album.title}</option>
				{/each}
			</select>
		</div>

		<div>
			<label
				for="studio-track-select"
				class="mb-1.5 block text-xs font-bold tracking-wider text-slate-400 uppercase"
			>
				3. Track Master
			</label>
			<select
				id="studio-track-select"
				bind:value={selectedTrackFileName}
				onchange={() => loadTrackIntoStudio()}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
			>
				{#if selectedAlbum}
					{#each selectedAlbum.tracks as t (t.fileName || t.id)}
						<option value={t.fileName || t.id}>
							{String(t.track).padStart(2, '0')}. {t.title}
							{t.vttVerified ? ' [✓ VERIFIED]' : ''}
						</option>
					{/each}
				{/if}
			</select>
		</div>
	</div>

	{#if statusMessage}
		<div
			class="mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm {statusTone ===
			'success'
				? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
				: statusTone === 'error'
					? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
					: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'}"
		>
			<span>{statusMessage}</span>
			<button
				type="button"
				onclick={() => (statusMessage = '')}
				class="ml-4 text-xs font-bold uppercase opacity-75 hover:opacity-100"
			>
				Dismiss
			</button>
		</div>
	{/if}

	{#if studioTab === 'vtt'}
		<!-- ===================================================================== -->
		<!-- TAB 1: DISTROKID-STYLE HOLD-SPACEBAR VTT SYNCHRONIZER                 -->
		<!-- ===================================================================== -->

		<!-- Studio Audio Transport Bar -->
		<div
			class="sticky top-18 z-30 mb-6 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md"
		>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-2.5">
					<button
						type="button"
						onclick={toggleAudioPlay}
						class="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500"
						title={isPlaying ? 'Pause Audio' : 'Play Audio'}
					>
						{#if isPlaying}
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
							</svg>
						{:else}
							<svg class="h-5 w-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						{/if}
					</button>

					<button
						type="button"
						onclick={() => skipAudio(-3)}
						class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
					>
						-3s
					</button>
					<button
						type="button"
						onclick={() => skipAudio(3)}
						class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
					>
						+3s
					</button>

					<div class="ml-2 font-mono text-sm font-bold text-white">
						{formatShortTime(currentTime)}
						<span class="text-slate-500">/</span>
						<span class="text-slate-400">{formatShortTime(duration)}</span>
					</div>
				</div>

				<!-- Hold-Spacebar Live Indicator -->
				<div class="flex items-center gap-3">
					<div
						class="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold tracking-wider uppercase transition {isHoldingSpace
							? 'scale-105 border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-lg shadow-emerald-500/20'
							: 'border-slate-700 bg-slate-950 text-slate-300'}"
					>
						<span
							class="h-2.5 w-2.5 rounded-full {isHoldingSpace
								? 'animate-ping bg-emerald-400'
								: 'bg-slate-600'}"
						></span>
						{#if isHoldingSpace}
							RECORDING LINE #{activeLineIndex + 1} — RELEASE SPACEBAR WHEN LINE ENDS
						{:else}
							READY FOR LINE #{activeLineIndex + 1} — HOLD SPACEBAR WHILE SUNG
						{/if}
					</div>
				</div>

				<!-- Speed & Save Controls -->
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
						{#each [0.75, 0.9, 1.0, 1.25] as rate (rate)}
							<button
								type="button"
								onclick={() => changePlaybackRate(rate)}
								class="rounded-md px-2 py-1 font-mono font-semibold transition {playbackRate ===
								rate
									? 'bg-indigo-600 text-white'
									: 'text-slate-400 hover:text-white'}"
							>
								{rate}x
							</button>
						{/each}
					</div>

					<button
						type="button"
						disabled={isSaving}
						onclick={saveVerifiedVtt}
						class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
					>
						✓ Save Human-Verified VTT ({syncedCount}/{cueDrafts.length})
					</button>
				</div>
			</div>

			<!-- Timeline Scrub Bar -->
			<div class="mt-3 flex items-center gap-3">
				<input
					type="range"
					min="0"
					max={duration || 100}
					step="0.05"
					value={currentTime}
					oninput={(e) => {
						const val = parseFloat(e.currentTarget.value);
						currentTime = val;
						if (audioEl) audioEl.currentTime = val;
					}}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
				/>
			</div>
		</div>

		<!-- Two-Column Studio Workspace: Cue Synchronizer List + Live WebVTT Output -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<!-- Left 8 Cols: Interactive Lyric Lines -->
			<div
				class="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 lg:col-span-8"
			>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
					<div class="flex items-center gap-2">
						<h2 class="text-sm font-bold tracking-wider text-slate-300 uppercase">
							Singable Lyric Cues ({cueDrafts.length} Lines)
						</h2>
						{#if isHumanVerifiedOnDisk}
							<span
								class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300"
							>
								✓ HUMAN_VERIFIED ON DISK
							</span>
						{:else}
							<span
								class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
							>
								UNVERIFIED / AI VTT
							</span>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onclick={resetCuesFromRawLyrics}
							class="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
						>
							Reset Lines from Track Lyrics
						</button>
						<button
							type="button"
							onclick={clearAllTimestamps}
							class="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
						>
							Clear All Timestamps
						</button>
					</div>
				</div>

				<div class="max-h-[640px] space-y-2.5 overflow-y-auto pr-1">
					{#each cueDrafts as cue, idx (cue.id)}
						{@const isTarget = idx === activeLineIndex}
						{@const isLivePlaying = idx === livePlaybackCueIndex}
						<div
							id="studio-cue-row-{idx}"
							class="rounded-xl border p-3 transition {isTarget && isHoldingSpace
								? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
								: isTarget
									? 'border-indigo-500 bg-indigo-500/10'
									: isLivePlaying
										? 'border-cyan-500/60 bg-cyan-500/10'
										: cue.synced
											? 'border-slate-800 bg-slate-950/60'
											: 'border-slate-800/60 bg-slate-950/30 opacity-80'}"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => selectCueLine(idx, true)}
										class="rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition {isTarget
											? 'bg-indigo-600 text-white'
											: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
										title="Click to target this line and seek audio 1.5s before cue"
									>
										#{String(idx + 1).padStart(2, '0')}
									</button>

									<!-- Start Time Badge & Nudgers -->
									<div class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs">
										<span class="text-[10px] font-bold text-slate-500 uppercase">In</span>
										<span class="font-mono font-semibold text-emerald-300">
											{formatShortTime(cue.startTime)}
										</span>
										<button
											type="button"
											onclick={() => nudgeCueTime(idx, 'startTime', -0.1)}
											class="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-white"
											title="Nudge Start -0.1s"
										>
											-
										</button>
										<button
											type="button"
											onclick={() => nudgeCueTime(idx, 'startTime', 0.1)}
											class="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-white"
											title="Nudge Start +0.1s"
										>
											+
										</button>
									</div>

									<!-- End Time Badge & Nudgers -->
									<div class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs">
										<span class="text-[10px] font-bold text-slate-500 uppercase">Out</span>
										<span class="font-mono font-semibold text-cyan-300">
											{formatShortTime(cue.endTime)}
										</span>
										<button
											type="button"
											onclick={() => nudgeCueTime(idx, 'endTime', -0.1)}
											class="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-white"
											title="Nudge End -0.1s"
										>
											-
										</button>
										<button
											type="button"
											onclick={() => nudgeCueTime(idx, 'endTime', 0.1)}
											class="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-white"
											title="Nudge End +0.1s"
										>
											+
										</button>
									</div>
								</div>

								<div class="flex items-center gap-1.5">
									<button
										type="button"
										onclick={() => selectCueLine(idx, false)}
										class="rounded-md px-2 py-1 text-[11px] font-semibold {isTarget
											? 'bg-indigo-500/20 text-indigo-300'
											: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
									>
										{isTarget ? '● Target Line' : 'Set Target'}
									</button>
									<button
										type="button"
										onclick={() => insertLineBelow(idx)}
										class="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white"
										title="Insert line below"
									>
										+ Line
									</button>
									<button
										type="button"
										onclick={() => removeLineAt(idx)}
										class="rounded-md px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-500/10"
										title="Remove line"
									>
										✕
									</button>
								</div>
							</div>

							<div class="mt-2">
								<input
									type="text"
									bind:value={cue.text}
									class="w-full rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-1.5 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Right 4 Cols: Live WebVTT Output & Export Panel -->
			<div
				class="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 lg:col-span-4"
			>
				<div class="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
					<h2 class="text-sm font-bold tracking-wider text-slate-300 uppercase">
						Generated WebVTT File
					</h2>
					<button
						type="button"
						onclick={downloadVttFile}
						class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
					>
						Download .vtt
					</button>
				</div>

				<p class="mb-3 text-xs leading-relaxed text-slate-400">
					Includes <code class="text-emerald-300">NOTE SYNC_TYPE: HUMAN_VERIFIED</code> on line 2 so Harper (<code class="text-slate-300">04-track-processor.sh</code>) preserves your human-verified timing forever.
				</p>

				<textarea
					readonly
					value={generatedVttText}
					class="min-h-[480px] w-full flex-1 rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 focus:outline-none"
				></textarea>
			</div>
		</div>
	{:else}
		<!-- ===================================================================== -->
		<!-- TAB 2: ALBUM & TRACK METADATA / LORE EDITOR                           -->
		<!-- ===================================================================== -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Album Metadata (album.json) -->
			<div class="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
				<h2 class="mb-4 border-b border-slate-800 pb-3 text-sm font-bold tracking-wider text-indigo-300 uppercase">
					Album Metadata &amp; Liner Notes (album.json)
				</h2>

				<div class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label for="edit-album-title" class="mb-1 block text-xs font-semibold text-slate-400">
								Album Title
							</label>
							<input
								id="edit-album-title"
								type="text"
								bind:value={editAlbumTitle}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-album-subtitle" class="mb-1 block text-xs font-semibold text-slate-400">
								Subtitle / Tagline
							</label>
							<input
								id="edit-album-subtitle"
								type="text"
								bind:value={editAlbumSubtitle}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
						<div>
							<label for="edit-album-year" class="mb-1 block text-xs font-semibold text-slate-400">
								Lore Year
							</label>
							<input
								id="edit-album-year"
								type="text"
								bind:value={editAlbumYear}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-album-date" class="mb-1 block text-xs font-semibold text-slate-400">
								Release Date
							</label>
							<input
								id="edit-album-date"
								type="text"
								bind:value={editAlbumDatePublished}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-album-genre" class="mb-1 block text-xs font-semibold text-slate-400">
								Genre
							</label>
							<input
								id="edit-album-genre"
								type="text"
								bind:value={editAlbumGenre}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-album-upc" class="mb-1 block text-xs font-semibold text-slate-400">
								UPC (GTIN-12)
							</label>
							<input
								id="edit-album-upc"
								type="text"
								bind:value={editAlbumUpc}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
							/>
						</div>
					</div>

					<div>
						<label for="edit-album-desc" class="mb-1 block text-xs font-semibold text-slate-400">
							Short Album Summary (description)
						</label>
						<textarea
							id="edit-album-desc"
							rows="3"
							bind:value={editAlbumDescription}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
						></textarea>
					</div>

					<div>
						<label for="edit-album-liner" class="mb-1 block text-xs font-semibold text-slate-400">
							Album Story &amp; Liner Notes (Separate paragraphs with a blank line)
						</label>
						<textarea
							id="edit-album-liner"
							rows="8"
							bind:value={editAlbumLinerNotes}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-relaxed text-white"
						></textarea>
					</div>
				</div>
			</div>

			<!-- Track Metadata, Lore Note & Lyrics (tracks.json + lyrics/*.md) -->
			<div class="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
				<h2 class="mb-4 border-b border-slate-800 pb-3 text-sm font-bold tracking-wider text-indigo-300 uppercase">
					Track Lore &amp; Lyrics (tracks.json + lyrics/{selectedTrack?.fileName}.md)
				</h2>

				<div class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<label for="edit-track-title" class="mb-1 block text-xs font-semibold text-slate-400">
								Track Title
							</label>
							<input
								id="edit-track-title"
								type="text"
								bind:value={editTrackTitle}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-track-isrc" class="mb-1 block text-xs font-semibold text-slate-400">
								ISRC Code
							</label>
							<input
								id="edit-track-isrc"
								type="text"
								bind:value={editTrackIsrc}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
							/>
						</div>
						<div>
							<label for="edit-track-tier" class="mb-1 block text-xs font-semibold text-slate-400">
								Legacy Tier Badge
							</label>
							<input
								id="edit-track-tier"
								type="text"
								bind:value={editTrackLegacyTier}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
							/>
						</div>
					</div>

					<div>
						<label for="edit-track-style" class="mb-1 block text-xs font-semibold text-slate-400">
							Production / Style Prompt
						</label>
						<input
							id="edit-track-style"
							type="text"
							bind:value={editTrackStylePrompt}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
						/>
					</div>

					<div>
						<label for="edit-track-lore" class="mb-1 block text-xs font-semibold text-slate-400">
							Track Lore &amp; Behind-the-Song Note
						</label>
						<textarea
							id="edit-track-lore"
							rows="5"
							bind:value={editTrackLoreNote}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-relaxed text-white"
						></textarea>
					</div>

					<div>
						<label for="edit-track-lyrics" class="mb-1 block text-xs font-semibold text-slate-400">
							Full Markdown Lyrics
						</label>
						<textarea
							id="edit-track-lyrics"
							rows="10"
							bind:value={editTrackLyrics}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-white"
						></textarea>
					</div>

					<div class="flex justify-end pt-2">
						<button
							type="button"
							disabled={isSaving}
							onclick={saveMetadataAndLore}
							class="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
						>
							Save Album &amp; Track Lore to Disk
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
