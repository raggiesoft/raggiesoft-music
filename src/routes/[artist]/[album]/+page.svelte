<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Album Dedicated Route: /[artist]/[album])
	 * ============================================================================
	 * Dedicated, crawlable album showcase view for Engine Room Records
	 * (`music.raggiesoft.com/$artist-slug/$album-slug`).
	 *
	 * Architecture & Design Decisions:
	 * 1. Hierarchical SEO URLs: Nested under `/[artist]/[album]` so shared links
	 *    immediately communicate both the band and the release, and chopping off
	 *    the album segment resolves cleanly to the artist's profile (`/[artist]`).
	 * 2. Social Crawler Optimization: Injects high-resolution 1200x630 Open Graph
	 *    and Twitter Card tags referencing the album's canonical `socialPreview` image,
	 *    along with rich Schema.org MusicAlbum JSON-LD metadata for search engines.
	 * 3. Persistent Audio Integration: Seamlessly hooks into the global Svelte 5
	 *    `player` store. Starting playback here retains state across navigation.
	 * 4. Rich Lore & Synchronized Lyrics: Surfaces track-level narrative lore and
	 *    official lyrics directly within the album context.
	 * 5. Book-Reader-Style Social Sharing: Includes `<ShareSection />` at the bottom
	 *    of the page with OpenGraph preview card, Facebook, Bluesky, Copy Link, and
	 *    Native Share.
	 * ============================================================================
	 */
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { player } from '#lib/player.svelte.js';
	import { dspManager } from '#lib/dspPreference.svelte.js';
	import { playlistManager } from '#lib/playlists.svelte.js';
	import {
		buildSongFamilyComparisonQueue,
		formatAlbumQueue,
		formatReleaseDate,
		getRelatedSongs,
		hasAnyDsp,
		hasFourthwallStore
	} from '#lib/data/musicData.js';
	import ShareSection from '#lib/components/ShareSection.svelte';
	import StoreButton from '#lib/components/StoreButton.svelte';

	let { data } = $props();

	let album = $derived(data.album);
	let relatedAlbums = $derived(data.relatedAlbums);

	// Canonical URL for this hierarchical album route
	let canonicalUrl = $derived(`https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`);

	// Canonical Schema.org JSON-LD formatted string for search engines & structured data crawlers
	let jsonLdScript = $derived(
		`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'MusicAlbum',
			name: album.title,
			byArtist: {
				'@type': 'MusicGroup',
				name: album.artist,
				url: `https://music.raggiesoft.com/${album.artistSlug}`
			},
			genre: album.genre,
			albumProductionType:
				album.albumType === 'live'
					? 'https://schema.org/LiveAlbum'
					: album.albumType === 'compilation'
						? 'https://schema.org/CompilationAlbum'
						: album.albumType === 'soundtrack'
							? 'https://schema.org/SoundtrackAlbum'
							: 'https://schema.org/StudioAlbum',
			image: album.artwork,
			datePublished: album.datePublished || album.temporalCoverage || album.year,
			temporalCoverage: album.temporalCoverage,
			description: album.description,
			numTracks: album.totalTracksCount,
			url: `https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`,
			track: album.tracks.map((t) => ({
				'@type': 'MusicRecording',
				name: t.title,
				position: t.track,
				isrcCode: t.isrc || undefined,
				duration: t.duration
			}))
		})}` +
			'</' +
			'script>'
	);

	/**
	 * Parses a "MM:SS" or "HH:MM:SS" duration string into total seconds (returns 0 for "In Studio").
	 * @param {string} durStr
	 * @returns {number}
	 */
	function parseDurationSeconds(durStr) {
		if (!durStr || typeof durStr !== 'string' || !durStr.includes(':')) return 0;
		const parts = durStr
			.trim()
			.split(':')
			.map((n) => parseInt(n, 10));
		if (parts.some((n) => Number.isNaN(n))) return 0;
		if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
		if (parts.length === 2) return parts[0] * 60 + parts[1];
		return 0;
	}

	/**
	 * Formats total seconds into a compact "MM:SS" string (e.g. "60:59" for CD length comparison).
	 * @param {number} totalSec
	 * @returns {string}
	 */
	function formatCdMinutesSeconds(totalSec) {
		if (!totalSec || totalSec <= 0) return '0:00';
		const mins = Math.floor(totalSec / 60);
		const secs = totalSec % 60;
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}

	// Group tracks by disc number for clean multi-disc presentation with Red Book CD runtimes
	let discs = $derived.by(() => {
		/** @type {Record<number, any[]>} */
		const discMap = {};
		for (const track of album.tracks) {
			const dNum = track.disc || 1;
			if (!discMap[dNum]) {
				discMap[dNum] = [];
			}
			discMap[dNum].push(track);
		}
		return Object.entries(discMap).map(([discNumStr, tracks]) => {
			const totalSeconds = tracks.reduce(
				(acc, t) => acc + parseDurationSeconds(t.duration || ''),
				0
			);
			return {
				discNum: Number(discNumStr),
				discName: tracks[0]?.discName || '',
				tracks,
				totalSeconds,
				totalDurationFormatted: formatCdMinutesSeconds(totalSeconds)
			};
		});
	});

	let albumTotalSeconds = $derived(
		discs.reduce((acc, d) => acc + (d.totalSeconds || 0), 0)
	);
	let albumTotalDurationFormatted = $derived(formatCdMinutesSeconds(albumTotalSeconds));

	// Active track expanded for lore/lyrics accordion view
	let expandedTrackId = $state(/** @type {string | null} */ (null));

	// Track ID matched via URL deep-link (?track=..., ?play=..., ?song=..., or #track-...)
	let deepLinkedTrackId = $state(/** @type {string | null} */ (null));
	let lastHandledDeepLinkKey = '';

	// Track ID whose direct deep-link was recently copied to clipboard
	let copiedTrackId = $state(/** @type {string | null} */ (null));

	let deepLinkedTrack = $derived(
		deepLinkedTrackId ? album.tracks.find((t) => t.id === deepLinkedTrackId) || null : null
	);

	/**
	 * Normalizes a string into a lowercase alphanumeric hyphenated slug for flexible track matching.
	 * @param {string} str
	 * @returns {string}
	 */
	function slugifyTrackToken(str) {
		return (str || '')
			.toLowerCase()
			.trim()
			.replace(/^#?(?:track-)?/, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	/**
	 * Resolves a track from `album.tracks` matching a URL query parameter (`?track=`, `?play=`, `?song=`)
	 * or hash fragment (`#track-...`). Supports matching by `fileName` (e.g. `2-04-moon-1-tidal-lock`),
	 * stripped `fileName` (`moon-1-tidal-lock`), `id`, `isrc`, `disc-track` (`2-4` / `2-04`), or title slug.
	 *
	 * @param {string} rawQuery
	 * @param {any[]} tracks
	 * @returns {any | null}
	 */
	function findTrackByDeepLink(rawQuery, tracks) {
		if (!rawQuery || !Array.isArray(tracks) || tracks.length === 0) return null;
		const cleanRaw = rawQuery.trim().toLowerCase().replace(/^#?(?:track-)?/, '');
		const cleanSlug = slugifyTrackToken(rawQuery);
		if (!cleanRaw && !cleanSlug) return null;

		for (const t of tracks) {
			const fileName = (t.fileName || '').toLowerCase();
			const strippedFileName = fileName.replace(/^\d+-\d+-/, '');
			const id = (t.id || '').toLowerCase();
			const isrc = (t.isrc || '').toLowerCase();
			const discNum = t.disc || 1;
			const trackNum = t.track || 1;
			const discTrackShort = `${discNum}-${trackNum}`;
			const discTrackPadded = `${discNum}-${String(trackNum).padStart(2, '0')}`;
			const titleSlug = slugifyTrackToken(t.title || '');

			if (
				fileName === cleanRaw ||
				fileName === cleanSlug ||
				(strippedFileName && (strippedFileName === cleanRaw || strippedFileName === cleanSlug)) ||
				id === cleanRaw ||
				id === cleanSlug ||
				(isrc && isrc === cleanRaw) ||
				discTrackShort === cleanRaw ||
				discTrackPadded === cleanRaw ||
				(titleSlug && titleSlug === cleanSlug)
			) {
				return t;
			}
		}

		// Secondary partial match on stripped fileName or titleSlug
		return (
			tracks.find((t) => {
				const strippedFileName = (t.fileName || '').toLowerCase().replace(/^\d+-\d+-/, '');
				const titleSlug = slugifyTrackToken(t.title || '');
				return (
					(strippedFileName && strippedFileName.includes(cleanSlug)) ||
					(titleSlug && titleSlug.includes(cleanSlug))
				);
			}) || null
		);
	}

	// Reactively detect incoming deep-link parameters (?track=, ?play=, ?song=, or #track-...)
	// and automatically highlight the requested song, expand its Lore & Lyrics, and scroll to it.
	// Audio playback only auto-starts if the user explicitly enabled `dspManager.autoplayDeepLinks`
	// in `/settings` (defaults to `false` for WCAG 2.1 SC 1.4.2 Audio Control compliance).
	$effect(() => {
		if (typeof window === 'undefined' || !page.url || !album?.tracks?.length) return;

		const trackParam =
			page.url.searchParams.get('track') ||
			page.url.searchParams.get('play') ||
			page.url.searchParams.get('song') ||
			'';
		const rawHash =
			page.url.hash && page.url.hash !== '#share-album-section' ? page.url.hash : '';
		const targetQuery = trackParam || rawHash;

		if (!targetQuery) return;

		const deepLinkKey = `${album.id}::${targetQuery}`;
		if (deepLinkKey === lastHandledDeepLinkKey) return;

		const matchedTrack = findTrackByDeepLink(targetQuery, album.tracks);
		if (!matchedTrack) return;

		lastHandledDeepLinkKey = deepLinkKey;
		deepLinkedTrackId = matchedTrack.id;
		expandedTrackId = matchedTrack.id;

		if (dspManager.autoplayDeepLinks && matchedTrack.isPlayable) {
			playTrack(matchedTrack);
		}

		tick().then(() => {
			const rowDomId = `track-${matchedTrack.fileName || matchedTrack.id}`;
			const rowEl = document.getElementById(rowDomId);
			if (rowEl) {
				rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
	});

	/**
	 * Copies a direct deep-link URL that starts/highlights a specific track on this album.
	 * @param {any} track
	 */
	async function copyTrackDeepLink(track) {
		const slugOrId = track.fileName || track.id;
		const shareUrl = `https://music.raggiesoft.com/${album.artistSlug}/${album.slug}?track=${encodeURIComponent(slugOrId)}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copiedTrackId = track.id;
			setTimeout(() => {
				if (copiedTrackId === track.id) copiedTrackId = null;
			}, 2500);
		} catch {
			// Fallback if clipboard permission is unavailable
		}
	}

	/**
	 * Toggles lore and lyrics details for the specified track.
	 * @param {string} trackId
	 */
	function toggleTrackDetails(trackId) {
		expandedTrackId = expandedTrackId === trackId ? null : trackId;
	}

	/**
	 * Initiates continuous queue playback starting from the beginning of the album.
	 */
	function playAlbum() {
		const queue = formatAlbumQueue(album);
		if (queue.length > 0) {
			player.loadQueue(queue, 0, true);
		}
	}

	/**
	 * Plays a specific playable track from this album (or toggles play/pause if already loaded).
	 * @param {any} track
	 */
	function playTrack(track) {
		if (!track.isPlayable) return;
		if (isCurrentTrack(track)) {
			player.togglePlay();
			return;
		}
		const queue = formatAlbumQueue(album);
		const trackIndex = queue.findIndex(
			(t) => t.id === track.id || (t.isrc && t.isrc === track.isrc)
		);
		if (trackIndex !== -1) {
			player.loadQueue(queue, trackIndex, true);
		}
	}

	/**
	 * Checks if the given track is currently playing or loaded in the active player.
	 * @param {any} track
	 * @returns {boolean}
	 */
	function isCurrentTrack(track) {
		if (!player.currentTrack) return false;
		if (track.isrc && player.currentTrack.isrc) {
			return track.isrc === player.currentTrack.isrc;
		}
		return player.currentTrack.id === track.id;
	}

	/**
	 * Checks whether a specific Related Song card is the exact album + track instance
	 * currently loaded in the audio player (prevents two cards that share an ISRC across
	 * a studio album and a compilation from both lighting up with duplicate blue
	 * `❚❚ Playing` buttons).
	 *
	 * @param {import('#lib/data/musicData.js').RelatedSongEntry} relEntry
	 * @returns {boolean}
	 */
	function isExactRelatedTrack(relEntry) {
		if (!player.currentTrack || !relEntry) return false;
		return (
			player.currentTrack.id === relEntry.track.id &&
			player.currentTrack.albumSlug === relEntry.album.slug
		);
	}

	/**
	 * Checks whether another album's copy of the exact same master recording (shared ISRC)
	 * is currently loaded in the audio player.
	 *
	 * @param {import('#lib/data/musicData.js').RelatedSongEntry} relEntry
	 * @returns {boolean}
	 */
	function isSharedMasterPlaying(relEntry) {
		if (!relEntry) return false;
		return !isExactRelatedTrack(relEntry) && isCurrentTrack(relEntry.track);
	}

	/**
	 * Plays a specific related version/recording directly in the persistent audio player,
	 * queuing all distinct playable versions of that song family so the listener can
	 * step forward/backward across versions.
	 *
	 * @param {import('#lib/data/musicData.js').RelatedSongEntry} relEntry
	 */
	function playRelatedVersion(relEntry) {
		if (!relEntry?.track?.isPlayable) return;
		if (isExactRelatedTrack(relEntry) || isSharedMasterPlaying(relEntry)) {
			player.togglePlay();
			return;
		}
		const { queue, startIndex } = buildSongFamilyComparisonQueue(relEntry.track, relEntry.album);
		if (queue.length > 0) {
			player.loadQueue(queue, startIndex, true);
		} else {
			player.loadQueue([relEntry.playerTrack], 0, true);
		}
	}

	/**
	 * Loads and plays all distinct playable recordings of a song family in chronological order
	 * (from the earliest demo/studio master through live recordings and remixes).
	 *
	 * @param {any} track
	 */
	function compareAllPlayableVersions(track) {
		const { queue } = buildSongFamilyComparisonQueue(track, album);
		if (queue.length > 0) {
			player.loadQueue(queue, 0, true);
		}
	}
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{album.title} by {album.artist} | The Listening Room — Engine Room Records</title>
	<meta
		name="title"
		content="{album.title} by {album.artist} | The Listening Room — Engine Room Records"
	/>
	<meta name="description" content={album.description} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="music.album" />
	<meta property="og:site_name" content="The Listening Room | Engine Room Records" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content="{album.title} — {album.artist}" />
	<meta property="og:description" content={album.description} />
	<meta property="og:image" content={album.socialPreview} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{album.title} by {album.artist} - Social Preview" />
	<meta property="music:musician" content="https://music.raggiesoft.com/{album.artistSlug}" />
	<meta property="music:release_date" content={album.temporalCoverage || album.year} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content="{album.title} — {album.artist}" />
	<meta name="twitter:description" content={album.description} />
	<meta name="twitter:image" content={album.socialPreview} />
	<meta name="twitter:image:alt" content="{album.title} by {album.artist} - Social Preview" />

	<!-- Structured Data (JSON-LD) for Schema.org MusicAlbum -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<div class="space-y-10">
	<!-- Breadcrumb Navigation Bar -->
	<nav
		class="flex items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm"
		aria-label="Breadcrumb"
	>
		<a
			href={resolve('/discography')}
			class="flex items-center gap-1.5 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Discography
		</a>
		<span class="text-slate-600">/</span>
		<a
			href={resolve('/[artist]', { artist: album.artistSlug })}
			class="text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			{album.artist}
		</a>
		<span class="text-slate-600">/</span>
		<span class="truncate font-semibold text-slate-200">{album.title}</span>
	</nav>

	<!-- Album Hero Showcase Area -->
	<section
		class="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
	>
		<div class="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
			<!-- Artwork Container (with optional Play Overlay) -->
			<div
				class="group relative mx-auto h-64 w-64 shrink-0 overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl sm:h-72 sm:w-72 md:mx-0"
			>
				<img
					src={album.artwork}
					alt="Cover artwork for {album.title}"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>

				{#if album.status !== 'coming-soon'}
					<button
						onclick={playAlbum}
						class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
						aria-label="Play 128kbps Preview of {album.title}"
					>
						<span
							class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110"
						>
							<svg class="h-8 w-8 translate-x-0.5 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</span>
					</button>
				{:else}
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<span
							class="rounded-full border border-amber-600/60 bg-amber-950/90 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-lg"
						>
							In Studio
						</span>
					</div>
				{/if}
			</div>

			<!-- Album Metadata & Synopsis -->
			<div class="flex flex-1 flex-col justify-between text-left">
				<div>
					<div class="mb-3 flex flex-wrap items-center gap-2">
						{#if album.isRockOpera}
							<span
								class="rounded-md border border-indigo-700/50 bg-indigo-900/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-300 uppercase shadow-sm"
							>
								Rock Opera ⚡
							</span>
						{/if}
						{#if album.albumType === 'live'}
							<span
								class="rounded-md border border-rose-600/50 bg-rose-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-rose-300 uppercase shadow-sm"
							>
								Live Album ⚡
							</span>
						{:else if album.albumType === 'compilation'}
							<span
								class="rounded-md border border-purple-600/50 bg-purple-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-purple-300 uppercase shadow-sm"
							>
								Compilation 💿
							</span>
						{:else if album.albumType === 'soundtrack'}
							<span
								class="rounded-md border border-teal-600/50 bg-teal-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-teal-300 uppercase shadow-sm"
							>
								Soundtrack 🎬
							</span>
						{:else}
							<span
								class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-slate-300 uppercase shadow-sm"
							>
								Studio Album 🎙️
							</span>
						{/if}
						{#if discs.length > 1}
							<span
								class="rounded-md border border-cyan-500/50 bg-cyan-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-cyan-200 uppercase shadow-sm"
								title="{discs.length}-Disc Red Book Digital Audio CD Release ({albumTotalDurationFormatted} total runtime)"
							>
								{discs.length}-Disc CD Set 💿
							</span>
						{/if}
						{#if album.status === 'coming-soon'}
							<span
								class="rounded-md border border-amber-600/50 bg-amber-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-amber-300 uppercase shadow-sm"
							>
								Coming Soon
							</span>
						{:else if album.status === 'in-progress'}
							<span
								class="rounded-md border border-sky-600/50 bg-sky-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-sky-300 uppercase shadow-sm"
							>
								In Production ({album.playableTrackCount}/{album.totalTracksCount} Ready)
							</span>
						{:else}
							<span
								class="rounded-md border border-emerald-600/50 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-emerald-300 uppercase shadow-sm"
							>
								Released
							</span>
						{/if}
						<span class="font-mono text-xs font-semibold text-slate-400">
							Lore Era: {formatReleaseDate(album.temporalCoverage, album.year)} • Real-World Release: {album.datePublished || '2026'} • {album.genre}
							{#if album.upc}
								• UPC: {album.upc}
							{/if}
						</span>
					</div>

					<h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
						{album.title}
					</h1>

					{#if album.subtitle}
						<p class="mt-1.5 text-sm font-bold tracking-wide text-amber-400 uppercase sm:text-base">
							{album.subtitle}
						</p>
					{/if}

					<a
						href={resolve('/[artist]', { artist: album.artistSlug })}
						class="group/artist mt-2.5 inline-flex items-center gap-3"
					>
						{#if album.artistLogo}
							<img
								src={album.artistLogo}
								alt="{album.artist} logo badge"
								class="h-8 w-8 shrink-0 rounded-full border border-slate-700/80 bg-slate-950 object-cover shadow-md sm:h-9 sm:w-9"
							/>
						{/if}
						<span class="text-lg font-bold text-blue-400 group-hover/artist:underline sm:text-xl">
							{album.artist}
						</span>
					</a>

					{#if album.linerNotes && album.linerNotes.length > 0}
						<div class="mt-4 space-y-3">
							{#each album.linerNotes as paragraph, pIdx (pIdx)}
								<p
									class="leading-relaxed {pIdx === 0
										? 'text-sm font-medium text-slate-200 sm:text-base'
										: 'text-sm text-slate-300'}"
								>
									{paragraph}
								</p>
							{/each}
						</div>
					{:else}
						<p class="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
							{album.description}
						</p>
					{/if}
				</div>

				<!-- Action Buttons & Discovery Hub Upgrade Row -->
				<div class="mt-8 space-y-4 border-t border-slate-800/80 pt-6">
					{#if album.dspExempt && album.dspNotice}
						<div
							class="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-200"
						>
							<strong class="font-extrabold uppercase tracking-wider text-amber-300">
								Vault Exclusive:
							</strong>
							{album.dspNotice}
						</div>
					{/if}

					<div class="flex flex-wrap items-center gap-3">
						<!-- 1. Primary External DSP & Fourthwall Storefront Buttons (when available) -->
						<StoreButton
							type="album"
							size="large"
							spotifyId={album.spotifyId}
							appleId={album.appleId}
							amazonId={album.amazonId}
							youtubeId={album.youtubeId}
							dspExempt={album.dspExempt}
							storeStandardUrl={album.storeStandardUrl}
							storeAudiophileUrl={album.storeAudiophileUrl}
						/>

						<!-- 2. Built-In 128kbps Preview Stream Button -->
						{#if album.status === 'coming-soon'}
							<span
								class="flex cursor-not-allowed items-center gap-2 rounded-xl border border-amber-800/60 bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-300 select-none"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								In Production / Studio
							</span>
						{:else if album.status === 'in-progress'}
							<button
								onclick={playAlbum}
								class="flex items-center gap-2.5 rounded-xl border border-sky-500/60 bg-sky-950/60 px-5 py-3 text-sm font-semibold text-sky-200 shadow-md transition-all hover:bg-sky-900/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
							>
								<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								Preview Stream (128kbps • {album.playableTrackCount} Songs)
							</button>
						{:else if hasAnyDsp(album) || hasFourthwallStore(album)}
							<!-- Outlined / Muted Secondary Hierarchy when DSP or Fourthwall is present -->
							<button
								onclick={playAlbum}
								class="flex items-center gap-2.5 rounded-xl border border-slate-600/90 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-blue-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
								title="Stream free 128kbps web preview while reading lyrics & lore"
							>
								<svg class="h-4 w-4 fill-current text-blue-400" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								Preview Stream (128kbps MP3)
							</button>
						{:else}
							<!-- Primary button when album is not yet on DSPs or Fourthwall -->
							<button
								onclick={playAlbum}
								class="flex items-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
							>
								<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								Preview Stream (128kbps • {album.totalTracksCount} Songs)
							</button>
						{/if}

						<!-- 3. CC BY-SA 4.0 Free 128kbps MP3 ZIP Archive Download Button -->
						{#if album.freeArchiveUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={album.freeArchiveUrl}
								download
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-md transition-colors hover:border-emerald-400 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
								title="Download Free 128kbps MP3 Album Archive (.zip) — Licensed under CC BY-SA 4.0"
							>
								<svg
									class="h-4 w-4 text-emerald-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
									/>
								</svg>
								<span>Free 128kbps MP3 (.zip)</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}

						<!-- Share Album Button -->
						<a
							href="#share-album-section"
							class="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
								/>
							</svg>
							Share Album
						</a>

						<!-- Deep-Dive Story & Novel Lore Links -->
						{#if album.loreLinks && album.loreLinks.length > 0}
							{#each album.loreLinks as loreLink (loreLink.url)}
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={loreLink.url}
									target={loreLink.url.startsWith('http') ? '_blank' : undefined}
									rel={loreLink.url.startsWith('http') ? 'noopener noreferrer' : undefined}
									class="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-4 py-3 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
									title={loreLink.description || loreLink.label}
								>
									<svg
										class="h-4 w-4 text-indigo-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										/>
									</svg>
									<span>{loreLink.label}</span>
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/each}
						{:else if album.loreUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={album.loreUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-4 py-3 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
							>
								<svg class="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								<span>Story Archive (RaggieSoft.com)</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{:else if album.artistLoreUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={album.artistLoreUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-4 py-3 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
							>
								<svg class="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								<span>{album.artist} Lore Archive (RaggieSoft.com)</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}

						<!-- Link to Artist Page -->
						<a
							href={resolve('/[artist]', { artist: album.artistSlug })}
							class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
						>
							{album.artist} Profile &rarr;
						</a>
					</div>

					<!-- Transparent "Support the Artist & CC BY-SA 4.0 Free Download" Microcopy -->
					{#if hasAnyDsp(album) || hasFourthwallStore(album) || album.freeArchiveUrl}
						<div
							class="rounded-2xl border border-slate-800/90 bg-slate-950/70 px-4 py-3 text-xs leading-relaxed text-slate-300 shadow-inner"
						>
							<p>
								<span class="mr-1" aria-hidden="true">💛</span>
								<strong class="text-white">CC BY-SA 4.0 Free Downloads &amp; Artist Support:</strong>
								The built-in player streams free <strong>128kbps web previews</strong>, and you can
								freely download the
								{#if album.freeArchiveUrl}
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									<a
										href={album.freeArchiveUrl}
										download
										target="_blank"
										rel="noopener noreferrer"
										class="font-bold text-emerald-300 underline decoration-emerald-400/60 hover:text-white"
									>
										complete 128kbps MP3 Album ZIP Archive
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
									or individual <strong>128kbps MP3 tracks</strong> below
								{:else}
									individual <strong>128kbps MP3 tracks</strong> below
								{/if}
								under our
								<a
									href="https://creativecommons.org/licenses/by-sa/4.0/"
									target="_blank"
									rel="noopener noreferrer"
									class="font-semibold text-blue-300 underline decoration-blue-400/60 hover:text-white"
								>
									Creative Commons BY-SA 4.0 License
								</a>.
								{#if hasAnyDsp(album) || hasFourthwallStore(album)}
									{#if hasAnyDsp(album)}
										Streaming in lossless or high-res on your favorite music app—or saving this
										album to your library—directly supports
									{:else}
										Purchasing the studio archive directly on Fourthwall supports
									{/if}
									<strong class="text-blue-300">Michael Ragsdale</strong> and helps fund the next
									<strong class="text-blue-300">Engine Room Records</strong> release.
									{#if hasFourthwallStore(album)}
										You can also own the DRM-free digital release on Fourthwall in
										<strong class="text-cyan-300">High-Quality MP3/OGG</strong> or
										<strong class="text-amber-300">Master WAV/FLAC</strong>.
									{/if}
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Live Stage Transcript Section (when present in album.json) -->
	{#if album.liveTranscript}
		<section
			class="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-slate-950 p-6 shadow-xl sm:p-8"
		>
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
				<span
					class="inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-950/80 px-3.5 py-1 text-xs font-bold tracking-wider text-rose-300 uppercase"
				>
					🎤 {album.liveTranscript.title}
				</span>
				{#if album.liveTranscript.venue}
					<span class="font-mono text-xs text-slate-400">{album.liveTranscript.venue}</span>
				{/if}
			</div>

			{#if album.liveTranscript.paragraphs}
				<div class="space-y-3 text-sm leading-relaxed text-slate-300 italic">
					{#each album.liveTranscript.paragraphs as p, idx (idx)}
						<p>{p}</p>
					{/each}
				</div>
			{/if}

			{#if album.liveTranscript.quote}
				<blockquote
					class="mt-5 rounded-xl border-l-4 border-amber-500 bg-slate-950/90 p-4 font-mono text-sm font-bold tracking-wide text-amber-300 shadow-inner sm:text-base"
				>
					"{album.liveTranscript.quote}"
					{#if album.liveTranscript.attribution}
						<footer class="mt-2 text-xs font-normal text-slate-400">
							— {album.liveTranscript.attribution}
						</footer>
					{/if}
				</blockquote>
			{/if}
		</section>
	{/if}

	<!-- Studio Archives & Production Lore Section (migrated from raggiesoft-hub) -->
	{#if album.studioArchives && album.studioArchives.length > 0}
		<section class="space-y-4">
			<div class="border-b border-slate-800/80 pb-3">
				<h2 class="text-xl font-bold tracking-tight text-white uppercase sm:text-2xl">
					Studio Archives &amp; Liner Notes
				</h2>
				<p class="text-xs text-slate-400 sm:text-sm">
					Behind-the-scenes production logs, engineering notes, and historical context from the Engine
					Room Records vault
				</p>
			</div>

			<div
				class="grid grid-cols-1 gap-4 {album.studioArchives.length === 1
					? 'md:grid-cols-1'
					: album.studioArchives.length === 3
						? 'lg:grid-cols-3'
						: 'md:grid-cols-2'}"
			>
				{#each album.studioArchives as archive, aIdx (aIdx)}
					<div
						class="flex flex-col justify-between rounded-2xl border p-5 shadow-lg {archive.variant ===
						'warning'
							? 'border-amber-500/30 bg-amber-950/15'
							: archive.variant === 'danger'
								? 'border-rose-500/30 bg-rose-950/15'
								: archive.variant === 'success'
									? 'border-emerald-500/30 bg-emerald-950/15'
									: archive.variant === 'primary'
										? 'border-indigo-500/30 bg-indigo-950/20'
										: 'border-cyan-500/30 bg-slate-900/80'}"
					>
						<div>
							<h3
								class="mb-2 text-sm font-extrabold tracking-wider uppercase {archive.variant ===
								'warning'
									? 'text-amber-300'
									: archive.variant === 'danger'
										? 'text-rose-300'
										: archive.variant === 'success'
											? 'text-emerald-300'
											: archive.variant === 'primary'
												? 'text-indigo-300'
												: 'text-cyan-300'}"
							>
								{archive.title}
							</h3>
							<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
								{archive.content}
							</p>
						</div>

						{#if archive.link}
							<div class="mt-4 pt-2">
								<a
									href={archive.link.url}
									target={archive.link.url.startsWith('http') ? '_blank' : undefined}
									rel={archive.link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
									class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline"
								>
									<span>{archive.link.label}</span>
									<span>&rarr;</span>
								</a>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Tracklist & Discography Sequence -->
	<section class="space-y-6">
		<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
			<div>
				<h2 class="text-2xl font-bold tracking-tight text-white">
					Tracklist, Lyrics &amp; Canonical Lore
				</h2>
				<p class="text-xs text-slate-400 sm:text-sm">
					{#if discs.length > 1}
						<strong class="text-cyan-300">{discs.length} Digital Audio CDs (74-Min Red Book Standard)</strong> •
					{/if}
					{album.totalTracksCount} tracks{#if albumTotalSeconds > 0} ({albumTotalDurationFormatted} total runtime){/if} • {album.playableTrackCount} available as 128kbps web preview
					streams &amp; CC BY-SA 4.0 downloads
				</p>
			</div>

			{#if album.freeArchiveUrl}
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={album.freeArchiveUrl}
					download
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
					title="Download Full Album 128kbps MP3 Archive (.zip) under CC BY-SA 4.0"
				>
					<span>⬇ Download Album 128kbps MP3 (.zip)</span>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>

		{#if deepLinkedTrack}
			<div
				class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-500/50 bg-blue-950/30 p-4 shadow-lg"
			>
				<div class="flex items-center gap-3">
					<span
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/30 text-blue-300"
					>
						🎵
					</span>
					<div>
						<div class="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
							Featured Track Deep-Link • Disc {deepLinkedTrack.disc || 1}, Track {deepLinkedTrack.track}
						</div>
						<div class="text-sm font-bold text-white sm:text-base">
							{deepLinkedTrack.title}{deepLinkedTrack.version ? ` (${deepLinkedTrack.version})` : ''}
						</div>
						<div class="mt-0.5 text-[11px] text-slate-300">
							Autoplay on Deep-Links:
							<strong class={dspManager.autoplayDeepLinks ? 'text-emerald-300' : 'text-amber-300'}>
								{dspManager.autoplayDeepLinks ? 'On' : 'Off (WCAG Default)'}
							</strong>
							•
							<a
								href={resolve('/settings')}
								class="font-semibold text-blue-300 underline decoration-blue-400/60 hover:text-white"
							>
								Configure in Settings
							</a>
						</div>
					</div>
				</div>
				{#if deepLinkedTrack.isPlayable}
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onclick={() => playTrack(deepLinkedTrack)}
							class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-sm"
						>
							{#if isCurrentTrack(deepLinkedTrack) && player.isPlaying}
								<span>❚❚ Pause Track</span>
							{:else}
								<span>▶ Play "{deepLinkedTrack.title}"</span>
							{/if}
						</button>
						{#if deepLinkedTrack.audioUrl}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={deepLinkedTrack.audioUrl}
								download="{deepLinkedTrack.fileName || deepLinkedTrack.id}.mp3"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-900/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:text-sm"
								title="Download 128kbps MP3 ({deepLinkedTrack.title}) under CC BY-SA 4.0"
							>
								<span>⬇ 128kbps MP3</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<div class="space-y-8">
			{#each discs as disc (disc.discNum)}
				<div
					class="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl"
				>
					{#if discs.length > 1}
						<div
							class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-slate-800/80 via-slate-900/90 to-slate-800/60 px-6 py-4"
						>
							<div class="flex flex-wrap items-center gap-2.5">
								<span
									class="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/70 px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider text-cyan-200 uppercase"
								>
									💿 Disc {disc.discNum} of {discs.length}
								</span>
								{#if disc.discName}
									<span class="text-sm font-bold tracking-wide text-white sm:text-base">
										{disc.discName}
									</span>
								{/if}
							</div>
							<div class="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-300">
								<span class="rounded-md border border-slate-700 bg-slate-950/80 px-2.5 py-1">
									{disc.tracks.length} Tracks
								</span>
								{#if disc.totalSeconds > 0}
									<span
										class="rounded-md border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 font-semibold text-emerald-300"
										title="Fits cleanly inside the 74:00 Red Book Digital Audio CD standard"
									>
										⏱ {disc.totalDurationFormatted} / 74:00 CD
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<div class="divide-y divide-slate-800/60">
						{#each disc.tracks as track (track.id)}
							{@const relatedSongs = getRelatedSongs(track, album)}
							{@const comparisonData =
								relatedSongs.length > 0
									? buildSongFamilyComparisonQueue(track, album)
									: { queue: [], startIndex: 0 }}
							<div
								id="track-{track.fileName || track.id}"
								class="flex flex-col transition-colors {isCurrentTrack(track)
									? 'bg-blue-950/20'
									: deepLinkedTrackId === track.id
										? 'bg-indigo-950/25 ring-1 ring-blue-500/40'
										: 'hover:bg-slate-800/40'}"
							>
								<div class="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
									<div class="flex min-w-0 items-center gap-4">
										<!-- Track Number or Play Button -->
										{#if track.isPlayable}
											<button
												onclick={() => playTrack(track)}
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition-all hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isCurrentTrack(
													track
												)
													? 'bg-blue-600 text-white'
													: ''}"
												aria-label="Play {track.title}"
											>
												{#if isCurrentTrack(track) && player.isPlaying}
													<span class="text-xs">❚❚</span>
												{:else}
													<span class="translate-x-0.5 text-xs">▶</span>
												{/if}
											</button>
										{:else}
											<div
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-xs text-slate-500"
											>
												{track.track}
											</div>
										{/if}

										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<h3
													class="truncate text-sm font-semibold {isCurrentTrack(track)
														? 'font-bold text-blue-400'
														: 'text-white'}"
												>
													{track.title}
												</h3>
												{#if track.version}
													<span
														class="rounded border border-cyan-500/40 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-cyan-200"
														title="Version: {track.version}"
													>
														{track.version}
													</span>
												{/if}
												{#if track.legacyTier}
													<span
														class="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase {track.legacyTier.includes(
															'Smash'
														) || track.legacyTier.includes('Masterpiece')
															? 'border-emerald-600/50 bg-emerald-950/70 text-emerald-300'
															: track.legacyTier.includes('Anthem') ||
																  track.legacyTier.includes('Classic') ||
																  track.legacyTier.includes('Favorite')
																? 'border-blue-600/50 bg-blue-950/70 text-blue-300'
																: track.legacyTier.includes('Dud') ||
																	  track.legacyTier.includes('Filler')
																	? 'border-rose-600/50 bg-rose-950/70 text-rose-300'
																	: 'border-slate-700 bg-slate-800/80 text-slate-300'}"
													>
														{track.legacyTier}
													</span>
												{/if}
												{#if !track.isPlayable}
													<span
														class="rounded border border-amber-800/60 bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 uppercase"
													>
														In Studio
													</span>
												{/if}
												{#if relatedSongs.length > 0}
													<button
														type="button"
														onclick={() => toggleTrackDetails(track.id)}
														class="inline-flex items-center gap-1 rounded border border-purple-500/50 bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-purple-200 uppercase transition-colors hover:border-purple-400 hover:bg-purple-900/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
														title="Compare {relatedSongs.length} other {relatedSongs.length === 1
															? 'version or recording'
															: 'versions and recordings'} of {track.title}"
													>
														<span>🔀</span>
														<span>
															{relatedSongs.length}
															{relatedSongs.length === 1 ? 'Other Version' : 'Other Versions'}
														</span>
													</button>
												{/if}
											</div>
											<div class="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
												{#if track.isrc}
													<span class="font-mono text-[11px] text-slate-400"
														>ISRC: {track.isrc}</span
													>
												{/if}
												{#if track.vttVerified}
													<span class="text-emerald-400/90">• ✓ Verified Synced Lyrics</span>
												{:else if track.vttUrl}
													<span class="text-blue-400/80">• Synced Lyrics</span>
												{/if}
											</div>
										</div>
									</div>

									<div class="flex flex-wrap shrink-0 items-center gap-2">
										<span class="font-mono text-xs text-slate-400">{track.duration}</span>

										{#if track.isPlayable && track.audioUrl}
											<!-- eslint-disable svelte/no-navigation-without-resolve -->
											<a
												href={track.audioUrl}
												download="{track.fileName || track.id}.mp3"
												target="_blank"
												rel="noopener noreferrer"
												class="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
												title="Download raw 128kbps MP3 ({track.title}) — CC BY-SA 4.0"
											>
												⬇ MP3
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}

										<button
											type="button"
											onclick={() => copyTrackDeepLink(track)}
											class="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-slate-700 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
											title="Copy direct link to start {track.title}"
										>
											{copiedTrackId === track.id ? '✓ Link Copied' : '🔗 Link'}
										</button>

										{#if track.isPlayable && track.audioUrl}
											<button
												type="button"
												onclick={() =>
													playlistManager.openAddModal({
														artistSlug: album.artistSlug,
														albumSlug: album.slug,
														trackId: track.id,
														title: track.title,
														artist: album.artist,
														album: album.title,
														artwork: album.artwork
													})}
												class="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-500/50 hover:bg-slate-700 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
												title="Add {track.title} to a custom playlist"
											>
												+ Playlist
											</button>
										{/if}

										{#if track.loreNote || track.lyrics || relatedSongs.length > 0}
											<button
												onclick={() => toggleTrackDetails(track.id)}
												class="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
												aria-expanded={expandedTrackId === track.id}
											>
												{expandedTrackId === track.id
													? 'Hide Details'
													: relatedSongs.length > 0
														? `Lore & Versions (${relatedSongs.length + 1})`
														: 'Lore & Lyrics'}
											</button>
										{/if}
									</div>
								</div>

								<!-- Expandable Lore, Related Versions & Lyrics Accordion -->
								{#if expandedTrackId === track.id}
									<div class="space-y-4 border-t border-slate-800/60 bg-slate-950/70 p-5 sm:px-8">
										{#if track.loreNote}
											<div class="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4">
												<div
													class="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-400 uppercase"
												>
													<svg
														class="h-4 w-4"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
														/>
													</svg>
													In-Universe Lore Note
												</div>
												<p
													class="text-sm leading-relaxed whitespace-pre-line text-slate-300 italic"
												>
													"{track.loreNote}"
												</p>
											</div>
										{/if}

										<!-- Related Recordings & Alternate Versions Panel -->
										{#if relatedSongs.length > 0}
											<div class="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4">
												<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
													<div>
														<div
															class="flex items-center gap-1.5 text-xs font-bold tracking-wider text-purple-300 uppercase"
														>
															<span>🔀</span>
															<span>
																Related Recordings &amp; Alternate Versions ({relatedSongs.length})
															</span>
														</div>
														<p class="mt-0.5 text-xs text-slate-300">
															Explore studio originals, early demos, alternate mixes, and live concert
															recordings of this song across the catalog.
														</p>
													</div>

													{#if comparisonData.queue.length > 1}
														<button
															type="button"
															onclick={() => compareAllPlayableVersions(track)}
															class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
															title="Queue all {comparisonData.queue.length} distinct playable versions in chronological order"
														>
															<span>▶ Compare All {comparisonData.queue.length} Playable Versions</span>
														</button>
													{/if}
												</div>

												<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
													{#each relatedSongs as rel (rel.key)}
														<div
															class="flex items-center justify-between gap-3 rounded-xl border p-3 transition-all {isExactRelatedTrack(
																rel
															)
																? 'border-blue-500/60 bg-blue-950/30'
																: isSharedMasterPlaying(rel)
																	? 'border-emerald-500/40 bg-emerald-950/15'
																	: 'border-slate-800/90 bg-slate-900/75 hover:border-purple-500/40'}"
														>
															<div class="flex min-w-0 items-center gap-3">
																<!-- Album Cover Thumbnail -->
																<img
																	src={rel.album.artwork}
																	alt="{rel.album.title} cover art"
																	class="h-12 w-12 shrink-0 rounded-lg border border-slate-700/80 object-cover shadow-sm"
																/>

																<div class="min-w-0">
																	<div class="flex flex-wrap items-center gap-1.5">
																		<span
																			class="rounded border border-purple-500/40 bg-purple-950/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-purple-200 uppercase"
																		>
																			{rel.releaseYear} • {rel.versionLabel}
																		</span>
																		{#if rel.sharedMasterLabel}
																			<span
																				class="rounded border border-emerald-600/50 bg-emerald-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
																				title="This album includes the exact same studio master recording ({rel.track.isrc})"
																			>
																				🔗 {rel.sharedMasterLabel}
																			</span>
																		{/if}
																		{#if !rel.track.isPlayable}
																			<span
																				class="rounded border border-amber-800/60 bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 uppercase"
																			>
																				In Studio
																			</span>
																		{/if}
																	</div>

																	<div class="mt-1 truncate text-xs font-bold text-white sm:text-sm">
																		{rel.track.title}
																	</div>

																	<div class="truncate text-[11px] text-slate-300">
																		{#if rel.album.artistSlug !== album.artistSlug}
																			<span class="font-semibold text-blue-300"
																				>{rel.album.artist}</span
																			>
																			•
																		{/if}
																		<span>{rel.album.title}</span>
																		<span class="text-slate-400">
																			(Disc {rel.track.disc || 1}, Track {rel.track.track})
																		</span>
																	</div>
																</div>
															</div>

															<div class="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
																{#if rel.track.isPlayable}
																	<button
																		type="button"
																		onclick={() => playRelatedVersion(rel)}
																		class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 {isExactRelatedTrack(
																			rel
																		)
																			? 'bg-blue-600 text-white'
																			: isSharedMasterPlaying(rel)
																				? 'border border-emerald-500/50 bg-emerald-950/70 text-emerald-200 hover:bg-emerald-800 hover:text-white'
																				: 'border border-blue-500/50 bg-blue-950/60 text-blue-200 hover:bg-blue-600 hover:text-white'}"
																		aria-label="Play {rel.track.title} from {rel.album.title}"
																		title={isSharedMasterPlaying(rel)
																			? 'This album shares the same audio recording that is currently playing'
																			: `Play ${rel.track.title} from ${rel.album.title}`}
																	>
																		{#if isExactRelatedTrack(rel) && player.isPlaying}
																			<span>❚❚ Playing</span>
																		{:else if isSharedMasterPlaying(rel) && player.isPlaying}
																			<span>🔗 Same Audio Playing</span>
																		{:else}
																			<span>▶ Play</span>
																		{/if}
																	</button>
																{/if}

																<!-- eslint-disable svelte/no-navigation-without-resolve -->
																<a
																	href="{resolve('/[artist]/[album]', {
																		artist: rel.album.artistSlug,
																		album: rel.album.slug
																	})}?track={encodeURIComponent(rel.deepLinkQuery)}"
																	class="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
																	title="Open {rel.album.title} at {rel.track.title}"
																>
																	<span>Album &rarr;</span>
																</a>
																<!-- eslint-enable svelte/no-navigation-without-resolve -->
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if track.lyrics}
											<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
												<div class="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
													Official Lyrics
												</div>
												<div
													class="max-h-80 overflow-y-auto pr-2 font-sans text-sm leading-relaxed whitespace-pre-line text-slate-300"
												>
													{track.lyrics}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Related Artist Releases Shelf -->
	{#if relatedAlbums.length > 0}
		<section class="space-y-4 border-t border-slate-800/80 pt-8">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold tracking-tight text-white">
					More by {album.artist}
				</h2>
				<a
					href={resolve('/[artist]', { artist: album.artistSlug })}
					class="text-xs font-semibold text-blue-400 hover:text-blue-300"
				>
					Full {album.artist} Discography &rarr;
				</a>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each relatedAlbums as rel (rel.id)}
					<a
						href={resolve('/[artist]/[album]', { artist: rel.artistSlug, album: rel.slug })}
						class="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-all hover:border-blue-600/60 hover:bg-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div
							class="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-800"
						>
							<img
								src={rel.artwork}
								alt="Cover artwork for {rel.title}"
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
						</div>
						<div class="mt-2.5 min-w-0">
							<h3
								class="truncate text-xs font-bold text-white group-hover:text-blue-400 sm:text-sm"
							>
								{rel.title}
							</h3>
							<p class="truncate text-[11px] text-slate-400">
								{formatReleaseDate(rel.temporalCoverage, rel.year)} • {rel.tracks.length} tracks
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Book-Reader Style Share Section for this Album -->
	<div id="share-album-section" class="pt-4">
		<ShareSection
			title={album.title}
			subtitle={album.artist}
			description={album.description}
			url={canonicalUrl}
			socialPreview={album.socialPreview}
			sharePrompt="Share this direct album link with friends. Social platforms will automatically display the custom 1200x630 OpenGraph preview card."
		/>
	</div>
</div>

