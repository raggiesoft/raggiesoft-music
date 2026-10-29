<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (/playlists/[slug])
	 * ============================================================================
	 * Dedicated Showcase & Interactive Story Reader/Player Route for Official
	 * Curated Story Playlists (e.g., `/playlists/john-and-erin`).
	 *
	 * Architectural Responsibilities:
	 * 1. Cross-Property Narrative Integration:
	 *    - Links directly to the standalone Ocean View Archives novel
	 *      (`https://books.raggiesoft.com/erin` and `https://raggiesoft.com/raggiesoft-books/books/erin`)
	 *      as well as individual chapter/scene deep links for every track in the arc.
	 *    - Links directly to the official Stardust Engine lore page
	 *      (`https://raggiesoft.com/engine-room/artists/stardust-engine/story/john-and-erin`).
	 *    - Highlights Cross-Universe Echoes (such as Jessica's Train Ride at Kent Station
	 *      and Freddie & Paige on the CPI campus).
	 * 2. Full Continuous Queue Playback & Lyrics/Lore Inspection:
	 *    - Allows listeners to play the complete 5-song narrative sequence from start
	 *      to finish or jump to any act while viewing inline lyrics, lore notes, and
	 *      book chapter connections.
	 * 3. SEO & Rich Social Graph Metadata:
	 *    - Emits dedicated 16:9 OpenGraph (`og:image`) and Schema.org `MusicPlaylist`
	 *      structured data.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { playlistManager } from '#lib/playlists.svelte.js';
	import ShareModal from '#lib/components/ShareModal.svelte';

	let { data } = $props();
	let playlist = $derived(data.playlist);
	let expandedTrackId = $state(/** @type {string | null} */ (null));
	let shareModalData = $state(/** @type {any} */ (null));

	/**
	 * Starts continuous playback of the story playlist from the given index.
	 * @param {number} [index=0]
	 */
	function playPlaylist(index = 0) {
		if (playlist?.tracks?.length > 0) {
			player.loadQueue(playlist.tracks, index, true);
		}
	}

	/**
	 * Toggles inline lyrics & lore accordion for a track.
	 * @param {string} id
	 */
	function toggleExpandTrack(id) {
		expandedTrackId = expandedTrackId === id ? null : id;
	}

	function openShare() {
		shareModalData = {
			title: playlist.title,
			subtitle: playlist.curator,
			description: playlist.description,
			url: `https://music.raggiesoft.com/playlists/${playlist.slug}`,
			socialPreview: playlist.socialPreview
		};
	}

	// Build Schema.org MusicPlaylist JSON-LD
	let jsonLdString = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'MusicPlaylist',
			name: playlist.title,
			description: playlist.description,
			url: `https://music.raggiesoft.com/playlists/${playlist.slug}`,
			image: playlist.socialPreview || playlist.artwork,
			numTracks: playlist.tracks.length,
			author: {
				'@type': 'MusicGroup',
				name: playlist.curator
			},
			track: playlist.tracks.map((t, i) => ({
				'@type': 'MusicRecording',
				position: i + 1,
				name: t.title,
				byArtist: t.artist,
				inAlbum: t.album,
				duration: t.duration,
				isrcCode: t.isrc || undefined
			}))
		})
	);
</script>

