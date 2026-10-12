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
	<meta
		name="description"
		content="A modern, persistent audio platform for the RaggieSoft universe, supporting continuous gapless playback across rock operas."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="mx-auto mb-10 max-w-3xl text-center">
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
		Immerse yourself in persistent audio, synchronized lyrics, and canonical lore spanning the
		RaggieSoft music catalog—from 80s synth-rock to sprawling multi-disc rock operas.
	</p>

	<!-- Architectural Badges (WCAG AA, Svelte 5, Tailwind v4) -->
	<div
		class="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-400"
	>
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1"
			>WCAG 2.1 AA Compliant</span
		>
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1"
			>Media Session API</span
		>
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1">Svelte 5 Runes</span>
		<span class="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1">Tailwind CSS v4</span>
	</div>
</section>

<!-- Filter Navigation Pills -->
<div class="mb-8 flex flex-wrap items-center justify-center gap-2">
	<button
		onclick={() => (activeFilter = 'all')}
		class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
		'all'
			? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
			: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
	>
		All Releases
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
	<button
		onclick={() => (activeFilter = 'the-stardust-engine')}
		class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
		'the-stardust-engine'
			? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
			: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
	>
		The Stardust Engine
	</button>
	<button
		onclick={() => (activeFilter = 'the-paper-wall')}
		class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
		'the-paper-wall'
			? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
			: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
	>
		The Paper Wall
	</button>
	<button
		onclick={() => (activeFilter = 'fractured-prisms')}
		class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm {activeFilter ===
		'fractured-prisms'
			? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
			: 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}"
	>
		Fractured Prisms
	</button>
</div>

<!-- Albums Grid -->
<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
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
					<button
						onclick={() => playAlbum(album)}
						class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
						aria-label="Play complete album {album.title}"
					>
						<span
							class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110"
						>
							<svg class="h-7 w-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</span>
					</button>
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
							<span class="font-mono text-xs font-semibold text-slate-400">
								{album.year} • {album.genre}
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
						<button
							onclick={() => playAlbum(album)}
							class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Album
						</button>

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
								class="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800/50 {player
									.currentTrack.id === track.id
									? 'bg-slate-800/80 text-blue-400'
									: 'text-slate-300'}"
							>
								<div class="flex min-w-0 flex-1 items-center gap-3">
									<button
										onclick={() => playTrack(album, tIdx)}
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

									<div class="truncate">
										<span class="block truncate text-sm font-medium">
											{track.track}. {track.title}
										</span>
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
