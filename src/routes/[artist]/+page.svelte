<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * FILE: src/routes/[artist]/+page.svelte
	 * URL SERVED: https://music.raggiesoft.com/[artist]
	 *             (e.g., `/the-stardust-engine`, `/fractured-prisms`)
	 * ============================================================================
	 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
	 * Paired with `src/routes/[artist]/+page.js` (which resolves `params.artist`
	 * into `{ artist, artistAlbums, featuredTracks, relatedArtists }`), this
	 * component renders a band's dedicated profile and complete discography!
	 *
	 * HOW `data` PROP REACTIVITY WORKS WHEN CLICKING BETWEEN BANDS:
	 * When you are viewing `/the-stardust-engine` and click a "Related Artist" card
	 * at the bottom (say, `/firelight`), SvelteKit re-runs `load()` in `+page.js`
	 * and updates the `data` prop on THIS same component instance! Wrapping
	 * `data.artist`, `data.artistAlbums`, etc. inside `$derived(...)` guarantees
	 * that every heading, SEO tag, and album list updates seamlessly.
	 *
	 * Architectural Principles:
	 * 1. Artist-First Heading Hierarchy: The Artist Name is the primary `<h1>`
	 *    heading at the top of the page.
	 * 2. Hierarchical URLs: Every album links to `/[artist]/[album]` and every
	 *    song links to `/[artist]/[album]/[track]`.
	 * 3. Collapsible Search & Filter Menu: Toolbar button opens `SearchFilterModal`
	 *    bound to local `$state` filters (`searchQuery`, `activeTypeFilter`, `activeStatusFilter`).
	 * 4. Book-Reader-Style Social Sharing: Includes both a Share Modal for
	 *    individual albums and an inline `<ShareSection />` at the bottom.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import {
		albumTypeDefinitions,
		formatAlbumQueue,
		formatReleaseDate,
		hasAnyDsp,
		hasFourthwallStore
	} from '#lib/data/musicData.js';
	import { buildArtistJsonLdScript, buildArtistSeoMeta, ensureRealWorldDate } from '#lib/seo.js';
	import StoreButton from '#lib/components/StoreButton.svelte';
	import ShareSection from '#lib/components/ShareSection.svelte';
	import ShareModal from '#lib/components/ShareModal.svelte';
	import SearchFilterModal from '#lib/components/SearchFilterModal.svelte';

	// Receive `{ artist, artistAlbums, featuredTracks, relatedArtists }` from `[artist]/+page.js`
	let { data } = $props();

	// Derive reactive references so navigating client-side between artists refreshes everything
	let artist = $derived(data.artist);
	let artistAlbums = $derived(data.artistAlbums);
	let featuredTracks = $derived(data.featuredTracks || []);
	let relatedArtists = $derived(data.relatedArtists || []);
	let artistHasDspOrStore = $derived(hasAnyDsp(artist) || Boolean(artist.storefrontUrl));
	let seo = $derived(buildArtistSeoMeta(artist));

	// Optional local filter `$state` within this artist's catalog (two-way bound to `SearchFilterModal`)
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

	// Canonical Schema.org MusicGroup + BreadcrumbList JSON-LD (@graph)
	let jsonLdScript = $derived(buildArtistJsonLdScript(artist, artistAlbums));

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
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<link rel="canonical" href={seo.canonicalUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:url" content={seo.canonicalUrl} />
	<meta property="og:title" content={seo.ogTitle} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={artist.socialPreview} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="{artist.name} — Albums, Songs & Lore on The Listening Room"
	/>

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.ogTitle} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={artist.socialPreview} />
	<meta
		name="twitter:image:alt"
		content="{artist.name} — Albums, Songs & Lore on The Listening Room"
	/>

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
		class="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
	>
		<div
			class="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:gap-10 md:text-left"
		>
			<!-- Artist Crest / Emblem -->
			{#if artist.logo}
				<div
					class="h-36 w-36 shrink-0 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 p-2 shadow-2xl sm:h-44 sm:w-44"
				>
					<img
						src={artist.logo}
						alt="{artist.name} official band emblem"
						width="176"
						height="176"
						fetchpriority="high"
						decoding="async"
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
							{artist.albumCount}
							{artist.albumCount === 1 ? 'Release' : 'Releases'} &bull; {artist.trackCount} Songs ({artist.playableTrackCount}
							Streamable)
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

					<!-- Explicit Fictional-Universe & Real-World Provenance Disclosure -->
					<div
						class="mt-4 max-w-3xl rounded-2xl border border-slate-800/90 bg-slate-950/70 px-4 py-3 text-left text-xs leading-relaxed text-slate-300"
					>
						<strong class="text-white">Creative Provenance:</strong>
						<strong class="text-blue-300">{artist.name}</strong> is a fictional recording artist in
						the interconnected RaggieSoft story universe. All real-world compositions, lyrics,
						arrangements, and sound recordings (℗ 2026 Engine Room Records) are created by
						<a
							href="https://michaelpragsdale.com"
							target="_blank"
							rel="noopener noreferrer"
							class="font-semibold text-white underline decoration-slate-500 underline-offset-2 hover:text-blue-300"
						>
							Michael P. Ragsdale
						</a>
						and published under the
						<a
							href="https://engineroom.raggiesoft.com"
							target="_blank"
							rel="noopener noreferrer"
							class="font-semibold text-white underline decoration-slate-500 underline-offset-2 hover:text-blue-300"
						>
							Engine Room Records
						</a>
						imprint.
					</div>
				</div>

				<!-- Hero Action Buttons & Support Microcopy -->
				<div class="mt-6 border-t border-slate-800/80 pt-5">
					{#if artistHasDspOrStore}
						<p class="mb-3 text-xs leading-relaxed text-slate-300">
							<strong class="text-blue-400">Support {artist.name}:</strong> Streaming in
							Lossless/High-Res on your favorite app or purchasing digital masters directly supports
							<strong class="text-white">Michael Ragsdale</strong> &amp;
							<strong class="text-white">Engine Room Records</strong>.
						</p>
					{/if}

					<div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
						<!-- Primary Upgrade Action: Official DSP & Fourthwall Storefront -->
						<StoreButton
							type={artist.dspTargetType || 'artist'}
							size="large"
							spotifyId={artist.spotifyId}
							appleId={artist.appleId}
							amazonId={artist.amazonId}
							youtubeId={artist.youtubeId}
							storefrontUrl={artist.storefrontUrl}
						/>

						<!-- Secondary Free Onsite Preview Stream -->
						{#if artist.playableTrackCount > 0}
							<button
								type="button"
								onclick={playArtistCatalog}
								class="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 {artistHasDspOrStore
									? 'border border-blue-500/50 bg-slate-900/90 text-blue-200 hover:border-blue-400 hover:bg-slate-800 hover:text-white'
									: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500'}"
							>
								<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								<span>Preview Catalog ({artist.playableTrackCount} Songs)</span>
								<span
									class="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-300"
								>
									128kbps
								</span>
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
							Share Profile
						</a>

						{#if artist.loreUrl}
							<a
								href={artist.loreUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-4 py-3 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white"
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
								<span>Official Lore Archive (RaggieSoft.com)</span>
								<svg
									class="h-3.5 w-3.5 opacity-80"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						{/if}

						<a
							href={resolve('/discography')}
							class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
						>
							All Label Artists &rarr;
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- FEATURED SONGS HUB (Direct Crawlable Track Links for Search & Fans) -->
	<!-- =================================================================== -->
	{#if featuredTracks.length > 0 && activeFilterCount === 0}
		<section class="space-y-4">
			<div
				class="flex flex-col gap-1 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-end sm:justify-between"
			>
				<div>
					<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
						Featured Songs by {artist.name}
					</h2>
					<p class="mt-1 text-xs text-slate-400 sm:text-sm">
						Signature singles, narrative turning points, and fan-favorite recordings — open any song
						for full lyrics, story notes, and streaming links
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each featuredTracks as entry (entry.track.id + '::' + entry.album.slug)}
					<div
						class="group flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 shadow-md transition-all hover:border-blue-500/50 hover:bg-slate-900"
					>
						<div class="flex min-w-0 items-center gap-3">
							{#if entry.track.isPlayable}
								<button
									type="button"
									onclick={() => playTrack(entry.album, entry.track)}
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-blue-300 transition-colors hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
									aria-label="Play {entry.track.title} by {artist.name}"
								>
									<svg
										class="h-4 w-4 translate-x-0.5 fill-current"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								</button>
							{:else}
								<img
									src={entry.album.artwork}
									alt="Cover artwork for {entry.album.title}"
									width="40"
									height="40"
									loading="lazy"
									decoding="async"
									class="h-10 w-10 shrink-0 rounded-xl border border-slate-700 object-cover"
								/>
							{/if}

							<div class="min-w-0">
								<h3 class="truncate text-sm font-bold text-white">
									<a
										href={resolve('/[artist]/[album]/[track]', {
											artist: entry.album.artistSlug,
											album: entry.album.slug,
											track: entry.track.slug
										})}
										class="transition-colors hover:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
									>
										{entry.track.title}
									</a>
								</h3>
								<p class="truncate text-xs text-slate-400">
									<a
										href={resolve('/[artist]/[album]', {
											artist: entry.album.artistSlug,
											album: entry.album.slug
										})}
										class="hover:text-slate-200 hover:underline"
									>
										{entry.album.title}
									</a>
									<span> &bull; {entry.album.year}</span>
								</p>
							</div>
						</div>

						<a
							href={resolve('/[artist]/[album]/[track]', {
								artist: entry.album.artistSlug,
								album: entry.album.slug,
								track: entry.track.slug
							})}
							class="shrink-0 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-blue-600 hover:text-white"
							aria-label="Lyrics and lore for {entry.track.title}"
						>
							Lyrics &rarr;
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Active Filter Chips (only shown when user has filtered via Search & Filter Menu) -->
	{#if activeFilterCount > 0}
		<div
			class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
		>
			<span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Filters:</span>
			{#if searchQuery.trim()}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-300"
				>
					Search: "{searchQuery}"
					<button type="button" onclick={() => (searchQuery = '')} class="hover:text-white"
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
												width="300"
												height="300"
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
													Narrative Release: {formatReleaseDate(album.temporalCoverage, album.year)} &bull;
													Real-World DSP Release: {ensureRealWorldDate(album.datePublished)} &bull; {album.genre}
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

											<p
												class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm"
											>
												{album.description}
											</p>
										</div>

										<!-- Action Buttons (DSP / Fourthwall + 128kbps Preview) -->
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

								<!-- Expandable Tracklist Drawer -->
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
															class="truncate text-sm font-medium transition-colors hover:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
														>
															{track.track}. {track.title}
														</a>
													</div>
													<div class="ml-4 flex shrink-0 items-center gap-2">
														<span class="font-mono text-xs text-slate-500">{track.duration}</span>
														<a
															href={resolve('/[artist]/[album]/[track]', {
																artist: album.artistSlug,
																album: album.slug,
																track: track.slug
															})}
															class="rounded border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-blue-500/60 hover:bg-blue-600 hover:text-white"
															aria-label="Open song page for {track.title}"
														>
															Song &rarr;
														</a>
													</div>
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
	<!-- RELATED ENGINE ROOM RECORDS ARTISTS                                 -->
	<!-- =================================================================== -->
	{#if relatedArtists.length > 0}
		<section class="space-y-4 border-t border-slate-800/80 pt-8">
			<div class="flex items-center justify-between gap-4">
				<div>
					<h2 class="text-xl font-bold tracking-tight text-white">
						Related Engine Room Records Artists
					</h2>
					<p class="mt-0.5 text-xs text-slate-400 sm:text-sm">
						Explore sister bands and fellow touring artists from the RaggieSoft story universe
					</p>
				</div>
				<a
					href={resolve('/discography')}
					class="text-xs font-semibold text-blue-400 hover:text-blue-300"
				>
					Full Label Roster &rarr;
				</a>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each relatedArtists as relArtist (relArtist.slug)}
					<a
						href={resolve('/[artist]', { artist: relArtist.slug })}
						class="group flex items-center gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-blue-500/60 hover:bg-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						{#if relArtist.logo}
							<img
								src={relArtist.logo}
								alt="{relArtist.name} band emblem"
								width="56"
								height="56"
								loading="lazy"
								decoding="async"
								class="h-14 w-14 shrink-0 rounded-2xl border border-slate-700/80 bg-slate-950 object-contain p-1"
							/>
						{:else}
							<div
								class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-xl font-black text-white"
							>
								{relArtist.name.charAt(0)}
							</div>
						{/if}
						<div class="min-w-0">
							<h3 class="truncate text-sm font-bold text-white group-hover:text-blue-400">
								{relArtist.name}
							</h3>
							<p class="truncate text-xs text-slate-400">
								{relArtist.albumCount}
								{relArtist.albumCount === 1 ? 'Release' : 'Releases'} &bull; {relArtist.trackCount} Songs
							</p>
							<p class="mt-0.5 truncate text-[11px] text-slate-500">
								{relArtist.genres.slice(0, 2).join(' / ')}
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- =================================================================== -->
	<!-- BOOK-READER STYLE SHARE SECTION FOR THIS ARTIST                     -->
	<!-- =================================================================== -->
	<div id="share-artist-section" class="pt-4">
		<ShareSection
			title={artist.name}
			subtitle="The Listening Room — Engine Room Records"
			description={artist.description}
			url="https://music.raggiesoft.com/{artist.slug}"
			socialPreview={artist.socialPreview}
			sharePrompt="Share {artist.name}'s complete discography, lyrics, and narrative lore with friends."
		/>
	</div>
</div>

<!--
	Two-way prop binding (`bind:searchQuery`, `bind:activeTypeFilter`, `bind:activeStatusFilter`)
	keeps this artist page's local filter `$state` synchronized with `<SearchFilterModal />`.
-->
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
