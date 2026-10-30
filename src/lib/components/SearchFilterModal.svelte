<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * SearchFilterModal.svelte
	 * ============================================================================
	 * Collapsible Advanced Search & Filter Menu Drawer/Modal for Engine Room Records
	 * (music.raggiesoft.com).
	 *
	 * Architectural Rationale:
	 * Previously, the 3-tier sorting and filtering matrix (Release Types, Statuses,
	 * Artists, Rock Operas, and Search Bar) remained permanently expanded on-screen,
	 * pushing page content down and competing with the primary `<h1>` heading.
	 *
	 * By encapsulating this system inside a toggleable Search & Filter Menu:
	 * 1. Artist and Album pages keep the Artist Name or Album Name as the uncontested
	 *    top `<h1>` heading.
	 * 2. Listeners can open the menu from the global header or the discography toolbar
	 *    at any time to search tracks/lyrics/ISRCs, jump directly to an Artist's
	 *    dedicated SEO URL (`/artist/[slug]`), or apply multi-faceted filters on
	 *    `/discography`.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { allAlbums, allArtists, catalogStats, formatReleaseDate } from '#lib/data/musicData.js';

	let {
		isOpen = false,
		onClose = () => {},
		searchQuery = $bindable(''),
		activeTypeFilter = $bindable('all'),
		activeStatusFilter = $bindable('all'),
		activeFilter = $bindable('all'),
		isStandaloneGlobal = false
	} = $props();

	// Compute counts for release production types
	let typeCounts = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = { all: allAlbums.length, studio: 0, live: 0, compilation: 0, soundtrack: 0 };
		for (const alb of allAlbums) {
			const t = alb.albumType || 'studio';
			if (counts[t] !== undefined) counts[t]++;
		}
		return counts;
	});

	// Quick live search results preview when used from the global header
	let quickMatches = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return allAlbums
			.filter((album) => {
				const formattedDate = formatReleaseDate(album.temporalCoverage, album.year).toLowerCase();
				const matchAlbum =
					album.title.toLowerCase().includes(q) ||
					album.artist.toLowerCase().includes(q) ||
					album.genre.toLowerCase().includes(q) ||
					album.year.includes(q) ||
					(album.temporalCoverage && album.temporalCoverage.includes(q)) ||
					formattedDate.includes(q);
				const matchTrack = album.tracks.some(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						(t.loreNote && t.loreNote.toLowerCase().includes(q)) ||
						(t.lyrics && t.lyrics.toLowerCase().includes(q)) ||
						(t.isrc && t.isrc.toLowerCase().includes(q))
				);
				return matchAlbum || matchTrack;
			})
			.slice(0, 6);
	});

	/**
	 * Applies filters and navigates to `/discography` with URL query parameters
	 * when triggered from outside the discography page.
	 */
	function applyAndNavigate() {
		if (isStandaloneGlobal) {
			const params = new URLSearchParams();
			if (searchQuery.trim()) params.set('q', searchQuery.trim());
			if (activeTypeFilter !== 'all') params.set('type', activeTypeFilter);
			if (activeStatusFilter !== 'all') params.set('status', activeStatusFilter);
			if (activeFilter !== 'all') params.set('filter', activeFilter);
			const qs = params.toString();
			const base = resolve('/discography');
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(qs ? `${base}?${qs}` : base);
		}
		onClose();
	}

	/**
	 * Resets all active search & filter criteria to defaults.
	 */
	function resetAllFilters() {
		searchQuery = '';
		activeTypeFilter = 'all';
		activeStatusFilter = 'all';
		activeFilter = 'all';
	}

	/**
	 * Closes modal on Escape key press.
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (isOpen && e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="er-safe-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-12 backdrop-blur-sm sm:pt-20"
		role="dialog"
		aria-modal="true"
		aria-label="Search and Filter Catalog"
	>
		<!-- Backdrop click area -->
		<button
			type="button"
			onclick={() => onClose()}
			class="fixed inset-0 h-full w-full cursor-default"
			aria-label="Close search and filter menu"
			tabindex="-1"
		></button>

		<!-- Modal Panel -->
		<div
			class="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl sm:p-8"
		>
			<!-- Modal Header -->
			<div class="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
				<div>
					<span class="text-xs font-bold tracking-widest text-blue-400 uppercase">
						Catalog Explorer
					</span>
					<h2 class="mt-0.5 text-2xl font-extrabold tracking-tight text-white">
						Search &amp; Filter Menu
					</h2>
				</div>
				<button
					type="button"
					onclick={() => onClose()}
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					aria-label="Close search menu"
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

			<div class="space-y-6">
				<!-- 1. Keyword Search Bar -->
				<div>
					<label
						for="catalog-search-input"
						class="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
					>
						Search Songs, Albums, Lyrics, Lore &amp; ISRCs
					</label>
					<div class="relative">
						<div
							class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"
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
							id="catalog-search-input"
							type="text"
							bind:value={searchQuery}
							onkeydown={(/** @type {KeyboardEvent} */ e) => e.key === 'Enter' && applyAndNavigate()}
							placeholder="Type an album title, song lyric, character name, or ISRC..."
							class="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pr-16 pl-10 text-sm text-white placeholder-slate-400 shadow-inner transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => (searchQuery = '')}
								class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400 hover:text-white"
							>
								Clear
							</button>
						{/if}
					</div>

					<!-- Instant Quick Matches Preview -->
					{#if quickMatches.length > 0}
						<div class="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
							<div class="mb-2 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
								Direct Album Matches ({quickMatches.length})
							</div>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{#each quickMatches as match (match.id)}
									<a
										href={resolve('/[artist]/[album]', {
											artist: match.artistSlug,
											album: match.slug
										})}
										onclick={() => onClose()}
										class="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/90 p-2 transition-colors hover:border-blue-500/50 hover:bg-slate-800"
									>
										<img
											src={match.artwork}
											alt={match.title}
											class="h-10 w-10 shrink-0 rounded-md object-cover"
										/>
										<div class="min-w-0 flex-1">
											<div class="truncate text-xs font-bold text-white">{match.title}</div>
											<div class="truncate text-[11px] text-slate-400">
												{match.artist} &bull; {formatReleaseDate(match.temporalCoverage, match.year)}
											</div>
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- 2. Direct Artist Pages (SEO URLs) -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-slate-300 uppercase">
							Browse by Artist (Dedicated Pages)
						</span>
						<span class="text-[11px] text-slate-400">Changes URL to /$artist-slug</span>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each allArtists as artist (artist.slug)}
							<a
								href={resolve('/[artist]', { artist: artist.slug })}
								onclick={() => onClose()}
								class="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white"
							>
								{#if artist.logo}
									<img
										src={artist.logo}
										alt=""
										class="h-4 w-4 rounded-full object-cover"
									/>
								{/if}
								<span>{artist.name}</span>
								<span class="font-mono text-[10px] text-slate-400">({artist.albumCount})</span>
							</a>
						{/each}
					</div>
				</div>

				<!-- 3. Filter Discography by Category / Artist -->
				<div>
					<span class="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
						Discography View Filter
					</span>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => (activeFilter = 'all')}
							class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all {activeFilter ===
							'all'
								? 'bg-blue-600 text-white shadow-sm'
								: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white'}"
						>
							All Releases ({allAlbums.length})
						</button>
						<button
							type="button"
							onclick={() => (activeFilter = 'rock-opera')}
							class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all {activeFilter ===
							'rock-opera'
								? 'bg-indigo-600 text-white shadow-sm'
								: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white'}"
						>
							Rock Operas ⚡
						</button>
						{#each allArtists as artist (artist.slug)}
							<button
								type="button"
								onclick={() => (activeFilter = artist.slug)}
								class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all {activeFilter ===
								artist.slug
									? 'bg-blue-600 text-white shadow-sm'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white'}"
							>
								{artist.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- 4. Release Type & Production Status Filters -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Production Type -->
					<div>
						<span class="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
							Release Format
						</span>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => (activeTypeFilter = 'all')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeTypeFilter ===
								'all'
									? 'bg-blue-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								All ({typeCounts.all})
							</button>
							<button
								type="button"
								onclick={() => (activeTypeFilter = 'studio')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeTypeFilter ===
								'studio'
									? 'bg-blue-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								Studio ({typeCounts.studio})
							</button>
							<button
								type="button"
								onclick={() => (activeTypeFilter = 'live')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeTypeFilter ===
								'live'
									? 'bg-rose-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								Live ({typeCounts.live})
							</button>
							<button
								type="button"
								onclick={() => (activeTypeFilter = 'compilation')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeTypeFilter ===
								'compilation'
									? 'bg-purple-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								Compilations ({typeCounts.compilation})
							</button>
							{#if typeCounts.soundtrack > 0}
								<button
									type="button"
									onclick={() => (activeTypeFilter = 'soundtrack')}
									class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeTypeFilter ===
									'soundtrack'
										? 'bg-teal-600 text-white'
										: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
								>
									Soundtracks ({typeCounts.soundtrack})
								</button>
							{/if}
						</div>
					</div>

					<!-- Release Availability Status -->
					<div>
						<span class="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
							Streaming Availability
						</span>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => (activeStatusFilter = 'all')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeStatusFilter ===
								'all'
									? 'bg-blue-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								All Statuses
							</button>
							<button
								type="button"
								onclick={() => (activeStatusFilter = 'released')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeStatusFilter ===
								'released'
									? 'bg-emerald-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								Released ({catalogStats.playableTracks} Songs)
							</button>
							<button
								type="button"
								onclick={() => (activeStatusFilter = 'in-progress')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeStatusFilter ===
								'in-progress'
									? 'bg-sky-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								In Production
							</button>
							<button
								type="button"
								onclick={() => (activeStatusFilter = 'coming-soon')}
								class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {activeStatusFilter ===
								'coming-soon'
									? 'bg-amber-600 text-white'
									: 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'}"
							>
								Coming Soon
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal Footer Actions -->
			<div class="mt-8 flex items-center justify-between border-t border-slate-800 pt-4">
				<button
					type="button"
					onclick={resetAllFilters}
					class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
				>
					Reset All Filters
				</button>

				<button
					type="button"
					onclick={applyAndNavigate}
					class="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-sm"
				>
					{isStandaloneGlobal ? 'View Matching Releases →' : 'Apply & Show Results'}
				</button>
			</div>
		</div>
	</div>
{/if}
