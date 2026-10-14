<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Home & Discovery Dashboard: /)
	 * ============================================================================
	 * Discovery & Welcoming Dashboard for Engine Room Records (music.raggiesoft.com).
	 * Modeled after the Sophia PWA architecture from the RaggieSoft Book Library.
	 *
	 * Architectural Principles:
	 * 1. SEO-Friendly Navigation & Changing URLs:
	 *    - Every Artist card links directly to `/artist/[slug]`.
	 *    - Every Album card links directly to `/album/[slug]`.
	 *    - "Browse Complete Discography" links to `/discography`.
	 *    - The complex multi-tier search and filter matrix lives inside the
	 *      toggleable `<SearchFilterModal />` so the main heading stays clean.
	 * 2. Session Persistence ("Jump Back In"):
	 *    - Restores last played album, track, and playback timestamp from
	 *      `localStorage` so returning listeners can resume with one tap.
	 * 3. Book-Reader-Style Social Sharing:
	 *    - Includes `<ShareModal />` for instant social sharing of spotlight releases
	 *      and an inline `<ShareSection />` at the bottom of the Home dashboard.
	 * ============================================================================
	 */
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { allAlbums, allArtists, formatAlbumQueue } from '#lib/data/musicData.js';
	import SearchFilterModal from '#lib/components/SearchFilterModal.svelte';
	import ShareModal from '#lib/components/ShareModal.svelte';
	import ShareSection from '#lib/components/ShareSection.svelte';

	let currentCatalog = $state(allAlbums);
	let savedSession = $state(/** @type {any} */ (null));
	let showTransparencyNotice = $state(false);
	let showSearchModal = $state(false);
	let shareModalData = $state(/** @type {any} */ (null));

	/**
	 * Dismisses the Transparency & Dual Timeline notice and persists preference.
	 */
	function dismissTransparencyNotice() {
		showTransparencyNotice = false;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('raggiesoft_music_transparency_dismissed', 'true');
			} catch {
				// Silently catch quota or privacy restriction errors
			}
		}
	}

	// Dynamic time-of-day greeting
	let timeGreeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning, Listener.';
		if (hour < 18) return 'Good afternoon, Listener.';
		return 'Good evening, Listener.';
	});

	// Featured Rock Opera spotlight album
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
			'2004-progress-street',
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

	onMount(() => {
		savedSession = player.checkSavedSession();

		try {
			if (localStorage.getItem('raggiesoft_music_transparency_dismissed') !== 'true') {
				showTransparencyNotice = true;
			}
		} catch {
			showTransparencyNotice = true;
		}

		fetch('https://assets.raggiesoft.com/engine-room-records/catalog.json')
			.then((res) => (res.ok ? res.json() : null))
			.then((remoteData) => {
				if (Array.isArray(remoteData) && remoteData.length > 0) {
					currentCatalog = remoteData;
				}
			})
			.catch(() => {
				// Retain bundled catalog if offline
			});
	});

	/**
	 * Plays an entire album sequentially.
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
	 * Resumes playback from saved session.
	 */
	function handleResumeSession() {
		player.resumeLastSession();
		savedSession = player.getSavedSession();
	}

	/**
	 * Opens the book-reader-style Share Modal for an album.
	 * @param {import('#lib/data/musicData.js').Album} album
	 */
	function openShareModal(album) {
		shareModalData = {
			title: album.title,
			subtitle: album.artist,
			description: album.description,
			url: `https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`,
			socialPreview: album.socialPreview
		};
	}
</script>

<svelte:head>
	<title>Engine Room Records | Official Music &amp; Discography Platform</title>
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

<!-- ======================================================================= -->
<!-- NATIVE APP STYLE TOP BAR & WELCOMING GREETING (SOPHIA STYLE)            -->
<!-- ======================================================================= -->
<section
	class="mb-8 flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end"
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

	<!-- Primary Action & Navigation Bar (Real Links + Collapsible Search Modal) -->
	<div class="flex flex-wrap items-center gap-2.5">
		<button
			type="button"
			onclick={() => (showSearchModal = true)}
			class="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
		>
			<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			Search &amp; Filter Menu
		</button>

		<a
			href={resolve('/discography')}
			class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-sm"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
			Full Discography ({currentCatalog.length}) &rarr;
		</a>
	</div>
</section>

