<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte
	 * ============================================================================
	 * Discovery, Welcoming Dashboard & Full Discography Portal for Engine Room Records
	 * (music.raggiesoft.com). Modeled after the Sophia PWA architecture from the
	 * RaggieSoft Book Library.
	 *
	 * Architectural Principles:
	 * 1. Dual-View Native PWA Layout:
	 *    - Home / Discover: Welcoming dashboard featuring personalized "Jump Back In"
	 *      shelf (restoring playback from browser localStorage), a high-impact Rock Opera
	 *      Spotlight, the in-universe chronological timeline, and artist showcases.
	 *    - Discography / Library: Complete catalog sequenced strictly by
	 *      in-universe ISO 8601 temporalCoverage, filterable by artist and WIP status.
	 * 2. Automated Physical MP3 State Detection:
	 *    - Albums are categorized dynamically as "Released", "In Production" (e.g. 2/11 Ready),
	 *      or "Coming Soon" (all tracks in studio) based strictly on physical disk files.
	 *    - Playback queue filters exclusively to playable tracks.
	 * 3. Session Persistence ("Jump Back In"):
	 *    - Reads localStorage on initial mount to restore last played album, track, and
	 *      playback timestamp so returning listeners can resume with one tap.
	 * 4. Sub-Millisecond Search & Filtering:
	 *    - Unified search indexing album titles, track names, genres, ISRCs, and canonical lore notes.
	 * 5. WCAG 2.1 AA Accessibility:
	 *    - Proper ARIA landmarks, focus rings, keyboard navigation, and live regions.
	 * ============================================================================
	 */
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { allAlbums, catalogStats, formatAlbumQueue } from '#lib/data/musicData.js';

	// Primary View Navigation Tab ('home' | 'discography')
	let activeTab = $state(/** @type {'home' | 'discography'} */ ('home'));

	// Live reactive catalog state (seeded with pre-compiled catalog, refreshed from CDN)
	let currentCatalog = $state(allAlbums);
	let activeFilter = $state('all');
	let activeStatusFilter = $state('all');
	let searchQuery = $state('');
	let expandedAlbumId = $state(/** @type {string | null} */ (null));

	// Saved local playback session for "Jump Back In" shelf
	let savedSession = $state(/** @type {any} */ (null));

	// Dynamic time-of-day greeting (Welcome, Listener)
	let timeGreeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning, Listener.';
		if (hour < 18) return 'Good afternoon, Listener.';
		return 'Good evening, Listener.';
	});

	// Featured Rock Opera spotlight album (e.g. Static & Silence Book 1 or Carnaby Street)
	let spotlightAlbum = $derived.by(() => {
		return (
			currentCatalog.find((a) => a.slug === '2001-static-and-silence-book-1') ||
			currentCatalog.find((a) => a.isRockOpera && a.status === 'released') ||
			currentCatalog[0]
		);
	});

	// Key in-universe timeline milestones sorted chronologically
	let timelineMilestones = $derived.by(() => {
		const featuredSlugs = [
			'1983-carnaby-street',
			'2007-lost-sounds',
			'1992-dream-kingdom-ost',
			'1993-runebreaker-live',
			'1996-julians-beacon',
			'2000-guiding-stars',
			'2001-static-and-silence-book-1',
			'2008-our-own-frequency'
		];
		return currentCatalog
			.filter((a) => featuredSlugs.includes(a.slug))
			.sort((a, b) => {
				const da = a.temporalCoverage || a.year || '9999';
				const db = b.temporalCoverage || b.year || '9999';
				return da.localeCompare(db);
			});
	});

	// Ingest remote CDN catalog in background (Stale-While-Revalidate) & check saved session
	onMount(() => {
		// Check for previous session to populate Jump Back In shelf
		savedSession = player.checkSavedSession();

		fetch('https://assets.raggiesoft.com/engine-room-records/catalog.json')
			.then((res) => (res.ok ? res.json() : null))
			.then((remoteData) => {
				if (Array.isArray(remoteData) && remoteData.length > 0) {
					currentCatalog = remoteData;
				}
			})
			.catch(() => {
				// Silently retain static bundled catalog if offline
			});
	});

	// Dynamically derived list of unique artists from active catalog
	let dynamicArtists = $derived.by(() => {
		/** @type {Record<string, { slug: string, name: string, albumCount: number, trackCount: number }>} */
		const map = {};
		for (const alb of currentCatalog) {
			if (map[alb.artistSlug]) {
				map[alb.artistSlug].albumCount += 1;
				map[alb.artistSlug].trackCount += alb.tracks.length;
			} else {
				map[alb.artistSlug] = {
					slug: alb.artistSlug,
					name: alb.artist,
					albumCount: 1,
					trackCount: alb.tracks.length
				};
			}
		}
		return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Derived filtered album collection based on category filter, status filter, and search
	let filteredAlbums = $derived(
		currentCatalog.filter((album) => {
			// 1. Status Filter (Released vs In Production vs Coming Soon)
			if (activeStatusFilter !== 'all') {
				if (activeStatusFilter === 'released' && album.status !== 'released') return false;
				if (activeStatusFilter === 'in-progress' && album.status !== 'in-progress') return false;
				if (activeStatusFilter === 'coming-soon' && album.status !== 'coming-soon') return false;
			}

			// 2. Primary Category Filter
			if (activeFilter !== 'all') {
				if (activeFilter === 'rock-opera') {
					if (!album.isRockOpera) return false;
				} else if (album.artistSlug !== activeFilter) {
					return false;
				}
			}

			// 3. Live Search Query
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchAlbum =
					album.title.toLowerCase().includes(q) ||
					album.artist.toLowerCase().includes(q) ||
					album.genre.toLowerCase().includes(q) ||
					album.year.includes(q) ||
					(album.temporalCoverage && album.temporalCoverage.includes(q));

				const matchTrack = album.tracks.some(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						(t.loreNote && t.loreNote.toLowerCase().includes(q)) ||
						(t.lyrics && t.lyrics.toLowerCase().includes(q)) ||
						(t.isrc && t.isrc.toLowerCase().includes(q))
				);

				return matchAlbum || matchTrack;
			}

			return true;
		})
	);

	/**
	 * Plays an entire album sequentially.
	 * If the track currently playing is present on this album (as matched by its ISRC),
	 * the player seamlessly aligns to that track in the new album queue without restarting,
	 * letting playback continue uninterrupted.
	 *
	 * @param {typeof currentCatalog[0]} album
	 */
	function playAlbum(album) {
		const queue = formatAlbumQueue(album);
		if (queue.length > 0) {
			const currentIsrc = (player.currentTrack.isrc || '').trim().toUpperCase();
			let targetIndex = 0;
			if (currentIsrc) {
				const matchingIndex = queue.findIndex(
					(t) => (t.isrc || '').trim().toUpperCase() === currentIsrc
				);
				if (matchingIndex !== -1) {
					targetIndex = matchingIndex;
				}
			}
			player.loadQueue(queue, targetIndex, true);
		}
	}

	/**
	 * Plays a specific track from an album and queues the rest of the playable album following it.
	 * Uses track ID or ISRC to locate the track in the album queue. If the track matches the currently
	 * playing track's ISRC, loadQueue seamlessly continues playback without resetting to 0:00.
	 *
	 * @param {typeof currentCatalog[0]} album
	 * @param {typeof currentCatalog[0]['tracks'][0]} track
	 */
	function playTrack(album, track) {
		if (!track.isPlayable || !track.audioUrl) return;
		const queue = formatAlbumQueue(album);
		let qIdx = queue.findIndex((item) => item.id === track.id);
		if (qIdx === -1 && track.isrc) {
			const targetIsrc = track.isrc.trim().toUpperCase();
			qIdx = queue.findIndex((item) => (item.isrc || '').trim().toUpperCase() === targetIsrc);
		}
		if (qIdx !== -1) {
			player.loadQueue(queue, qIdx, true);
		}
	}

	/**
	 * Toggles the visibility of an album's track list drawer.
	 * @param {string} albumId
	 */
	function toggleAlbumDetails(albumId) {
		expandedAlbumId = expandedAlbumId === albumId ? null : albumId;
	}

	/**
	 * Resumes playback from saved session and updates the UI state.
	 */
	function handleResumeSession() {
		player.resumeLastSession();
		savedSession = player.getSavedSession();
	}

	/**
	 * Switches to Discography tab and applies artist filter.
	 * @param {string} artistSlug
	 */
	function viewArtistDiscography(artistSlug) {
		activeFilter = artistSlug;
		activeTab = 'discography';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/**
	 * Switches to Discography tab and selects specific album.
	 * @param {string} albumId
	 */
	function viewAlbumInDiscography(albumId) {
		activeFilter = 'all';
		activeTab = 'discography';
		expandedAlbumId = albumId;
		setTimeout(() => {
			const el = document.getElementById(albumId);
			if (el) el.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	// Share notification state
	let shareToast = $state(/** @type {string | null} */ (null));
	let shareToastTimer = /** @type {any} */ (null);

	/**
	 * Shares or copies a dedicated link to the specified album.
	 * @param {import('#lib/data/musicData.js').Album} album
	 */
	async function shareAlbum(album) {
		const shareUrl = `https://music.raggiesoft.com/album/${album.slug}`;
		const shareData = {
			title: `${album.title} by ${album.artist}`,
			text: `Listen to ${album.title} on Engine Room Records: ${album.description}`,
			url: shareUrl
		};

		if (
			typeof navigator !== 'undefined' &&
			navigator.share &&
			navigator.canShare &&
			navigator.canShare(shareData)
		) {
			try {
				await navigator.share(shareData);
				return;
			} catch {
				// User dismissed native share sheet; fallback to clipboard
			}
		}

		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				showShareToast(`Copied share link for "${album.title}"!`);
			} catch (err) {
				console.warn('Clipboard write failed:', err);
			}
		}
	}

	/**
	 * Displays transient toast confirmation.
	 * @param {string} message
	 */
	function showShareToast(message) {
		if (shareToastTimer) clearTimeout(shareToastTimer);
		shareToast = message;
		shareToastTimer = setTimeout(() => {
			shareToast = null;
		}, 3000);
	}
</script>

<svelte:head>
	<title>Engine Room Records | Official Music & Discography Platform</title>
	<meta
		name="description"
		content="Official streaming catalog and narrative discography for Engine Room Records. Stream complete albums, rock operas, synchronized lyrics, and in-universe lore across the artist roster."
	/>
	<link rel="canonical" href="https://music.raggiesoft.com/" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Engine Room Records" />
	<meta property="og:url" content="https://music.raggiesoft.com/" />
	<meta property="og:title" content="Engine Room Records | Official Music & Discography Platform" />
	<meta
		property="og:description"
		content="Official streaming catalog and narrative discography for Engine Room Records. Stream complete albums, rock operas, synchronized lyrics, and in-universe lore across the artist roster."
	/>
	<meta property="og:image" content="https://music.raggiesoft.com/og-image.jpg" />
	<meta property="og:image:width" content="1376" />
	<meta property="og:image:height" content="768" />
	<meta property="og:image:alt" content="Engine Room Records - Official Music Platform" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@RaggieSoft" />
	<meta name="twitter:url" content="https://music.raggiesoft.com/" />
	<meta
		name="twitter:title"
		content="Engine Room Records | Official Music & Discography Platform"
	/>
	<meta
		name="twitter:description"
		content="Official streaming catalog and narrative discography for Engine Room Records. Stream complete albums, rock operas, synchronized lyrics, and in-universe lore across the artist roster."
	/>
	<meta name="twitter:image" content="https://music.raggiesoft.com/og-image.jpg" />
</svelte:head>

<!-- Floating Share Toast Notification -->
{#if shareToast}
	<div
		class="fixed top-20 left-1/2 z-50 -translate-x-1/2 transform rounded-xl border border-blue-500/40 bg-slate-900/95 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl backdrop-blur-md"
		role="status"
		aria-live="polite"
	>
		<div class="flex items-center gap-2">
			<svg class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>{shareToast}</span>
		</div>
	</div>
{/if}

<!-- ======================================================================= -->
<!-- NATIVE APP STYLE TOP BAR & WELCOMING GREETING (SOPHIA STYLE)            -->
<!-- ======================================================================= -->
<section
	class="mb-6 flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end"
>
	<div>
		<p class="text-xs font-bold tracking-widest text-blue-400 uppercase sm:text-sm">
			{timeGreeting}
		</p>
		<h1 class="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
			Engine Room Records
		</h1>
		<p class="mt-1 text-xs text-slate-400 sm:text-sm">
			Autonomous audio sanctuary. Streaming directly from <span class="font-mono text-slate-300"
				>assets.raggiesoft.com</span
			>.
		</p>
	</div>

	<!-- Primary View Tabs (Home vs Discography) -->
	<nav
		class="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-1.5 shadow-inner"
		aria-label="Main Navigation"
	>
		<button
			onclick={() => (activeTab = 'home')}
			class="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeTab ===
			'home'
				? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
				: 'text-slate-400 hover:text-white'}"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
				/>
			</svg>
			Home
		</button>

		<button
			onclick={() => (activeTab = 'discography')}
			class="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeTab ===
			'discography'
				? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
				: 'text-slate-400 hover:text-white'}"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
			Discography ({currentCatalog.length})
		</button>
	</nav>
</section>

<!-- ======================================================================= -->
<!-- VIEW 1: HOME & DISCOVERY DASHBOARD                                      -->
<!-- ======================================================================= -->
{#if activeTab === 'home'}
	<div class="space-y-10">
		<!-- 1. JUMP BACK IN SHELF (Session Persistence) -->
		{#if savedSession && savedSession.track && savedSession.track.audioUrl}
			<section
				class="rounded-2xl border border-blue-900/40 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 p-5 shadow-xl sm:p-6"
			>
				<div class="mb-3 flex items-center justify-between">
					<div
						class="flex items-center gap-2 text-xs font-bold tracking-wider text-blue-400 uppercase"
					>
						<span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
						Jump Back In
					</div>
					<span class="text-xs text-slate-400">Previous Listening Session</span>
				</div>

				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-4">
						{#if savedSession.track.artwork}
							<img
								src={savedSession.track.artwork}
								alt="Artwork for {savedSession.track.title}"
								class="h-16 w-16 shrink-0 rounded-xl border border-slate-700 object-cover shadow-md"
							/>
						{:else}
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400"
							>
								♫
							</div>
						{/if}

						<div class="min-w-0">
							<h3 class="truncate text-base font-bold text-white sm:text-lg">
								{savedSession.track.title}
							</h3>
							<p class="truncate text-xs font-semibold text-blue-400 sm:text-sm">
								{savedSession.track.artist}
							</p>
							<p class="truncate text-xs text-slate-400">
								{savedSession.track.album}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<button
							onclick={handleResumeSession}
							class="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 sm:text-sm"
						>
							<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Resume Playback
						</button>
					</div>
				</div>
			</section>
		{/if}

		<!-- 2. FEATURED ROCK OPERA SPOTLIGHT -->
		{#if spotlightAlbum}
			<section
				class="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl"
			>
				<div
					class="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"
				></div>
				<div
					class="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl"
				></div>

				<div class="relative z-10 flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center">
					<!-- Cover Art -->
					<div
						class="group relative h-64 w-64 shrink-0 self-center overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl sm:h-72 sm:w-72 lg:self-start"
					>
						<img
							src={spotlightAlbum.artwork}
							alt="Cover for {spotlightAlbum.title}"
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
						></div>
						<div
							class="absolute right-3 bottom-3 left-3 flex items-center justify-between text-xs text-white"
						>
							<span class="rounded bg-black/60 px-2 py-1 font-mono backdrop-blur-md"
								>{spotlightAlbum.year}</span
							>
							<span
								class="rounded bg-indigo-600/80 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur-md"
								>Spotlight</span
							>
						</div>
					</div>

					<!-- Spotlight Narrative Info -->
					<div class="flex flex-1 flex-col text-left">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="rounded border border-indigo-700/50 bg-indigo-900/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-300 uppercase"
							>
								Featured Rock Opera ⚡
							</span>
							<span
								class="rounded border border-blue-700/50 bg-blue-900/60 px-2 py-0.5 font-mono text-xs text-blue-300"
							>
								In-Universe: {spotlightAlbum.temporalCoverage || spotlightAlbum.year}
							</span>
						</div>

						<h2 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
							{spotlightAlbum.title}
						</h2>
						<p class="mt-1 text-lg font-bold text-blue-400">
							{spotlightAlbum.artist}
						</p>

						<p class="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
							{spotlightAlbum.description}
						</p>

						<div class="mt-6 flex flex-wrap items-center gap-3">
							<button
								onclick={() => playAlbum(spotlightAlbum)}
								class="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
							>
								<svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								Play Continuous Rock Opera
							</button>

							<button
								onclick={() => viewAlbumInDiscography(spotlightAlbum.id)}
								class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
							>
								View All Tracks ({spotlightAlbum.tracks.length})
							</button>

							<button
								onclick={() => shareAlbum(spotlightAlbum)}
								class="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
								aria-label="Share {spotlightAlbum.title}"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
									/>
								</svg>
								Share
							</button>

							<a
								href={resolve('/album/[slug]', { slug: spotlightAlbum.slug })}
								class="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
							>
								Dedicated Page &rarr;
							</a>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- 3. CANONICAL IN-UNIVERSE TIMELINE -->
		<section>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
						In-Universe Chronological Timeline
					</h2>
					<p class="text-xs text-slate-400 sm:text-sm">
						Sequenced according to the in-universe historical timeline (<span
							class="font-mono text-slate-300">temporalCoverage</span
						>).
					</p>
				</div>
				<button
					onclick={() => (activeTab = 'discography')}
					class="text-xs font-semibold text-blue-400 hover:text-blue-300"
				>
					View All &rarr;
				</button>
			</div>

			<!-- Horizontal Scroll Timeline Cards -->
			<div class="flex scrollbar-thin gap-4 overflow-x-auto pb-4">
				{#each timelineMilestones as album (album.id)}
					<div
						class="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:shadow-lg"
					>
						<div class="relative aspect-square w-full overflow-hidden rounded-xl">
							<img
								src={album.artwork}
								alt="Cover for {album.title}"
								class="h-full w-full object-cover transition-transform hover:scale-105"
							/>
							<span
								class="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-300 backdrop-blur-md"
							>
								{album.temporalCoverage ? album.temporalCoverage.slice(0, 4) : album.year}
							</span>
						</div>

						<div class="mt-3 flex flex-1 flex-col justify-between">
							<div>
								<h3 class="truncate text-sm font-bold text-white" title={album.title}>
									{album.title}
								</h3>
								<p class="truncate text-xs font-medium text-blue-400">{album.artist}</p>
							</div>

							<div
								class="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5"
							>
								<span class="font-mono text-[11px] text-slate-500">
									{album.playableTrackCount} Playable
								</span>
								{#if album.status !== 'coming-soon'}
									<button
										onclick={() => playAlbum(album)}
										class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-transform hover:scale-110"
										aria-label="Play {album.title}"
									>
										<svg class="h-3.5 w-3.5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z" />
										</svg>
									</button>
								{:else}
									<span class="text-[10px] font-semibold text-amber-400">In Studio</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- 4. ARTIST ROSTER SHELF -->
		<section>
			<div class="mb-4">
				<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
					Bands of Engine Room Records
				</h2>
				<p class="text-xs text-slate-400 sm:text-sm">
					Distinct soundscapes spanning progressive rock, synthwave, 16-bit RPG orchestrations, and
					post-punk across the label's artist roster.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each dynamicArtists as artist (artist.slug)}
					<button
						onclick={() => viewArtistDiscography(artist.slug)}
						class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-all hover:border-blue-600/60 hover:bg-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-700 font-bold text-white shadow-md"
							>
								{artist.name.charAt(0)}
							</div>
							<div>
								<h3 class="text-sm font-bold text-white">{artist.name}</h3>
								<p class="text-xs text-slate-400">
									{artist.albumCount}
									{artist.albumCount === 1 ? 'Release' : 'Releases'} • {artist.trackCount} Songs
								</p>
							</div>
						</div>
						<svg
							class="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				{/each}
			</div>
		</section>

		<!-- 5. IN-UNIVERSE LORE BRIEF -->
		<section class="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 sm:p-8">
			<div class="max-w-3xl">
				<div
					class="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-blue-400 uppercase"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					The Engine Room Sanctuary
				</div>
				<h3 class="text-xl font-bold text-white sm:text-2xl">Music & Narrative Intertwined</h3>
				<p class="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
					Engine Room Records represents the musical heartbeat of the RaggieSoft universe. Founded
					in Williamsport, Maryland by Rhys Manning, the label provided sanctuary for independent
					artists reclaiming their masters, creating concept rock operas, and preserving memories
					across four decades of storytelling.
				</p>
				<div class="mt-5 flex items-center gap-4">
					<a
						href="https://books.raggiesoft.com"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
					>
						Explore Corresponding Books at Ocean View Archives &rarr;
					</a>
				</div>
			</div>
		</section>
	</div>
{/if}

<!-- ======================================================================= -->
<!-- VIEW 2: COMPLETE DISCOGRAPHY / LIBRARY                                  -->
<!-- ======================================================================= -->
{#if activeTab === 'discography'}
	<div>
		<!-- Search Bar -->
		<div class="mx-auto mb-6 max-w-xl">
			<div class="relative">
				<div
					class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search across all artists, songs, albums, and lore notes..."
					class="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pr-12 pl-10 text-sm text-slate-200 placeholder-slate-500 shadow-inner transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
				{#if searchQuery}
					<button
						onclick={() => (searchQuery = '')}
						class="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-white"
					>
						Clear
					</button>
				{/if}
			</div>
		</div>

		<!-- Status Filters (All vs Released vs In Production vs Coming Soon) -->
		<div class="mb-4 flex flex-wrap items-center justify-center gap-2">
			<button
				onclick={() => (activeStatusFilter = 'all')}
				class="rounded-lg px-3 py-1 text-xs font-semibold transition-all {activeStatusFilter ===
				'all'
					? 'bg-slate-700 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				All Statuses
			</button>
			<button
				onclick={() => (activeStatusFilter = 'released')}
				class="rounded-lg px-3 py-1 text-xs font-semibold transition-all {activeStatusFilter ===
				'released'
					? 'bg-emerald-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				Released ({catalogStats.playableTracks} Playable)
			</button>
			<button
				onclick={() => (activeStatusFilter = 'in-progress')}
				class="rounded-lg px-3 py-1 text-xs font-semibold transition-all {activeStatusFilter ===
				'in-progress'
					? 'bg-sky-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				In Production
			</button>
			<button
				onclick={() => (activeStatusFilter = 'coming-soon')}
				class="rounded-lg px-3 py-1 text-xs font-semibold transition-all {activeStatusFilter ===
				'coming-soon'
					? 'bg-amber-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				Coming Soon
			</button>
		</div>

		<!-- Dynamic Filter Navigation Pills (Artists & Rock Operas) -->
		<div class="mb-8 flex flex-wrap items-center justify-center gap-2">
			<button
				onclick={() => (activeFilter = 'all')}
				class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
				'all'
					? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
					: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
			>
				All Artists ({currentCatalog.length})
			</button>
			<button
				onclick={() => (activeFilter = 'rock-opera')}
				class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
				'rock-opera'
					? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
					: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
			>
				Rock Operas ⚡
			</button>
			{#each dynamicArtists as artist (artist.slug)}
				<button
					onclick={() => (activeFilter = artist.slug)}
					class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
					artist.slug
						? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
						: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
				>
					{artist.name}
					<span class="ml-1 font-mono text-[11px] opacity-60">({artist.albumCount})</span>
				</button>
			{/each}
		</div>

		<!-- Albums Grid -->
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			{#if filteredAlbums.length === 0}
				<div
					class="col-span-full rounded-2xl border border-dashed border-slate-800 p-12 text-center"
				>
					<p class="text-base text-slate-400">No releases found matching your filter or search.</p>
					<button
						onclick={() => {
							searchQuery = '';
							activeFilter = 'all';
							activeStatusFilter = 'all';
						}}
						class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
					>
						Reset Search & Filters
					</button>
				</div>
			{/if}

			{#each filteredAlbums as album (album.id)}
				<div
					id={album.id}
					class="flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl transition-all hover:border-slate-700"
				>
					<!-- Card Top / Hero Area -->
					<div class="flex flex-col gap-6 p-6 sm:flex-row">
						<!-- Cover Art Container -->
						<div
							class="group relative h-44 w-44 shrink-0 self-center overflow-hidden rounded-xl border border-slate-800 shadow-lg sm:h-48 sm:w-48 sm:self-start"
						>
							<img
								src={album.artwork}
								alt="Cover artwork for {album.title}"
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>

							<!-- Play Album Overlay Button -->
							{#if album.status !== 'coming-soon'}
								<button
									onclick={() => playAlbum(album)}
									class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
									aria-label="Play {album.title}"
								>
									<span
										class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110"
									>
										<svg class="h-7 w-7 translate-x-0.5 fill-current" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z" />
										</svg>
									</span>
								</button>
							{:else}
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<span
										class="rounded-full border border-amber-600/60 bg-amber-950/90 px-3 py-1 text-xs font-semibold text-amber-300 shadow-lg"
									>
										In Studio
									</span>
								</div>
							{/if}
						</div>

						<!-- Album Info -->
						<div class="flex flex-1 flex-col justify-between text-left">
							<div>
								<div class="mb-2 flex flex-wrap items-center gap-2">
									{#if album.isRockOpera}
										<span
											class="rounded border border-indigo-700/50 bg-indigo-900/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-indigo-300 uppercase"
										>
											Rock Opera
										</span>
									{/if}
									{#if album.status === 'coming-soon'}
										<span
											class="rounded border border-amber-600/50 bg-amber-950/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase"
										>
											Coming Soon
										</span>
									{:else if album.status === 'in-progress'}
										<span
											class="rounded border border-sky-600/50 bg-sky-950/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-sky-300 uppercase"
										>
											In Production ({album.playableTrackCount}/{album.totalTracksCount} Ready)
										</span>
									{:else}
										<span
											class="rounded border border-emerald-600/50 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-emerald-300 uppercase"
										>
											Released
										</span>
									{/if}
									<span class="font-mono text-xs font-semibold text-slate-400">
										{album.temporalCoverage || album.year} • {album.genre}
									</span>
								</div>

								<h2 class="text-xl leading-snug font-bold tracking-tight text-white sm:text-2xl">
									{album.title}
								</h2>
								<p class="mt-1 text-sm font-semibold text-blue-400">
									{album.artist}
								</p>
								<p class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
									{album.description}
								</p>
							</div>

							<!-- Card Action Bar -->
							<div class="mt-4 flex items-center gap-3 border-t border-slate-800/80 pt-4">
								{#if album.status === 'coming-soon'}
									<span
										class="flex cursor-not-allowed items-center gap-2 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300 select-none sm:text-sm"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										Coming Soon
									</span>
								{:else if album.status === 'in-progress'}
									<button
										onclick={() => playAlbum(album)}
										class="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:text-sm"
									>
										<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z" />
										</svg>
										Play Preview ({album.playableTrackCount})
									</button>
								{:else}
									<button
										onclick={() => playAlbum(album)}
										class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
									>
										<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z" />
										</svg>
										Play Album
									</button>
								{/if}

								<button
									onclick={() => toggleAlbumDetails(album.id)}
									class="rounded-lg border border-slate-700/80 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
								>
									{expandedAlbumId === album.id ? 'Hide Tracks' : `Tracks (${album.tracks.length})`}
								</button>

								<button
									onclick={() => shareAlbum(album)}
									class="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
									title="Share album link"
									aria-label="Share {album.title}"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
										/>
									</svg>
									<span>Share</span>
								</button>

								<a
									href={resolve('/album/[slug]', { slug: album.slug })}
									class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
									title="View dedicated album page"
								>
									<span>Details</span>
									<svg
										class="h-3.5 w-3.5 opacity-60"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</a>
							</div>
						</div>
					</div>

					<!-- Collapsible Track List -->
					{#if expandedAlbumId === album.id}
						<div class="border-t border-slate-800 bg-slate-950/60 p-4 transition-all sm:p-6">
							<div
								class="mb-3 flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 uppercase"
							>
								<span>Tracklist</span>
								<span>Duration</span>
							</div>

							<div class="divide-y divide-slate-800/60">
								{#each album.tracks as track, tIdx (track.id || tIdx)}
									<div
										class="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors {track.isPlayable
											? 'hover:bg-slate-800/50'
											: 'opacity-65'} {player.currentTrack.id === track.id
											? 'bg-slate-800/80 text-blue-400'
											: 'text-slate-300'}"
									>
										<div class="flex min-w-0 flex-1 items-center gap-3">
											{#if track.isPlayable}
												<button
													onclick={() => playTrack(album, track)}
													class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
													aria-label="Play {track.title}"
												>
													{#if player.currentTrack.id === track.id && player.isPlaying}
														<svg
															class="h-3.5 w-3.5 fill-current text-blue-400 group-hover:text-white"
															viewBox="0 0 24 24"
														>
															<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
														</svg>
													{:else}
														<svg
															class="h-3.5 w-3.5 translate-x-0.5 fill-current"
															viewBox="0 0 24 24"
														>
															<path d="M8 5v14l11-7z" />
														</svg>
													{/if}
												</button>
											{:else}
												<span
													class="flex h-7 w-7 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500"
													title="Audio in studio production"
												>
													<svg
														class="h-3 w-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												</span>
											{/if}

											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span
														class="truncate text-sm font-medium {track.isPlayable
															? ''
															: 'text-slate-400'}"
													>
														{track.track}. {track.title}
													</span>
													{#if track.legacyTier}
														<span
															class="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
														>
															{track.legacyTier}
														</span>
													{/if}
													{#if !track.isPlayable}
														<span
															class="shrink-0 rounded border border-amber-900/40 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300/80"
														>
															In Studio
														</span>
													{/if}
												</div>
												{#if track.loreNote}
													<span class="block truncate text-[11px] text-slate-500 italic">
														"{track.loreNote.slice(0, 80)}..."
													</span>
												{/if}
											</div>
										</div>

										<div
											class="ml-4 flex shrink-0 items-center gap-3 font-mono text-xs text-slate-500"
										>
											{#if track.isrc}
												<span class="hidden text-slate-600 sm:inline">{track.isrc}</span>
											{/if}
											<span>{track.duration}</span>
										</div>
									</div>
								{/each}
							</div>

							<div
								class="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs"
							>
								<span class="text-slate-500">
									{album.playableTrackCount} of {album.totalTracksCount} tracks available to stream
								</span>
								<a
									href={resolve('/album/[slug]', { slug: album.slug })}
									class="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300"
								>
									Dedicated Album Page & Lore &rarr;
								</a>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
