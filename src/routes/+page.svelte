<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte
	 * ============================================================================
	 * Discovery & Discography Portal for Engine Room Records (music.raggiesoft.com).
	 *
	 * Architecture & Design Decisions:
	 * 1. Dynamic Catalog Ingestion: Automatically renders all artists, albums, and
	 *    tracks discovered from `https://assets.raggiesoft.com/` / `musicCatalog.json`.
	 * 2. Instant Offline PWA + SWR Sync: Uses pre-compiled catalog for zero-latency
	 *    cold starts, and quietly fetches remote `catalog.json` to ingest live updates.
	 * 3. Unified Real-Time Search: Fast sub-millisecond filtering across album titles,
	 *    track names, artist names, musical genres, and canonical lore notes.
	 * 4. Responsive Player Orchestration: Single-track playback or full-album queue
	 *    loading with seamless gapless transitions across multi-movement rock operas.
	 * ============================================================================
	 */
	import { onMount } from 'svelte';
	import { player } from '#lib/player.svelte.js';
	import { allAlbums, catalogStats, formatAlbumQueue } from '#lib/data/musicData.js';

	// Live reactive catalog state (seeded with pre-compiled catalog, refreshed from CDN)
	let currentCatalog = $state(allAlbums);
	let activeFilter = $state('all');
	let searchQuery = $state('');
	let expandedAlbumId = $state(
		/** @type {string | null} */ ('fractured-prisms-1983-carnaby-street')
	);

	// Background Stale-While-Revalidate (SWR) remote sync from CDN
	onMount(() => {
		fetch('https://assets.raggiesoft.com/engine-room-records/catalog.json')
			.then((res) => (res.ok ? res.json() : null))
			.then((remoteData) => {
				if (Array.isArray(remoteData) && remoteData.length > 0) {
					currentCatalog = remoteData;
				}
			})
			.catch(() => {
				// Silently fallback to bundled static catalog if offline or network restricted
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

	// Derived filtered album collection based on category filter and search term
	let filteredAlbums = $derived(
		currentCatalog.filter((album) => {
			// 1. Primary Category Filter
			if (activeFilter !== 'all') {
				if (activeFilter === 'rock-opera') {
					if (!album.isRockOpera) return false;
				} else if (album.artistSlug !== activeFilter) {
					return false;
				}
			}

			// 2. Live Search Filter
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchAlbum =
					album.title.toLowerCase().includes(q) ||
					album.artist.toLowerCase().includes(q) ||
					album.genre.toLowerCase().includes(q) ||
					album.year.includes(q);

				const matchTrack = album.tracks.some(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						(t.loreNote && t.loreNote.toLowerCase().includes(q)) ||
						(t.isrc && t.isrc.toLowerCase().includes(q))
				);

				return matchAlbum || matchTrack;
			}

			return true;
		})
	);

	/**
	 * Plays an entire album sequentially from track 1.
	 * Enables continuous, gapless-style playback across rock operas.
	 * Only enqueues tracks that have active audio streams.
	 * @param {typeof currentCatalog[0]} album
	 */
	function playAlbum(album) {
		const queue = formatAlbumQueue(album);
		if (queue.length > 0) {
			player.loadQueue(queue, 0, true);
		}
	}

	/**
	 * Plays a specific track from an album and queues the rest of the playable album following it.
	 * @param {typeof currentCatalog[0]} album
	 * @param {typeof currentCatalog[0]['tracks'][0]} track
	 */
	function playTrack(album, track) {
		if (!track.isPlayable || !track.audioUrl) return;
		const queue = formatAlbumQueue(album);
		const qIdx = queue.findIndex((item) => item.id === track.id);
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
</script>

<svelte:head>
	<title>Engine Room Records | Official Music Platform</title>
	<meta
		name="description"
		content="A modern, persistent audio platform for the RaggieSoft universe, reading directly from assets.raggiesoft.com with gapless continuous playback."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="mx-auto mb-8 max-w-3xl text-center">
	<div
		class="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/40 px-3 py-1 text-xs font-semibold tracking-wider text-blue-300 uppercase"
	>
		<span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
		Continuous Rock Opera Playback Enabled
	</div>

	<h1 class="text-4xl leading-tight font-black tracking-tight text-white sm:text-5xl">
		Sounds From the Engine Room
	</h1>
	<p class="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
		Directly connected to the <span class="font-mono text-slate-300">assets.raggiesoft.com</span>
		catalog. Featuring persistent audio streaming, canonical lore notes, and synchronized lyrics spanning
		all artists.
	</p>

	<!-- Live Dynamic Catalog Badges -->
	<div
		class="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-400"
	>
		<span
			class="rounded-md border border-blue-800/80 bg-blue-950/60 px-2.5 py-1 font-semibold text-blue-300 shadow-sm"
		>
			{dynamicArtists.length} Artists
		</span>
		<span
			class="rounded-md border border-blue-800/80 bg-blue-950/60 px-2.5 py-1 font-semibold text-blue-300 shadow-sm"
		>
			{currentCatalog.length} Releases
		</span>
		<span
			class="rounded-md border border-blue-800/80 bg-blue-950/60 px-2.5 py-1 font-semibold text-blue-300 shadow-sm"
		>
			{catalogStats.playableTracks} Playable Songs
		</span>
		{#if catalogStats.totalTracks - catalogStats.playableTracks > 0}
			<span
				class="rounded-md border border-amber-800/80 bg-amber-950/60 px-2.5 py-1 font-semibold text-amber-300 shadow-sm"
			>
				{catalogStats.totalTracks - catalogStats.playableTracks} In Studio
			</span>
		{/if}
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1">Live CDN Audio</span>
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1"
			>WCAG 2.1 AA Compliant</span
		>
	</div>
</section>

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

<!-- Dynamic Filter Navigation Pills -->
<div class="mb-8 flex flex-wrap items-center justify-center gap-2">
	<button
		onclick={() => (activeFilter = 'all')}
		class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
		'all'
			? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
			: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
	>
		All Releases ({currentCatalog.length})
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
		<div class="col-span-full rounded-2xl border border-dashed border-slate-800 p-12 text-center">
			<p class="text-base text-slate-400">No releases found matching your filter or search.</p>
			<button
				onclick={() => {
					searchQuery = '';
					activeFilter = 'all';
				}}
				class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
			>
				Reset Search & Filters
			</button>
		</div>
	{/if}

	{#each filteredAlbums as album (album.id)}
		<div
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
								<svg class="h-7 w-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
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
								class="flex items-center gap-2 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300 select-none cursor-not-allowed sm:text-sm"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Coming Soon
							</span>
						{:else if album.status === 'in-progress'}
							<button
								onclick={() => playAlbum(album)}
								class="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:text-sm"
							>
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								Play Preview ({album.playableTrackCount})
							</button>
						{:else}
							<button
								onclick={() => playAlbum(album)}
								class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
							>
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
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
													class="h-3.5 w-3.5 text-blue-400 group-hover:text-white"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
												</svg>
											{:else}
												<svg
													class="h-3.5 w-3.5 translate-x-0.5"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M8 5v14l11-7z" />
												</svg>
											{/if}
										</button>
									{:else}
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed"
											title="Audio in studio production"
										>
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</span>
									{/if}

									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="truncate text-sm font-medium {track.isPlayable ? '' : 'text-slate-400'}">
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
												"{track.loreNote}"
											</span>
										{/if}
									</div>
								</div>

								<div class="ml-4 flex shrink-0 items-center gap-3 font-mono text-xs text-slate-500">
									{#if track.isrc}
										<span class="hidden text-slate-600 sm:inline">{track.isrc}</span>
									{/if}
									<span>{track.duration}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