<div class="space-y-10">
	<!-- 0. TRANSPARENCY & DUAL TIMELINE NOTICE (Front & Center, Dismissible) -->
	{#if showTransparencyNotice}
		<section
			class="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-slate-900/95 via-cyan-950/25 to-slate-900/95 p-5 shadow-2xl backdrop-blur-md sm:p-6"
			aria-label="Transparency and Timeline Notice"
		>
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-start gap-3.5 sm:gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-cyan-400 shadow-md"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>

					<div class="space-y-2.5">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="rounded border border-cyan-500/30 bg-cyan-950/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-cyan-300 uppercase"
							>
								Transparency &amp; Timeline Notice
							</span>
						</div>

						<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
							<strong class="text-white">Engine Room Records</strong> is a multimedia storytelling and
							world-building music project within the RaggieSoft universe. The music is generated using
							a commercial Suno license, with conceptual lore, characters, and lyrics co-written by human
							direction and Gemini.
						</p>

						<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
							<strong class="text-white">Dual Timelines:</strong> To maintain our immersive fictional
							universe while strictly complying with modern digital distribution standards, our catalog
							features two timelines: a fictional <strong class="text-white">Narrative Era</strong>
							(e.g., 1983–2008) tied to the artists' in-universe lore, and a real-world
							<strong class="text-white">Actual Release Date</strong> (e.g., 2026) reflecting when the
							audio was officially distributed to streaming platforms.
						</p>

						<div class="flex flex-wrap items-center gap-4 pt-1">
							<a
								href="https://raggiesoft.com/about/ai-disclaimer"
								target="_blank"
								rel="noopener noreferrer nofollow"
								class="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 underline decoration-cyan-500/50 underline-offset-4 transition-colors hover:text-cyan-300 hover:decoration-cyan-400 sm:text-sm"
							>
								Read the full AI Disclaimer
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>

							<button
								type="button"
								onclick={dismissTransparencyNotice}
								class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
							>
								Dismiss
							</button>
						</div>
					</div>
				</div>

				<button
					type="button"
					onclick={dismissTransparencyNotice}
					class="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
					aria-label="Dismiss transparency notice"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</section>
	{/if}

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
						{#if savedSession.track.artistSlug}
							<a
								href={resolve('/[artist]', { artist: savedSession.track.artistSlug })}
								class="block truncate text-xs font-semibold text-blue-400 hover:underline sm:text-sm"
							>
								{savedSession.track.artist}
							</a>
						{:else}
							<p class="truncate text-xs font-semibold text-blue-400 sm:text-sm">
								{savedSession.track.artist}
							</p>
						{/if}
						{#if savedSession.track.albumSlug && savedSession.track.artistSlug}
							<a
								href={resolve('/[artist]/[album]', {
									artist: savedSession.track.artistSlug,
									album: savedSession.track.albumSlug
								})}
								class="block truncate text-xs text-slate-400 hover:text-white"
							>
								{savedSession.track.album}
							</a>
						{:else}
							<p class="truncate text-xs text-slate-400">
								{savedSession.track.album}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-3">
					<button
						type="button"
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
				<a
					href={resolve('/[artist]/[album]', {
						artist: spotlightAlbum.artistSlug,
						album: spotlightAlbum.slug
					})}
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
				</a>

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
						<a
							href={resolve('/[artist]/[album]', {
								artist: spotlightAlbum.artistSlug,
								album: spotlightAlbum.slug
							})}
							class="transition-colors hover:text-blue-400"
						>
							{spotlightAlbum.title}
						</a>
					</h2>
					<div class="mt-1.5 flex items-center gap-2.5">
						{#if spotlightAlbum.artistLogo}
							<img
								src={spotlightAlbum.artistLogo}
								alt="{spotlightAlbum.artist} logo"
								class="h-6 w-6 rounded-full border border-slate-700/80 bg-slate-950 object-cover shadow-sm"
							/>
						{/if}
						<a
							href={resolve('/[artist]', { artist: spotlightAlbum.artistSlug })}
							class="text-lg font-bold text-blue-400 hover:underline"
						>
							{spotlightAlbum.artist}
						</a>
					</div>

					<p class="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
						{spotlightAlbum.description}
					</p>

					<div class="mt-6 flex flex-wrap items-center gap-3">
						<button
							type="button"
							onclick={() => playAlbum(spotlightAlbum)}
							class="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
						>
							<svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Continuous Rock Opera
						</button>

						<a
							href={resolve('/[artist]/[album]', {
								artist: spotlightAlbum.artistSlug,
								album: spotlightAlbum.slug
							})}
							class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
						>
							View All Tracks ({spotlightAlbum.tracks.length}) &rarr;
						</a>

						<button
							type="button"
							onclick={() => openShareModal(spotlightAlbum)}
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
			<a
				href={resolve('/discography')}
				class="text-xs font-semibold text-blue-400 hover:text-blue-300"
			>
				View All &rarr;
			</a>
		</div>

		<!-- Horizontal Scroll Timeline Cards -->
		<div class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
			{#each timelineMilestones as album (album.id)}
				<div
					class="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:shadow-lg"
				>
					<a
						href={resolve('/[artist]/[album]', {
							artist: album.artistSlug,
							album: album.slug
						})}
						class="relative aspect-square w-full overflow-hidden rounded-xl"
					>
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
						{#if album.artistLogo}
							<img
								src={album.artistLogo}
								alt="{album.artist} logo badge"
								class="absolute top-2 right-2 h-6 w-6 rounded-full border border-slate-700/80 bg-slate-950/80 object-cover shadow-md backdrop-blur-sm"
								title={album.artist}
							/>
						{/if}
					</a>

					<div class="mt-3 flex flex-1 flex-col justify-between">
						<div>
							<h3 class="truncate text-sm font-bold text-white" title={album.title}>
								<a
									href={resolve('/[artist]/[album]', {
										artist: album.artistSlug,
										album: album.slug
									})}
									class="hover:text-blue-400"
								>
									{album.title}
								</a>
							</h3>
							<div class="mt-0.5 flex items-center gap-1.5 truncate">
								{#if album.artistLogo}
									<img
										src={album.artistLogo}
										alt="{album.artist} logo"
										class="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-700/80 bg-slate-950 object-cover"
									/>
								{/if}
								<a
									href={resolve('/[artist]', { artist: album.artistSlug })}
									class="truncate text-xs font-medium text-blue-400 hover:underline"
								>
									{album.artist}
								</a>
							</div>
						</div>

						<div
							class="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5"
						>
							<span class="font-mono text-[11px] text-slate-500">
								{album.playableTrackCount} Playable
							</span>
							{#if album.status !== 'coming-soon'}
								<button
									type="button"
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

	<!-- 4. ARTIST ROSTER SHELF (Direct SEO Links to /[artist]) -->
	<section>
		<div class="mb-4">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				Bands of Engine Room Records
			</h2>
			<p class="text-xs text-slate-400 sm:text-sm">
				Select any band to visit their dedicated profile (<code class="font-mono text-slate-300"
					>/$artist-slug</code
				>) with full biography, discography, and shareable links.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each allArtists as artist (artist.slug)}
				<a
					href={resolve('/[artist]', { artist: artist.slug })}
					class="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-all hover:border-blue-600/60 hover:bg-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					<div class="flex items-center gap-3">
						{#if artist.logo}
							<img
								src={artist.logo}
								alt="{artist.name} Logo"
								class="h-11 w-11 shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-0.5 object-contain shadow-md"
							/>
						{:else}
							<div
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-700 font-bold text-white shadow-md"
							>
								{artist.name.charAt(0)}
							</div>
						{/if}
						<div>
							<h3 class="text-sm font-bold text-white group-hover:text-blue-400">
								{artist.name}
							</h3>
							<p class="text-xs text-slate-400">
								{artist.albumCount}
								{artist.albumCount === 1 ? 'Release' : 'Releases'} &bull; {artist.trackCount} Songs
							</p>
						</div>
					</div>
					<svg
						class="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400"
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
			{/each}
		</div>
	</section>

	<!-- 
		5. IN-UNIVERSE LORE BRIEF & CLOSED-SYSTEM DISCLAIMER
		========================================================================
		ARCHITECTURAL OVERVIEW:
		This section anchors Engine Room Records within the broader RaggieSoft Media
		universe, communicating its narrative origins and four-decade storytelling scope.
		
		CLOSED-SYSTEM POLICY & PERIMETER SECURITY:
		Engine Room Records is an artistic closed system and does NOT sign external artists;
		every act on the roster is an AI Persona. Real-world unsolicited submissions are
		automatically dropped and permanently deleted without review at the Microsoft
		Exchange Transport Rule level.
		========================================================================
	-->
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
			<h3 class="text-xl font-bold text-white sm:text-2xl">Music &amp; Narrative Intertwined</h3>
			<p class="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
				Engine Room Records represents the musical heartbeat of the RaggieSoft universe. Founded by
				Michael Ragsdale as an independent label within RaggieSoft Media, the platform provides
				sanctuary for independent artists reclaiming their masters, creating concept rock operas,
				and preserving memories across four decades of storytelling.
			</p>

			<!-- Closed-System Policy & Exchange Transport Notice -->
			<div
				class="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200 sm:text-sm"
				role="note"
				aria-label="Closed System and Submission Policy"
			>
				<div class="flex items-start gap-3">
					<svg
						class="mt-0.5 h-5 w-5 shrink-0 text-rose-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					<div>
						<div class="mb-0.5 font-bold text-rose-300">
							Closed System &bull; No Submissions Accepted
						</div>
						<p class="leading-relaxed">
							Engine Room Records does not sign outside artists—every artist on this label is an AI
							Persona. Any attempts to submit material or demos are automatically intercepted and
							permanently deleted unread at the Microsoft Exchange Transport Rule level.
						</p>
					</div>
				</div>
			</div>

			<div class="mt-5 flex flex-wrap items-center gap-4">
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

	<!-- 6. BOOK-READER STYLE SHARE SECTION -->
	<ShareSection
		title="Engine Room Records"
		subtitle="Official Music & Discography Platform"
		description="Stream complete albums, concept rock operas, synchronized lyrics, and four decades of in-universe lore across the Engine Room Records roster."
		url="https://music.raggiesoft.com/"
		socialPreview="https://music.raggiesoft.com/og-image.jpg"
	/>
</div>

<!-- Collapsible Search & Filter Modal -->
<SearchFilterModal
	isOpen={showSearchModal}
	onClose={() => (showSearchModal = false)}
	isStandaloneGlobal={true}
/>

<!-- Book-Reader-Style Share Modal -->
<ShareModal
	isOpen={!!shareModalData}
	onClose={() => (shareModalData = null)}
	title={shareModalData?.title || ''}
	subtitle={shareModalData?.subtitle || ''}
	description={shareModalData?.description || ''}
	url={shareModalData?.url || ''}
	socialPreview={shareModalData?.socialPreview || ''}
/>