<svelte:head>
	<title>{playlist.ogTitle || playlist.title}</title>
	<meta name="description" content={playlist.ogDescription || playlist.description} />
	<link rel="canonical" href="https://music.raggiesoft.com/playlists/{playlist.slug}" />
	<meta property="og:type" content="music.playlist" />
	<meta property="og:site_name" content="The Listening Room by Engine Room Records" />
	<meta property="og:title" content={playlist.ogTitle || playlist.title} />
	<meta property="og:description" content={playlist.ogDescription || playlist.description} />
	<meta property="og:url" content="https://music.raggiesoft.com/playlists/{playlist.slug}" />
	<meta property="og:image" content={playlist.socialPreview || playlist.artwork} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={playlist.ogTitle || playlist.title} />
	<meta name="twitter:description" content={playlist.ogDescription || playlist.description} />
	<meta name="twitter:image" content={playlist.socialPreview || playlist.artwork} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLdString}</script>`}
</svelte:head>

<div class="space-y-10">
	<!-- Breadcrumb Navigation -->
	<nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
		<a href={resolve('/')} class="hover:text-white">Home</a>
		<span>/</span>
		<a href={resolve('/playlists')} class="hover:text-white">Playlists</a>
		<span>/</span>
		<span class="text-blue-400">{playlist.title}</span>
	</nav>

	<!-- ===================================================================== -->
	<!-- HERO SHOWCASE CARD                                                    -->
	<!-- ===================================================================== -->
	<section
		class="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/50 shadow-2xl"
	>
		<!-- 16:9 Cinematic Banner Preview -->
		<div class="relative max-h-96 w-full overflow-hidden border-b border-slate-800">
			<img
				src={playlist.socialPreview}
				alt={playlist.title}
				class="h-full w-full object-cover"
			/>
			<div
				class="
					absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent
				"
			></div>
			<div class="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-3">
				<span
					class="rounded-full border border-amber-400/50 bg-slate-950/85 px-3.5 py-1 text-xs font-extrabold tracking-wider text-amber-300 uppercase backdrop-blur-md"
				>
					{playlist.badge}
				</span>
				<span
					class="rounded-full border border-slate-700 bg-slate-950/85 px-3 py-1 font-mono text-xs text-slate-300 backdrop-blur-md"
				>
					{playlist.tracks.length} Songs &bull; {playlist.formattedDuration}
				</span>
			</div>
		</div>

		<div class="grid gap-8 p-6 sm:p-10 lg:grid-cols-12">
			<!-- Left Column: Square Cover + Action Controls (4 cols) -->
			<div class="flex flex-col items-center space-y-4 lg:col-span-4">
				<img
					src={playlist.artwork}
					alt={playlist.title}
					class="aspect-square w-full max-w-xs rounded-2xl border border-slate-700/80 object-cover shadow-2xl"
				/>

				<div class="w-full max-w-xs space-y-2.5">
					<button
						type="button"
						onclick={() => playPlaylist(0)}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
					>
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
						Play Complete Story Arc
					</button>

					<button
						type="button"
						onclick={openShare}
						class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white"
					>
						<span>🔗 Share Story Playlist</span>
					</button>
				</div>
			</div>

			<!-- Right Column: Story Overview + Direct Links to Book & Lore (8 cols) -->
			<div class="space-y-6 lg:col-span-8">
				<div>
					<p class="text-xs font-bold tracking-widest text-blue-400 uppercase">
						{playlist.curator} &bull; {playlist.year}
					</p>
					<h1 class="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
						{playlist.title}
					</h1>
					<p class="mt-1 text-base font-semibold text-amber-300">
						{playlist.subtitle}
					</p>
				</div>

				<!-- Prominent Companion Book & Lore Gateway Box -->
				<div class="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 shadow-inner">
					<h2 class="text-xs font-extrabold tracking-wider text-amber-300 uppercase">
						📚 {playlist.bookUrl
							? 'Official Companion Novel & Band Lore Archive'
							: 'Official Sonic Architecture & Band Lore Archive'}
					</h2>
					<p class="mt-1 text-xs leading-relaxed text-slate-300">
						{#if playlist.bookUrl}
							Read the complete four-chapter narrative of fraternal twins <strong>John and Erin</strong>
							(portrayed by Ryan and Cassidy O'Connell, both navigating CPI's steep Blacksburg hills in
							motorized power wheelchairs) in <em>The Ocean View Archives</em>, or explore the liner-note
							lore page on <em>raggiesoft.com</em>:
						{:else}
							Explore the complete studio engineering and narrative lore behind
							<strong>{playlist.title}</strong> and Cassidy O'Connell's signature analog space-synth
							architecture on <em>raggiesoft.com</em>:
						{/if}
					</p>
					<div class="mt-3.5 flex flex-wrap gap-3">
						{#if playlist.bookUrl}
							<a
								href={playlist.bookUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-md transition-colors hover:bg-amber-400"
							>
								<span>📖 Read Novel on Ocean View Archives</span>
								<span>↗</span>
							</a>
						{/if}
						{#if playlist.loreUrl}
							<a
								href={playlist.loreUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-xl border border-blue-400/50 bg-blue-600/20 px-4 py-2.5 text-xs font-extrabold text-blue-200 transition-colors hover:bg-blue-600 hover:text-white"
							>
								<span>🎸 Official Stardust Engine Lore Dossier</span>
								<span>↗</span>
							</a>
						{/if}
						{#if playlist.hubBookUrl}
							<a
								href={playlist.hubBookUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
							>
								<span>{playlist.bookUrl ? 'Contemporary Library Index (raggiesoft.com)' : 'Ad Astra Lore Archive (raggiesoft.com)'}</span>
								<span>↗</span>
							</a>
						{/if}
					</div>
				</div>

				<!-- Narrative Synopsis Paragraphs -->
				<div class="space-y-3 text-sm leading-relaxed text-slate-300 sm:text-base">
					{#each playlist.storyParagraphs as paragraph, i (i)}
						<p>{paragraph}</p>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ===================================================================== -->
	<!-- CHAPTER-BY-CHAPTER PLAYABLE TRACK SUITE                               -->
	<!-- ===================================================================== -->
	<section class="space-y-4" aria-labelledby="story-tracks-heading">
		<div class="flex flex-col justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-end">
			<div>
				<span class="text-xs font-bold tracking-widest text-blue-400 uppercase">
					{playlist.tracks.length}-Song Curated Arc
				</span>
				<h2 id="story-tracks-heading" class="mt-0.5 text-2xl font-extrabold text-white">
					{playlist.bookUrl ? 'Chapter-by-Chapter Soundtrack' : 'Track-by-Track Evolution & Lore'}
				</h2>
			</div>
			<p class="text-xs text-slate-400">
				Click any track to stream in 128kbps or expand full lyrics &amp; liner notes
			</p>
		</div>

		<div class="space-y-4">
			{#each playlist.tracks as track, idx (track.id + '-' + idx)}
				{@const isPlayingThis =
					player.currentTrack.audioUrl === track.audioUrl && player.isPlaying}
				{@const isExpanded = expandedTrackId === track.id}
				<article
					class="overflow-hidden rounded-2xl border transition-all {isPlayingThis
						? 'border-blue-500 bg-blue-950/25 shadow-lg shadow-blue-950/40'
						: 'border-slate-800 bg-slate-900/85 hover:border-slate-700'}"
				>
					<div class="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
						<div class="flex items-start gap-4 min-w-0">
							<button
								type="button"
								onclick={() => playPlaylist(idx)}
								class="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold shadow-md transition-all {isPlayingThis
									? 'border-blue-400 bg-blue-600 text-white'
									: 'border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500 hover:bg-blue-600 hover:text-white'}"
								aria-label="Play {track.title}"
							>
								{#if isPlayingThis}
									<span>❚❚</span>
								{:else}
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z" />
									</svg>
								{/if}
							</button>

							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-extrabold text-blue-300"
									>
										{track.actLabel}
									</span>
									{#if track.pov}
										<span
											class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300"
										>
											POV: {track.pov}
										</span>
									{/if}
									<a
										href={resolve('/[artist]/[album]', { artist: track.artistSlug, album: track.albumSlug })}
										class="text-xs font-semibold text-slate-400 hover:text-blue-400 hover:underline"
									>
										From <em>{track.album}</em> ({track.year})
									</a>
								</div>

								<h3 class="text-lg font-extrabold text-white sm:text-xl">
									{idx + 1}. {track.title}
									{#if track.chapterTitle}
										<span class="text-sm font-medium text-amber-300">
											— "{track.chapterTitle}"
										</span>
									{/if}
								</h3>

								{#if track.storySummary}
									<p class="text-sm leading-relaxed text-slate-300">
										{track.storySummary}
									</p>
								{/if}
							</div>
						</div>

						<div class="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
							{#if track.audioUrl}
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={track.audioUrl}
									download="{track.fileName || track.id}.mp3"
									target="_blank"
									rel="noopener noreferrer"
									class="rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-white"
									title="Download raw 128kbps MP3 ({track.title}) — CC BY-SA 4.0"
								>
									⬇ MP3
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}

							{#if track.chapterUrl}
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={track.chapterUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25"
								>
									📖 Read Scene ↗
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}

							<button
								type="button"
								onclick={() => toggleExpandTrack(track.id)}
								class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white"
							>
								{isExpanded ? 'Hide Lyrics & Lore' : 'Lyrics & Lore'}
							</button>

							<button
								type="button"
								onclick={() =>
									playlistManager.openAddModal({
										artistSlug: track.artistSlug,
										albumSlug: track.albumSlug,
										trackId: track.id,
										title: track.title,
										artist: track.artist,
										album: track.album,
										artwork: track.artwork
									})}
								class="rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
								title="Add {track.title} to a custom playlist"
							>
								+ Playlist
							</button>

							<span class="ml-1 font-mono text-xs text-slate-400">{track.duration}</span>
						</div>
					</div>

					{#if isExpanded}
						<div class="grid gap-6 border-t border-slate-800 bg-slate-950/70 p-5 lg:grid-cols-2">
							{#if track.loreNote}
								<div class="space-y-2">
									<h4 class="text-xs font-bold tracking-wider text-amber-400 uppercase">
										Archival Liner Note
									</h4>
									<div class="whitespace-pre-line text-xs leading-relaxed text-slate-300 sm:text-sm">
										{track.loreNote}
									</div>
								</div>
							{/if}
							{#if track.lyrics}
								<div class="space-y-2">
									<h4 class="text-xs font-bold tracking-wider text-blue-400 uppercase">
										Official Lyrics
									</h4>
									<pre
										class="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300 sm:text-sm"
									>{track.lyrics}</pre>
								</div>
							{/if}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<!-- ===================================================================== -->
	<!-- CROSS-UNIVERSE ECHOES (JESSICA'S TRAIN RIDE & FREDDIE / PAIGE)        -->
	<!-- ===================================================================== -->
	{#if playlist.crossUniverseLinks && playlist.crossUniverseLinks.length > 0}
		<section class="space-y-4" aria-labelledby="cross-universe-heading">
			<div class="border-b border-slate-800 pb-3">
				<span class="text-xs font-bold tracking-widest text-amber-400 uppercase">
					Interconnected RaggieSoft Universe
				</span>
				<h2 id="cross-universe-heading" class="mt-0.5 text-2xl font-extrabold text-white">
					Where Characters Encounter This Story
				</h2>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{#each playlist.crossUniverseLinks as echo (echo.url)}
					<div
						class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
					>
						<div class="space-y-2.5">
							<span
								class="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-300"
							>
								{echo.label}
							</span>
							<h3 class="text-lg font-extrabold text-white">{echo.title}</h3>
							<p class="text-sm leading-relaxed text-slate-300">{echo.description}</p>
						</div>
						<div class="mt-4 pt-2">
							<a
								href={echo.url}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300 hover:text-amber-200 hover:underline"
							>
								<span>Explore Connected Story</span>
								<span>↗</span>
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if shareModalData}
	<ShareModal
		isOpen={Boolean(shareModalData)}
		onClose={() => (shareModalData = null)}
		title={shareModalData.title}
		subtitle={shareModalData.subtitle}
		description={shareModalData.description}
		url={shareModalData.url}
		socialPreview={shareModalData.socialPreview}
	/>
{/if}
