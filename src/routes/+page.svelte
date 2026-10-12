<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte
	 * ============================================================================
	 * Discovery & Discography Portal for Engine Room Records (music.raggiesoft.com).
	 * Implements a composable UI component library built with Tailwind CSS v4,
	 * showcasing album browsing, rock opera sequence playback, and canonical lore.
	 * ============================================================================
	 */
	import { player } from '#lib/player.svelte.js';
	import { featuredAlbums, formatAlbumQueue } from '#lib/data/musicData.js';

	let activeFilter = $state('all');
	let expandedAlbumId = $state(/** @type {string | null} */ ('our-own-frequency'));

	// Derived filtered album collection based on selected pill
	let filteredAlbums = $derived(
		featuredAlbums.filter((album) => {
			if (activeFilter === 'all') return true;
			if (activeFilter === 'rock-opera') return album.isRockOpera;
			return album.artistSlug === activeFilter;
		})
	);

	/**
	 * Plays an entire album sequentially from track 1.
	 * Enables continuous, gapless-style playback across rock operas.
	 * @param {typeof featuredAlbums[0]} album
	 */
	function playAlbum(album) {
		const queue = formatAlbumQueue(album);
		player.loadQueue(queue, 0, true);
	}

	/**
	 * Plays a specific track from an album and queues the rest of the album following it.
	 * @param {typeof featuredAlbums[0]} album
	 * @param {number} trackIndex
	 */
	function playTrack(album, trackIndex) {
		const queue = formatAlbumQueue(album);
		player.loadQueue(queue, trackIndex, true);
	}

	/**
	 * @param {string} albumId
	 */
	function toggleAlbumDetails(albumId) {
		expandedAlbumId = expandedAlbumId === albumId ? null : albumId;
	}
</script>

<svelte:head>
	<title>Engine Room Records | Official Music Platform</title>
	<meta name="description" content="A modern, persistent audio platform for the RaggieSoft universe, supporting continuous gapless playback across rock operas." />
</svelte:head>

<!-- Hero Section -->
<section class="mb-10 text-center max-w-3xl mx-auto">
	<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
		<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
		Continuous Rock Opera Playback Enabled
	</div>

	<h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
		Sounds From the Engine Room
	</h1>
	<p class="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
		Immerse yourself in persistent audio, synchronized lyrics, and canonical lore spanning the RaggieSoft music catalog—from 80s synth-rock to sprawling multi-disc rock operas.
	</p>

	<!-- Architectural Badges (WCAG AA, Svelte 5, Tailwind v4) -->
	<div class="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 font-medium">
		<span class="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">WCAG 2.1 AA Compliant</span>
		<span class="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Media Session API</span>
		<span class="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Svelte 5 Runes</span>
		<span class="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Tailwind CSS v4</span>
	</div>
</section>

<!-- Filter Navigation Pills -->
<div class="flex items-center justify-center flex-wrap gap-2 mb-8">
	<button
		onclick={() => (activeFilter = 'all')}
		class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {activeFilter === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}"
	>
		All Releases
	</button>
	<button
		onclick={() => (activeFilter = 'rock-opera')}
		class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {activeFilter === 'rock-opera' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}"
	>
		Rock Operas ⚡
	</button>
	<button
		onclick={() => (activeFilter = 'the-stardust-engine')}
		class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {activeFilter === 'the-stardust-engine' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}"
	>
		The Stardust Engine
	</button>
	<button
		onclick={() => (activeFilter = 'the-paper-wall')}
		class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {activeFilter === 'the-paper-wall' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}"
	>
		The Paper Wall
	</button>
	<button
		onclick={() => (activeFilter = 'fractured-prisms')}
		class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {activeFilter === 'fractured-prisms' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}"
	>
		Fractured Prisms
	</button>
</div>

<!-- Albums Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
	{#each filteredAlbums as album}
		<div
			class="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col"
		>
			<!-- Card Top / Hero Area -->
			<div class="p-6 flex flex-col sm:flex-row gap-6">
				<!-- Cover Art Container -->
				<div class="relative group w-44 h-44 sm:w-48 sm:h-48 rounded-xl overflow-hidden shrink-0 shadow-lg border border-slate-800 self-center sm:self-start">
					<img
						src={album.artwork}
						alt="Cover artwork for {album.title}"
						class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
					/>
					
					<!-- Play Album Overlay Button -->
					<button
						onclick={() => playAlbum(album)}
						class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
						aria-label="Play complete album {album.title}"
					>
						<span class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/50 hover:scale-110 transition-transform">
							<svg class="w-7 h-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</span>
					</button>
				</div>

				<!-- Album Info -->
				<div class="flex flex-col justify-between flex-1 text-left">
					<div>
						<div class="flex items-center gap-2 mb-2 flex-wrap">
							{#if album.isRockOpera}
								<span class="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-900/80 text-indigo-300 rounded border border-indigo-700/50">
									Rock Opera
								</span>
							{/if}
							<span class="text-xs text-slate-400 font-mono font-semibold">
								{album.year} • {album.genre}
							</span>
						</div>

						<h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
							{album.title}
						</h2>
						<p class="text-sm font-semibold text-blue-400 mt-1">
							{album.artist}
						</p>
						<p class="text-xs sm:text-sm text-slate-400 mt-2 line-clamp-3 leading-relaxed">
							{album.description}
						</p>
					</div>

					<!-- Card Action Bar -->
					<div class="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-3">
						<button
							onclick={() => playAlbum(album)}
							class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-md shadow-blue-600/20 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Album
						</button>

						<button
							onclick={() => toggleAlbumDetails(album.id)}
							class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs sm:text-sm transition-colors border border-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						>
							{expandedAlbumId === album.id ? 'Hide Tracks' : `Tracks (${album.tracks.length})`}
						</button>
					</div>
				</div>
			</div>

			<!-- Collapsible Track List -->
			{#if expandedAlbumId === album.id}
				<div class="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6 transition-all">
					<div class="flex items-center justify-between mb-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
						<span>Tracklist</span>
						<span>Duration</span>
					</div>

					<div class="divide-y divide-slate-800/60">
						{#each album.tracks as track, tIdx}
							<div
								class="py-2.5 px-3 flex items-center justify-between rounded-lg hover:bg-slate-800/50 transition-colors group {player.currentTrack.id === track.id ? 'bg-slate-800/80 text-blue-400' : 'text-slate-300'}"
							>
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<button
										onclick={() => playTrack(album, tIdx)}
										class="w-7 h-7 rounded-full bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
										aria-label="Play {track.title}"
									>
										{#if player.currentTrack.id === track.id && player.isPlaying}
											<svg class="w-3.5 h-3.5 text-blue-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
												<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
											</svg>
										{:else}
											<svg class="w-3.5 h-3.5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
												<path d="M8 5v14l11-7z" />
											</svg>
										{/if}
									</button>

									<div class="truncate">
										<span class="text-sm font-medium block truncate">
											{track.track}. {track.title}
										</span>
										{#if track.loreNote}
											<span class="text-[11px] text-slate-500 italic truncate block">
												"{track.loreNote}"
											</span>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-3 ml-4 shrink-0 text-xs font-mono text-slate-500">
									{#if track.isrc}
										<span class="hidden sm:inline text-slate-600">{track.isrc}</span>
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
