<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Artist Dedicated Route: /[artist])
	 * ============================================================================
	 * Dedicated, SEO-friendly artist profile and discography showcase for
	 * Engine Room Records (`music.raggiesoft.com/$artist-slug`).
	 *
	 * Architectural Principles:
	 * 1. Artist-First Heading Hierarchy: The Artist Name is the primary `<h1>`
	 *    heading at the top of the page, never subordinated to "Engine Room Records"
	 *    or buried beneath a massive filter bar.
	 * 2. Hierarchical URLs: Every album on this page links directly to
	 *    `/[artist]/[album]` (`music.raggiesoft.com/$artist-slug/$album-slug`).
	 * 3. Collapsible Search & Filter Menu: Provides a clean toolbar button to open
	 *    `SearchFilterModal` on demand, plus quick in-page search/type filtering.
	 * 4. Book-Reader-Style Social Sharing: Includes both a Share Modal for
	 *    individual albums and an inline `<ShareSection />` at the bottom of the
	 *    artist page with OpenGraph preview card, Facebook, Bluesky, and Copy Link.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { albumTypeDefinitions, formatAlbumQueue } from '#lib/data/musicData.js';
	import ShareSection from '#lib/components/ShareSection.svelte';
	import ShareModal from '#lib/components/ShareModal.svelte';
	import SearchFilterModal from '#lib/components/SearchFilterModal.svelte';

	let { data } = $props();

	let artist = $derived(data.artist);
	let artistAlbums = $derived(data.artistAlbums);

	// Optional local filter within this artist's catalog (populated via collapsible menu)
	let searchQuery = $state('');
	let activeTypeFilter = $state('all');
	let activeStatusFilter = $state('all');
	let expandedAlbumId = $state(/** @type {string | null} */ (null));
	let showFilterMenu = $state(false);

	// Share Modal state for individual album cards
	let shareModalData = $state(/** @type {any} */ (null));

	// Filter this artist's albums based on any active search or type filter
	let filteredArtistAlbums = $derived(
		artistAlbums.filter((album) => {
			if (activeStatusFilter !== 'all' && album.status !== activeStatusFilter) return false;
			if (activeTypeFilter !== 'all' && (album.albumType || 'studio') !== activeTypeFilter)
				return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchAlbum =
					album.title.toLowerCase().includes(q) ||
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

	// Group filtered albums by production category (Studio, Live, Compilation, Soundtrack)
	let groupedSections = $derived.by(() => {
		return albumTypeDefinitions
			.map((def) => ({
				...def,
				albums: filteredArtistAlbums.filter((a) => (a.albumType || 'studio') === def.id)
			}))
			.filter((sec) => sec.albums.length > 0);
	});

	// Count of active local filters
	let activeFilterCount = $derived(
		(searchQuery.trim() ? 1 : 0) +
			(activeTypeFilter !== 'all' ? 1 : 0) +
			(activeStatusFilter !== 'all' ? 1 : 0)
	);

	// Canonical Schema.org MusicGroup JSON-LD
	let jsonLdScript = $derived(
		`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'MusicGroup',
			name: artist.name,
			description: artist.description,
			genre: artist.genres,
			image: artist.logo || artist.socialPreview,
			url: `https://music.raggiesoft.com/${artist.slug}`,
			album: artistAlbums.map((a) => ({
				'@type': 'MusicAlbum',
				name: a.title,
				datePublished: a.datePublished || a.temporalCoverage || a.year,
				url: `https://music.raggiesoft.com/${a.artistSlug}/${a.slug}`
			}))
		})}` +
			'</' +
			'script>'
	);

	/**
	 * Plays all playable tracks across the artist's entire discography in chronological order.
	 */
	function playArtistCatalog() {
		const combinedQueue = artistAlbums.flatMap((alb) => formatAlbumQueue(alb));
		if (combinedQueue.length > 0) {
			player.loadQueue(combinedQueue, 0, true);
		}
	}

	/**
	 * Plays a specific album from this artist.
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
	 * Plays a specific track from an album.
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
	 * Opens the book-reader-style Share Modal for a specific album.
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
</script>

<svelte:head>
	<title>{artist.name} | Discography &amp; Lore | Engine Room Records</title>
	<meta name="title" content="{artist.name} | Discography & Lore | Engine Room Records" />
	<meta name="description" content={artist.description} />
	<link rel="canonical" href="https://music.raggiesoft.com/{artist.slug}" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="Engine Room Records" />
	<meta property="og:url" content="https://music.raggiesoft.com/{artist.slug}" />
	<meta property="og:title" content="{artist.name} — Official Discography | Engine Room Records" />
	<meta property="og:description" content={artist.description} />
	<meta property="og:image" content={artist.socialPreview} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{artist.name} - Engine Room Records" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://music.raggiesoft.com/{artist.slug}" />
	<meta name="twitter:title" content="{artist.name} — Official Discography | Engine Room Records" />
	<meta name="twitter:description" content={artist.description} />
	<meta name="twitter:image" content={artist.socialPreview} />

	<!-- Structured Data (JSON-LD) -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<div class="space-y-10">
	<!-- Breadcrumb & Search Menu Trigger Bar -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<nav
			class="flex items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm"
			aria-label="Breadcrumb"
		>
			<a
				href={resolve('/')}
				class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				Home
			</a>
			<span class="text-slate-600">/</span>
			<a
				href={resolve('/discography')}
				class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				Discography
			</a>
			<span class="text-slate-600">/</span>
			<span class="font-semibold text-slate-200">{artist.name}</span>
		</nav>

		<button
			type="button"
			onclick={() => (showFilterMenu = true)}
			class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
		>
			<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
				/>
			</svg>
			<span>Search &amp; Filter Catalog</span>
			{#if activeFilterCount > 0}
				<span class="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
					{activeFilterCount}
				</span>
			{/if}
		</button>
	</div>

	<!-- =================================================================== -->
	<!-- ARTIST HERO HEADER (Artist Name is the top <h1> heading)            -->
	<!-- =================================================================== -->
	<section
		class="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
	>
		<div class="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:gap-10 md:text-left">
			<!-- Artist Crest / Emblem -->
			{#if artist.logo}
				<div
					class="h-36 w-36 shrink-0 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 p-2 shadow-2xl sm:h-44 sm:w-44"
				>
					<img
						src={artist.logo}
						alt="{artist.name} official band emblem"
						class="h-full w-full rounded-2xl object-contain"
					/>
				</div>
			{:else}
				<div
					class="flex h-36 w-36 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-5xl font-black text-white shadow-2xl sm:h-44 sm:w-44"
				>
					{artist.name.charAt(0)}
				</div>
			{/if}

			<div class="flex flex-1 flex-col justify-between">
				<div>
					<div class="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
						<span
							class="rounded-md border border-blue-700/50 bg-blue-950/80 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-blue-300 uppercase"
						>
							Official Artist Profile
						</span>
						<span
							class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-300"
						>
							Active: {artist.yearsActive}
						</span>
						<span class="font-mono text-xs font-semibold text-slate-400">
							{artist.albumCount} {artist.albumCount === 1 ? 'Release' : 'Releases'} &bull; {artist.trackCount} Songs ({artist.playableTrackCount} Streamable)
						</span>
					</div>

					<!-- Primary Top Heading: Artist Name -->
					<h1 class="text-3xl font-black tracking-tight text-white sm:text-5xl">
						{artist.name}
					</h1>

					<!-- Genre Pills -->
					<div class="mt-3 flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
						{#each artist.genres as genre (genre)}
							<span
								class="rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-0.5 text-xs font-medium text-slate-300"
							>
								{genre}
							</span>
						{/each}
					</div>

					<!-- Canonical Artist Biography -->
					<p class="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
						{artist.description}
					</p>
				</div>

				<!-- Hero Action Buttons -->
				<div
					class="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-slate-800/80 pt-5 md:justify-start"
				>
					{#if artist.playableTrackCount > 0}
						<button
							type="button"
							onclick={playArtistCatalog}
							class="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
						>
							<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Artist Catalog ({artist.playableTrackCount} Songs)
						</button>
					{/if}

					<a
						href="#share-artist-section"
						class="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/>
						</svg>
						Share Artist Profile
					</a>

					<a
						href={resolve('/discography')}
						class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
					>
						All Label Artists &rarr;
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Active Filter Chips (only shown when user has filtered via Search & Filter Menu) -->
	{#if activeFilterCount > 0}
		<div class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
			<span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Filters:</span>
			{#if searchQuery.trim()}
				<span class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
					Search: "{searchQuery}"
					<button type="button" onclick={() => (searchQuery = '')} class="hover:text-white">&times;</button>
				</span>
			{/if}
			{#if activeTypeFilter !== 'all'}
				<span class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-2.5 py-1 text-xs font-semibold text-indigo-300 uppercase">
					Format: {activeTypeFilter}
					<button type="button" onclick={() => (activeTypeFilter = 'all')} class="hover:text-white">&times;</button>
				</span>
			{/if}
			{#if activeStatusFilter !== 'all'}
				<span class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 uppercase">
					Status: {activeStatusFilter}
					<button type="button" onclick={() => (activeStatusFilter = 'all')} class="hover:text-white">&times;</button>
				</span>
			{/if}
			<button
				type="button"
				onclick={() => {
					searchQuery = '';
					activeTypeFilter = 'all';
					activeStatusFilter = 'all';
				}}
				class="ml-auto text-xs font-semibold text-slate-400 underline hover:text-white"
			>
				Clear All
			</button>
		</div>
	{/if}

	<!-- =================================================================== -->
	<!-- ARTIST DISCOGRAPHY SECTIONS                                         -->
	<!-- =================================================================== -->
	{#if groupedSections.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
			<p class="text-base text-slate-400">
				No releases by {artist.name} match your active filter criteria.
			</p>
			<button
				type="button"
				onclick={() => {
					searchQuery = '';
					activeTypeFilter = 'all';
					activeStatusFilter = 'all';
				}}
				class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
			>
				Reset Filters
			</button>
		</div>
	{:else}
		<div class="space-y-12">
			{#each groupedSections as section (section.id)}
				<section class="space-y-5">
					<div class="flex flex-col gap-1 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="text-xl">{section.icon}</span>
								<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
									{section.title}
								</h2>
								<span class="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-300">
									{section.albums.length} {section.albums.length === 1 ? 'Release' : 'Releases'}
								</span>
							</div>
							<p class="mt-1 text-xs text-slate-400 sm:text-sm">
								{section.description}
							</p>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{#each section.albums as album (album.id)}
							<div
								id={album.id}
								class="flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl transition-all hover:border-slate-700"
							>
								<div class="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
									<!-- Album Cover Art (Links to /[artist]/[album]) -->
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
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										</a>
										{#if album.status !== 'coming-soon'}
											<button
												type="button"
												onclick={() => playAlbum(album)}
												class="absolute right-2.5 bottom-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
												aria-label="Play {album.title}"
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
													{album.temporalCoverage || album.year} &bull; {album.genre}
												</span>
											</div>

											<h3 class="text-xl leading-snug font-bold tracking-tight text-white sm:text-2xl">
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

											<p class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
												{album.description}
											</p>
										</div>

										<!-- Action Buttons -->
										<div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3.5">
											{#if album.status !== 'coming-soon'}
												<button
													type="button"
													onclick={() => playAlbum(album)}
													class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-500"
												>
													<svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
														<path d="M8 5v14l11-7z" />
													</svg>
													{album.status === 'in-progress'
														? `Play Preview (${album.playableTrackCount})`
														: 'Play Album'}
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
												<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
												<span>Album Page</span>
												<span>&rarr;</span>
											</a>
										</div>
									</div>
								</div>

								<!-- Expandable Tracklist Drawer -->
								{#if expandedAlbumId === album.id}
									<div class="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6">
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
																aria-label="Play {track.title}"
															>
																<svg class="h-3.5 w-3.5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
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
														<span class="truncate text-sm font-medium">
															{track.track}. {track.title}
														</span>
													</div>
													<span class="ml-4 font-mono text-xs text-slate-500">{track.duration}</span>
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

	<!-- =================================================================== -->
	<!-- BOOK-READER STYLE SHARE SECTION FOR THIS ARTIST                     -->
	<!-- =================================================================== -->
	<div id="share-artist-section" class="pt-4">
		<ShareSection
			title={artist.name}
			subtitle="Engine Room Records Artist Profile"
			description={artist.description}
			url="https://music.raggiesoft.com/{artist.slug}"
			socialPreview={artist.socialPreview}
			sharePrompt="Share {artist.name}'s complete discography and narrative lore with friends."
		/>
	</div>
</div>

<!-- Collapsible Search & Filter Menu -->
<SearchFilterModal
	isOpen={showFilterMenu}
	onClose={() => (showFilterMenu = false)}
	bind:searchQuery
	bind:activeTypeFilter
	bind:activeStatusFilter
/>

<!-- Book-Reader-Style Share Modal for Individual Albums -->
<ShareModal
	isOpen={!!shareModalData}
	onClose={() => (shareModalData = null)}
	title={shareModalData?.title || ''}
	subtitle={shareModalData?.subtitle || ''}
	description={shareModalData?.description || ''}
	url={shareModalData?.url || ''}
	socialPreview={shareModalData?.socialPreview || ''}
/>
