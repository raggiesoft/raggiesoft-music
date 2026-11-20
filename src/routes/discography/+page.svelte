<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * FILE: src/routes/discography/+page.svelte
	 * URL SERVED: https://music.raggiesoft.com/discography
	 * ============================================================================
	 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
	 * Paired with `src/routes/discography/+page.js`, this component renders the
	 * Complete Discography & Archive page at `/discography`.
	 *
	 * HOW LIVE FILTERING & TWO-WAY BINDING WORK IN SVELTE 5:
	 * 1. Four `$state(...)` variables hold the user's active filter choices:
	 *    `searchQuery`, `activeFilter` (band or `'rock-opera'`), `activeTypeFilter`
	 *    (`'studio' | 'live' | 'compilation' | 'soundtrack'`), and `activeStatusFilter`.
	 * 2. When the user types in `<input bind:value={searchQuery} />` or selects a
	 *    filter inside `<SearchFilterModal bind:searchQuery ... />`, Svelte's `bind:`
	 *    directive updates those `$state` variables automatically in both directions!
	 * 3. Every `$derived(...)` value (`pageHeading`, `activeFilterCount`,
	 *    `filteredAlbums`, and `groupedAlbumSections`) instantly recalculates and
	 *    updates the album grid with zero page reloads!
	 *
	 * Architectural Principles:
	 * 1. Clean Top Heading: Dynamically updates the `<h1>` heading to reflect the
	 *    selected filter (e.g., "Complete Discography", "Rock Operas & Concept Albums",
	 *    or an Artist's name), paired with a compact search input and Filter Menu button.
	 * 2. URL Query Parameter Synchronization: Reads optional `?q=`, `?filter=`,
	 *    `?type=`, and `?status=` query parameters on mount so filtered views can
	 *    be linked directly.
	 * 3. Direct SEO Navigation: Artist badges and album titles link directly to
	 *    `/[artist]` and `/[artist]/[album]`, and expandable track drawers link
	 *    each song to `/[artist]/[album]/[track]`.
	 * ============================================================================
	 */
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import {
		allAlbums,
		allArtists,
		albumTypeDefinitions,
		catalogStats,
		formatAlbumQueue,
		formatReleaseDate,
		hasAnyDsp,
		hasFourthwallStore
	} from '#lib/data/musicData.js';
	import { buildBreadcrumbJsonLdScript, ensureRealWorldDate } from '#lib/seo.js';
	import StoreButton from '#lib/components/StoreButton.svelte';
	import SearchFilterModal from '#lib/components/SearchFilterModal.svelte';
	import ShareModal from '#lib/components/ShareModal.svelte';
	import ShareSection from '#lib/components/ShareSection.svelte';

	// Reactive `$state` variables driving the discography search, filters,
	// expanded tracklist accordion (`expandedAlbumId`), and modals.
	let currentCatalog = $state(allAlbums);
	let searchQuery = $state('');
	let activeFilter = $state('all');
	let activeTypeFilter = $state('all');
	let activeStatusFilter = $state('all');
	let expandedAlbumId = $state(/** @type {string | null} */ (null));
	let showFilterMenu = $state(false);
	let shareModalData = $state(/** @type {any} */ (null));

	// Read optional URL query params (`?q=...&filter=...&type=...&status=...`) once
	// when the page mounts in the browser using the Web `URLSearchParams` API.
	onMount(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const q = params.get('q');
			const filter = params.get('filter');
			const type = params.get('type');
			const status = params.get('status');

			if (q) searchQuery = q;
			if (filter) activeFilter = filter;
			if (type) activeTypeFilter = type;
			if (status) activeStatusFilter = status;
		}
	});

	// Dynamic top `<h1>` heading computed from whichever filter is currently active.
	let pageHeading = $derived.by(() => {
		if (activeFilter === 'rock-opera') return 'Rock Operas & Concept Albums';
		if (activeFilter !== 'all') {
			const art = allArtists.find((a) => a.slug === activeFilter);
			if (art) return `${art.name} — Discography`;
		}
		if (activeTypeFilter === 'studio') return 'Studio Albums';
		if (activeTypeFilter === 'live') return 'Live Concert Recordings';
		if (activeTypeFilter === 'compilation') return 'Compilations & Anthologies';
		if (activeTypeFilter === 'soundtrack') return 'Soundtracks & Cinematic Scores';
		return 'Complete Discography';
	});

	// Count how many filters are non-default (`0` to `4`) to display on the badge pill.
	let activeFilterCount = $derived(
		(searchQuery.trim() ? 1 : 0) +
			(activeFilter !== 'all' ? 1 : 0) +
			(activeTypeFilter !== 'all' ? 1 : 0) +
			(activeStatusFilter !== 'all' ? 1 : 0)
	);

	// Reactive multi-stage `.filter()` pipeline: an album must pass EVERY active
	// criterion (status, type, artist/rock-opera, and case-insensitive text search
	// across album fields + track titles/lore/lyrics/ISRCs via `.some()`).
	let filteredAlbums = $derived(
		currentCatalog.filter((album) => {
			if (activeStatusFilter !== 'all' && album.status !== activeStatusFilter) return false;
			if (activeTypeFilter !== 'all' && (album.albumType || 'studio') !== activeTypeFilter)
				return false;
			if (activeFilter !== 'all') {
				if (activeFilter === 'rock-opera') {
					if (!album.isRockOpera) return false;
				} else if (album.artistSlug !== activeFilter) {
					return false;
				}
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchAlbum =
					album.title.toLowerCase().includes(q) ||
					album.artist.toLowerCase().includes(q) ||
					album.genre.toLowerCase().includes(q) ||
					album.year.includes(q) ||
					(album.temporalCoverage && album.temporalCoverage.includes(q));
				// `.some(...)` returns `true` as soon as AT LEAST ONE track on the album matches `q`.
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

	// Bucket `filteredAlbums` into production categories (Studio Albums, Live Albums,
	// Compilations, Soundtracks) and drop any empty category sections.
	let groupedAlbumSections = $derived.by(() => {
		return albumTypeDefinitions
			.map((def) => ({
				...def,
				albums: filteredAlbums.filter((a) => (a.albumType || 'studio') === def.id)
			}))
			.filter((sec) => sec.albums.length > 0);
	});

	/**
	 * Plays an album sequentially in the persistent global audio player.
	 * Smart ISRC resume: if the listener is ALREADY playing a track whose ISRC
	 * appears on this album, start at that track's index instead of restarting at Track 1.
	 *
	 * @param {import('#lib/data/musicData.js').Album} album
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
				if (matchingIndex !== -1) targetIndex = matchingIndex;
			}
			player.loadQueue(queue, targetIndex, true);
		}
	}

	/**
	 * Loads an album's playable queue and starts playback at the clicked `track`.
	 * @param {import('#lib/data/musicData.js').Album} album
	 * @param {import('#lib/data/musicData.js').Track} track
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
	 * Populates `shareModalData` to open `<ShareModal />` for a specific album card.
	 * @param {import('#lib/data/musicData.js').Album} album
	 */
	function openAlbumShareModal(album) {
		shareModalData = {
			title: album.title,
			subtitle: album.artist,
			description: album.description,
			url: `https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`,
			socialPreview: album.socialPreview
		};
	}

	const discographyDescription = `Browse all ${catalogStats.albumCount} albums and ${catalogStats.trackCount} songs across ${catalogStats.artistCount} Engine Room Records bands with full lyrics, lore, and free previews.`;

	const discographyBreadcrumbJsonLd = buildBreadcrumbJsonLdScript([
		{ name: 'Home', url: 'https://music.raggiesoft.com/' },
		{ name: 'Complete Discography', url: 'https://music.raggiesoft.com/discography' }
	]);
</script>

<!--
	SEO & Social `<head>` metadata:
	Notice `{#if activeFilterCount > 0}` adds `noindex,follow` dynamically if a
	crawler lands on a query-filtered state, keeping canonical indexing focused
	on the unfiltered `/discography` archive!
-->
<svelte:head>
	<title>{pageHeading} | The Listening Room (Engine Room Records)</title>
	<meta name="description" content={discographyDescription} />
	{#if activeFilterCount > 0}
		<meta name="robots" content="noindex,follow" />
	{/if}
	<link rel="canonical" href="https://music.raggiesoft.com/discography" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:url" content="https://music.raggiesoft.com/discography" />
	<meta property="og:title" content="{pageHeading} | The Listening Room" />
	<meta property="og:description" content={discographyDescription} />
	<meta property="og:image" content="https://music.raggiesoft.com/og-image.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{pageHeading} | The Listening Room" />
	<meta name="twitter:description" content={discographyDescription} />
	<meta name="twitter:image" content="https://music.raggiesoft.com/og-image.jpg" />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html discographyBreadcrumbJsonLd}
</svelte:head>

<div class="space-y-8">
	<!-- =================================================================== -->
	<!-- TOP HEADER & COLLAPSIBLE SEARCH / FILTER TOOLBAR                    -->
	<!-- =================================================================== -->
	<section
		class="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-end"
	>
		<div>
			<div
				class="flex items-center gap-2 text-xs font-bold tracking-widest text-blue-400 uppercase"
			>
				<span>The Listening Room Archive</span>
				<span>&bull;</span>
				<span>{filteredAlbums.length} of {currentCatalog.length} Releases</span>
			</div>
			<h1 class="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
				{pageHeading}
			</h1>
			<p class="mt-1 text-xs text-slate-400 sm:text-sm">
				Sequenced by in-universe story timeline. Stream in Lossless/High-Res on your favorite app to
				support <strong class="text-slate-200">Michael Ragsdale</strong> &amp;
				<strong class="text-slate-200">Engine Room Records</strong>, or enjoy free 128kbps previews
				right here.
			</p>
		</div>

		<!-- Compact Search Input + Collapsible Filter Menu Button -->
		<div class="flex flex-wrap items-center gap-2.5">
			<div class="relative min-w-[220px] flex-1 sm:w-64">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Quick search songs or lore..."
					aria-label="Quick search discography"
					class="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-2.5 pr-8 pl-3.5 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={() => (searchQuery = '')}
						class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-white"
						aria-label="Clear search"
					>
						&times;
					</button>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => (showFilterMenu = true)}
				class="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-sm"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
					/>
				</svg>
				<span>Filter &amp; Sort Menu</span>
				{#if activeFilterCount > 0}
					<span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-blue-700">
						{activeFilterCount}
					</span>
				{/if}
			</button>
		</div>
	</section>

	<!-- Quick Artist Direct Links Bar (Navigates to /[artist]) -->
	<section
		class="flex scrollbar-thin items-center gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3"
		aria-label="Artist Directory Links"
	>
		<span class="shrink-0 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
			Artist Pages:
		</span>
		{#each allArtists as artist (artist.slug)}
			<a
				href={resolve('/[artist]', { artist: artist.slug })}
				class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white"
			>
				{#if artist.logo}
					<img
						src={artist.logo}
						alt=""
						aria-hidden="true"
						width="16"
						height="16"
						loading="lazy"
						decoding="async"
						class="h-4 w-4 rounded-full object-cover"
					/>
				{/if}
				<span>{artist.name}</span>
				<span class="font-mono text-[10px] text-slate-400">({artist.albumCount})</span>
			</a>
		{/each}
	</section>

	<!-- Active Filter Chips (only visible when filters are active) -->
	{#if activeFilterCount > 0}
		<div
			class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
		>
			<span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Filters:</span>
			{#if searchQuery.trim()}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-300"
				>
					Query: "{searchQuery}"
					<button type="button" onclick={() => (searchQuery = '')} class="hover:text-white"
						>&times;</button
					>
				</span>
			{/if}
			{#if activeFilter !== 'all'}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-300 uppercase"
				>
					Category: {activeFilter}
					<button type="button" onclick={() => (activeFilter = 'all')} class="hover:text-white"
						>&times;</button
					>
				</span>
			{/if}
			{#if activeTypeFilter !== 'all'}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-2.5 py-1 text-xs font-semibold text-indigo-300 uppercase"
				>
					Format: {activeTypeFilter}
					<button type="button" onclick={() => (activeTypeFilter = 'all')} class="hover:text-white"
						>&times;</button
					>
				</span>
			{/if}
			{#if activeStatusFilter !== 'all'}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 uppercase"
				>
					Status: {activeStatusFilter}
					<button
						type="button"
						onclick={() => (activeStatusFilter = 'all')}
						class="hover:text-white">&times;</button
					>
				</span>
			{/if}
			<button
				type="button"
				onclick={() => {
					searchQuery = '';
					activeFilter = 'all';
					activeTypeFilter = 'all';
					activeStatusFilter = 'all';
				}}
				class="ml-auto text-xs font-semibold text-slate-400 underline hover:text-white"
			>
				Reset All
			</button>
		</div>
	{/if}

	<!-- =================================================================== -->
	<!-- ALBUM SECTIONS GROUPED BY PRODUCTION CATEGORY                       -->
	<!-- =================================================================== -->
	{#if filteredAlbums.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
			<p class="text-base text-slate-400">No releases found matching your filter or search.</p>
			<button
				type="button"
				onclick={() => {
					searchQuery = '';
					activeFilter = 'all';
					activeStatusFilter = 'all';
					activeTypeFilter = 'all';
				}}
				class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
			>
				Reset Search &amp; Filters
			</button>
		</div>
	{:else}
		<div class="space-y-12">
			{#each groupedAlbumSections as section (section.id)}
				<section class="space-y-5">
					<div
						class="flex flex-col gap-1 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-end sm:justify-between"
					>
						<div>
							<div class="flex items-center gap-2">
								<span class="text-xl">{section.icon}</span>
								<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
									{section.title}
								</h2>
								<span
									class="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-300"
								>
									{section.albums.length}
									{section.albums.length === 1 ? 'Release' : 'Releases'}
								</span>
							</div>
							<p class="mt-1 text-xs text-slate-400 sm:text-sm">
								{section.description}
							</p>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{#each section.albums as album (album.id)}
							{@const albumHasDspOrStore = hasAnyDsp(album) || hasFourthwallStore(album)}
							<div
								id={album.id}
								class="relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl transition-all focus-within:z-30 hover:z-20 hover:border-slate-700"
							>
								<div class="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
									<!-- Cover Art (Links to /[artist]/[album]) -->
									<div
										class="group relative h-40 w-40 shrink-0 self-center overflow-hidden rounded-xl border border-slate-800 shadow-lg sm:h-44 sm:w-44 sm:self-start"
									>
										<a
											href={resolve('/[artist]/[album]', {
												artist: album.artistSlug,
												album: album.slug
											})}
											class="block h-full w-full"
										>
											<img
												src={album.artwork}
												alt="Cover artwork for {album.title}"
												width="176"
												height="176"
												loading="lazy"
												decoding="async"
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										</a>
										{#if album.status !== 'coming-soon'}
											<button
												type="button"
												onclick={() => playAlbum(album)}
												class="absolute right-2.5 bottom-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
												aria-label="Preview {album.title} (128kbps stream)"
											>
												<svg class="h-5 w-5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</button>
										{/if}
									</div>

									<!-- Album Info -->
									<div class="flex min-w-0 flex-1 flex-col justify-between text-left">
										<div>
											<div class="mb-2 flex flex-wrap items-center gap-2">
												{#if album.isRockOpera}
													<span
														class="rounded border border-indigo-700/50 bg-indigo-900/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-indigo-300 uppercase"
													>
														Rock Opera
													</span>
												{/if}
												{#if album.dspExempt}
													<span
														class="rounded border border-amber-600/50 bg-amber-950/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase"
													>
														Vault Exclusive
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
													Story Year: {formatReleaseDate(album.temporalCoverage, album.year)} &bull; Released:
													{ensureRealWorldDate(album.datePublished)} &bull; {album.genre}
												</span>
											</div>

											<h3
												class="text-xl leading-snug font-bold tracking-tight text-white sm:text-2xl"
											>
												<a
													href={resolve('/[artist]/[album]', {
														artist: album.artistSlug,
														album: album.slug
													})}
													class="transition-colors hover:text-blue-400"
												>
													{album.title}
												</a>
											</h3>

											<div class="mt-1 flex items-center gap-2 truncate">
												{#if album.artistLogo}
													<img
														src={album.artistLogo}
														alt="{album.artist} logo badge"
														width="16"
														height="16"
														loading="lazy"
														decoding="async"
														class="h-4 w-4 shrink-0 rounded-full border border-slate-700/80 bg-slate-950 object-cover"
													/>
												{/if}
												<a
													href={resolve('/[artist]', { artist: album.artistSlug })}
													class="truncate text-sm font-semibold text-blue-400 hover:underline"
												>
													{album.artist}
												</a>
											</div>

											<p
												class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm"
											>
												{album.description}
											</p>
										</div>

										<!-- Card Action Bar (DSP / Fourthwall + 128kbps Preview) -->
										<div
											class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3.5"
										>
											<StoreButton
												type="album"
												size="small"
												spotifyId={album.spotifyId}
												appleId={album.appleId}
												amazonId={album.amazonId}
												youtubeId={album.youtubeId}
												dspExempt={album.dspExempt}
												storeStandardUrl={album.storeStandardUrl}
												storeAudiophileUrl={album.storeAudiophileUrl}
											/>

											{#if album.status !== 'coming-soon'}
												<button
													type="button"
													onclick={() => playAlbum(album)}
													class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors {albumHasDspOrStore
														? 'border border-blue-500/40 bg-slate-800/90 text-blue-200 hover:border-blue-400 hover:bg-slate-800 hover:text-white'
														: 'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-500'}"
												>
													<svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
														<path d="M8 5v14l11-7z" />
													</svg>
													<span>
														{album.status === 'in-progress'
															? `Preview (${album.playableTrackCount})`
															: 'Preview (128k)'}
													</span>
												</button>
											{/if}

											<button
												type="button"
												onclick={() =>
													(expandedAlbumId = expandedAlbumId === album.id ? null : album.id)}
												class="rounded-lg border border-slate-700/80 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
											>
												{expandedAlbumId === album.id
													? 'Hide Tracks'
													: `Tracks (${album.tracks.length})`}
											</button>

											<button
												type="button"
												onclick={() => openAlbumShareModal(album)}
												class="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
											>
												<svg
													class="h-3.5 w-3.5"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
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
												href={resolve('/[artist]/[album]', {
													artist: album.artistSlug,
													album: album.slug
												})}
												class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
											>
												<span>Lyrics &amp; Lore</span>
												<span>&rarr;</span>
											</a>

											{#if album.loreUrl}
												<a
													href={album.loreUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-950/50 px-2.5 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white"
													title="Read the official in-universe album lore archive on RaggieSoft.com"
												>
													<span>Lore Archive</span>
													<span>&nearr;</span>
												</a>
											{/if}
										</div>
									</div>
								</div>

								<!-- Collapsible Track List -->
								{#if expandedAlbumId === album.id}
									<div class="rounded-b-2xl border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6">
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
																type="button"
																onclick={() => playTrack(album, track)}
																class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white"
																aria-label="Preview {track.title}"
															>
																<svg
																	class="h-3.5 w-3.5 translate-x-0.5 fill-current"
																	viewBox="0 0 24 24"
																>
																	<path d="M8 5v14l11-7z" />
																</svg>
															</button>
														{:else}
															<span
																class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 font-mono text-xs text-slate-500"
															>
																{track.track}
															</span>
														{/if}
														<a
															href={resolve('/[artist]/[album]/[track]', {
																artist: album.artistSlug,
																album: album.slug,
																track: track.slug
															})}
															class="truncate text-sm font-medium transition-colors hover:text-blue-400 hover:underline"
														>
															{track.track}. {track.title}
														</a>
													</div>
													<span class="ml-4 font-mono text-xs text-slate-500">{track.duration}</span
													>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}

	<!-- Bottom Share Section -->
	<div class="pt-4">
		<ShareSection
			title={pageHeading}
			subtitle="The Listening Room — Engine Room Records"
			description="Explore the complete narrative discography, lyrics, and lore of Engine Room Records across all {catalogStats.artistCount} bands."
			url="https://music.raggiesoft.com/discography"
			socialPreview="https://music.raggiesoft.com/og-image.jpg"
		/>
	</div>
</div>

<!--
	TWO-WAY COMPONENT PROP BINDING (`bind:searchQuery`, etc.):
	Passing `bind:searchQuery` connects our parent `$state` variables directly to
	the bindable `$props()` inside `<SearchFilterModal />`, so changing a filter
	inside the modal updates `/discography` in real time!
-->
<!-- Collapsible Search & Filter Menu -->
<SearchFilterModal
	isOpen={showFilterMenu}
	onClose={() => (showFilterMenu = false)}
	bind:searchQuery
	bind:activeTypeFilter
	bind:activeStatusFilter
	bind:activeFilter
/>

<!--
	`!!shareModalData` converts an object or `null` into a strict boolean (`true` / `false`).
	When the user closes the modal, `onClose` resets `shareModalData = null`.
-->
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
