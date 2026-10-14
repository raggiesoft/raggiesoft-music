<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Album Dedicated Route: /[artist]/[album])
	 * ============================================================================
	 * Dedicated, crawlable album showcase view for Engine Room Records
	 * (`music.raggiesoft.com/$artist-slug/$album-slug`).
	 *
	 * Architecture & Design Decisions:
	 * 1. Hierarchical SEO URLs: Nested under `/[artist]/[album]` so shared links
	 *    immediately communicate both the band and the release, and chopping off
	 *    the album segment resolves cleanly to the artist's profile (`/[artist]`).
	 * 2. Social Crawler Optimization: Injects high-resolution 1200x630 Open Graph
	 *    and Twitter Card tags referencing the album's canonical `socialPreview` image,
	 *    along with rich Schema.org MusicAlbum JSON-LD metadata for search engines.
	 * 3. Persistent Audio Integration: Seamlessly hooks into the global Svelte 5
	 *    `player` store. Starting playback here retains state across navigation.
	 * 4. Rich Lore & Synchronized Lyrics: Surfaces track-level narrative lore and
	 *    official lyrics directly within the album context.
	 * 5. Book-Reader-Style Social Sharing: Includes `<ShareSection />` at the bottom
	 *    of the page with OpenGraph preview card, Facebook, Bluesky, Copy Link, and
	 *    Native Share.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { formatAlbumQueue } from '#lib/data/musicData.js';
	import ShareSection from '#lib/components/ShareSection.svelte';

	let { data } = $props();

	let album = $derived(data.album);
	let relatedAlbums = $derived(data.relatedAlbums);

	// Canonical URL for this hierarchical album route
	let canonicalUrl = $derived(`https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`);

	// Canonical Schema.org JSON-LD formatted string for search engines & structured data crawlers
	let jsonLdScript = $derived(
		`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'MusicAlbum',
			name: album.title,
			byArtist: {
				'@type': 'MusicGroup',
				name: album.artist,
				url: `https://music.raggiesoft.com/${album.artistSlug}`
			},
			genre: album.genre,
			albumProductionType:
				album.albumType === 'live'
					? 'https://schema.org/LiveAlbum'
					: album.albumType === 'compilation'
						? 'https://schema.org/CompilationAlbum'
						: album.albumType === 'soundtrack'
							? 'https://schema.org/SoundtrackAlbum'
							: 'https://schema.org/StudioAlbum',
			image: album.artwork,
			datePublished: album.datePublished || album.temporalCoverage || album.year,
			temporalCoverage: album.temporalCoverage,
			description: album.description,
			numTracks: album.totalTracksCount,
			url: `https://music.raggiesoft.com/${album.artistSlug}/${album.slug}`,
			track: album.tracks.map((t) => ({
				'@type': 'MusicRecording',
				name: t.title,
				position: t.track,
				isrcCode: t.isrc || undefined,
				duration: t.duration
			}))
		})}` +
			'</' +
			'script>'
	);

	// Group tracks by disc number for clean multi-disc presentation
	let discs = $derived.by(() => {
		/** @type {Record<number, any[]>} */
		const discMap = {};
		for (const track of album.tracks) {
			const dNum = track.disc || 1;
			if (!discMap[dNum]) {
				discMap[dNum] = [];
			}
			discMap[dNum].push(track);
		}
		return Object.entries(discMap).map(([discNumStr, tracks]) => ({
			discNum: Number(discNumStr),
			tracks
		}));
	});

	// Active track expanded for lore/lyrics accordion view
	let expandedTrackId = $state(/** @type {string | null} */ (null));

	/**
	 * Toggles lore and lyrics details for the specified track.
	 * @param {string} trackId
	 */
	function toggleTrackDetails(trackId) {
		expandedTrackId = expandedTrackId === trackId ? null : trackId;
	}

	/**
	 * Initiates continuous queue playback starting from the beginning of the album.
	 */
	function playAlbum() {
		const queue = formatAlbumQueue(album);
		if (queue.length > 0) {
			player.loadQueue(queue, 0, true);
		}
	}

	/**
	 * Plays a specific playable track from this album.
	 * @param {any} track
	 */
	function playTrack(track) {
		if (!track.isPlayable) return;
		const queue = formatAlbumQueue(album);
		const trackIndex = queue.findIndex(
			(t) => t.id === track.id || (t.isrc && t.isrc === track.isrc)
		);
		if (trackIndex !== -1) {
			player.loadQueue(queue, trackIndex, true);
		}
	}

	/**
	 * Checks if the given track is currently playing or loaded in the active player.
	 * @param {any} track
	 * @returns {boolean}
	 */
	function isCurrentTrack(track) {
		if (!player.currentTrack) return false;
		if (track.isrc && player.currentTrack.isrc) {
			return track.isrc === player.currentTrack.isrc;
		}
		return player.currentTrack.id === track.id;
	}
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{album.title} by {album.artist} | Engine Room Records</title>
	<meta name="title" content="{album.title} by {album.artist} | Engine Room Records" />
	<meta name="description" content={album.description} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="music.album" />
	<meta property="og:site_name" content="Engine Room Records" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content="{album.title} — {album.artist}" />
	<meta property="og:description" content={album.description} />
	<meta property="og:image" content={album.socialPreview} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{album.title} by {album.artist} - Social Preview" />
	<meta property="music:musician" content="https://music.raggiesoft.com/{album.artistSlug}" />
	<meta property="music:release_date" content={album.temporalCoverage || album.year} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content="{album.title} — {album.artist}" />
	<meta name="twitter:description" content={album.description} />
	<meta name="twitter:image" content={album.socialPreview} />
	<meta name="twitter:image:alt" content="{album.title} by {album.artist} - Social Preview" />

	<!-- Structured Data (JSON-LD) for Schema.org MusicAlbum -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<div class="space-y-10">
	<!-- Breadcrumb Navigation Bar -->
	<nav
		class="flex items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm"
		aria-label="Breadcrumb"
	>
		<a
			href={resolve('/discography')}
			class="flex items-center gap-1.5 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Discography
		</a>
		<span class="text-slate-600">/</span>
		<a
			href={resolve('/[artist]', { artist: album.artistSlug })}
			class="text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			{album.artist}
		</a>
		<span class="text-slate-600">/</span>
		<span class="truncate font-semibold text-slate-200">{album.title}</span>
	</nav>

	<!-- Album Hero Showcase Area -->
	<section
		class="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
	>
		<div class="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
			<!-- Artwork Container (with optional Play Overlay) -->
			<div
				class="group relative mx-auto h-64 w-64 shrink-0 overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl sm:h-72 sm:w-72 md:mx-0"
			>
				<img
					src={album.artwork}
					alt="Cover artwork for {album.title}"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>

				{#if album.status !== 'coming-soon'}
					<button
						onclick={playAlbum}
						class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
						aria-label="Play {album.title}"
					>
						<span
							class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110"
						>
							<svg class="h-8 w-8 translate-x-0.5 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</span>
					</button>
				{:else}
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<span
							class="rounded-full border border-amber-600/60 bg-amber-950/90 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-lg"
						>
							In Studio
						</span>
					</div>
				{/if}
			</div>

			<!-- Album Metadata & Synopsis -->
			<div class="flex flex-1 flex-col justify-between text-left">
				<div>
					<div class="mb-3 flex flex-wrap items-center gap-2">
						{#if album.isRockOpera}
							<span
								class="rounded-md border border-indigo-700/50 bg-indigo-900/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-300 uppercase shadow-sm"
							>
								Rock Opera ⚡
							</span>
						{/if}
						{#if album.albumType === 'live'}
							<span
								class="rounded-md border border-rose-600/50 bg-rose-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-rose-300 uppercase shadow-sm"
							>
								Live Album ⚡
							</span>
						{:else if album.albumType === 'compilation'}
							<span
								class="rounded-md border border-purple-600/50 bg-purple-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-purple-300 uppercase shadow-sm"
							>
								Compilation 💿
							</span>
						{:else if album.albumType === 'soundtrack'}
							<span
								class="rounded-md border border-teal-600/50 bg-teal-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-teal-300 uppercase shadow-sm"
							>
								Soundtrack 🎬
							</span>
						{:else}
							<span
								class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-slate-300 uppercase shadow-sm"
							>
								Studio Album 🎙️
							</span>
						{/if}
						{#if album.status === 'coming-soon'}
							<span
								class="rounded-md border border-amber-600/50 bg-amber-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-amber-300 uppercase shadow-sm"
							>
								Coming Soon
							</span>
						{:else if album.status === 'in-progress'}
							<span
								class="rounded-md border border-sky-600/50 bg-sky-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-sky-300 uppercase shadow-sm"
							>
								In Production ({album.playableTrackCount}/{album.totalTracksCount} Ready)
							</span>
						{:else}
							<span
								class="rounded-md border border-emerald-600/50 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-emerald-300 uppercase shadow-sm"
							>
								Released
							</span>
						{/if}
						<span class="font-mono text-xs font-semibold text-slate-400">
							{album.temporalCoverage || album.year} • {album.genre}
						</span>
					</div>

					<h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
						{album.title}
					</h1>

					<a
						href={resolve('/[artist]', { artist: album.artistSlug })}
						class="group/artist mt-2.5 inline-flex items-center gap-3"
					>
						{#if album.artistLogo}
							<img
								src={album.artistLogo}
								alt="{album.artist} logo badge"
								class="h-8 w-8 shrink-0 rounded-full border border-slate-700/80 bg-slate-950 object-cover shadow-md sm:h-9 sm:w-9"
							/>
						{/if}
						<span class="text-lg font-bold text-blue-400 group-hover/artist:underline sm:text-xl">
							{album.artist}
						</span>
					</a>

					<p class="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
						{album.description}
					</p>
				</div>

				<!-- Action Buttons Row -->
				<div class="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-6">
					{#if album.status === 'coming-soon'}
						<span
							class="flex cursor-not-allowed items-center gap-2 rounded-xl border border-amber-800/60 bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-300 select-none"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							In Production / Studio
						</span>
					{:else if album.status === 'in-progress'}
						<button
							onclick={playAlbum}
							class="flex items-center gap-2.5 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 transition-all hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
						>
							<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Available Preview ({album.playableTrackCount} Songs)
						</button>
					{:else}
						<button
							onclick={playAlbum}
							class="flex items-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
						>
							<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							Play Album ({album.totalTracksCount} Songs)
						</button>
					{/if}

					<!-- Share Album Button -->
					<a
						href="#share-album-section"
						class="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/>
						</svg>
						Share Album
					</a>

					<!-- Link to Artist Page -->
					<a
						href={resolve('/[artist]', { artist: album.artistSlug })}
						class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
					>
						{album.artist} Profile &rarr;
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Tracklist & Discography Sequence -->
	<section class="space-y-6">
		<div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
			<div>
				<h2 class="text-2xl font-bold tracking-tight text-white">Tracklist</h2>
				<p class="text-xs text-slate-400 sm:text-sm">
					{album.totalTracksCount} tracks • {album.playableTrackCount} streamable from Engine Room CDN
				</p>
			</div>
		</div>

		<div class="space-y-8">
			{#each discs as disc (disc.discNum)}
				<div
					class="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl"
				>
					{#if discs.length > 1}
						<div class="border-b border-slate-800 bg-slate-800/50 px-6 py-3">
							<span class="text-xs font-bold tracking-wider text-blue-400 uppercase">
								Disc {disc.discNum}
							</span>
						</div>
					{/if}

					<div class="divide-y divide-slate-800/60">
						{#each disc.tracks as track (track.id)}
							<div
								class="flex flex-col transition-colors {isCurrentTrack(track)
									? 'bg-blue-950/20'
									: 'hover:bg-slate-800/40'}"
							>
								<div class="flex items-center justify-between gap-4 p-4 sm:px-6">
									<div class="flex min-w-0 items-center gap-4">
										<!-- Track Number or Play Button -->
										{#if track.isPlayable}
											<button
												onclick={() => playTrack(track)}
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition-all hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isCurrentTrack(
													track
												)
													? 'bg-blue-600 text-white'
													: ''}"
												aria-label="Play {track.title}"
											>
												{#if isCurrentTrack(track) && player.isPlaying}
													<span class="text-xs">❚❚</span>
												{:else}
													<span class="translate-x-0.5 text-xs">▶</span>
												{/if}
											</button>
										{:else}
											<div
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-xs text-slate-500"
											>
												{track.track}
											</div>
										{/if}

										<div class="min-w-0">
											<div class="flex items-center gap-2">
												<h3
													class="truncate text-sm font-semibold {isCurrentTrack(track)
														? 'font-bold text-blue-400'
														: 'text-white'}"
												>
													{track.title}
												</h3>
												{#if !track.isPlayable}
													<span
														class="rounded border border-amber-800/60 bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 uppercase"
													>
														In Studio
													</span>
												{/if}
											</div>
											<div class="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
												{#if track.isrc}
													<span class="font-mono text-[11px] text-slate-400"
														>ISRC: {track.isrc}</span
													>
												{/if}
												{#if track.vttUrl}
													<span class="text-blue-400/80">• Synced Lyrics</span>
												{/if}
											</div>
										</div>
									</div>

									<div class="flex shrink-0 items-center gap-3">
										<span class="font-mono text-xs text-slate-400">{track.duration}</span>

										{#if track.loreNote || track.lyrics}
											<button
												onclick={() => toggleTrackDetails(track.id)}
												class="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
												aria-expanded={expandedTrackId === track.id}
											>
												{expandedTrackId === track.id ? 'Hide Lore' : 'Lore & Lyrics'}
											</button>
										{/if}
									</div>
								</div>

								<!-- Expandable Lore & Lyrics Accordion -->
								{#if expandedTrackId === track.id}
									<div class="space-y-4 border-t border-slate-800/60 bg-slate-950/70 p-5 sm:px-8">
										{#if track.loreNote}
											<div class="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4">
												<div
													class="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-400 uppercase"
												>
													<svg
														class="h-4 w-4"
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
													In-Universe Lore Note
												</div>
												<p
													class="text-sm leading-relaxed whitespace-pre-line text-slate-300 italic"
												>
													"{track.loreNote}"
												</p>
											</div>
										{/if}

										{#if track.lyrics}
											<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
												<div class="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
													Official Lyrics
												</div>
												<div
													class="max-h-80 overflow-y-auto pr-2 font-sans text-sm leading-relaxed whitespace-pre-line text-slate-300"
												>
													{track.lyrics}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Related Artist Releases Shelf -->
	{#if relatedAlbums.length > 0}
		<section class="space-y-4 border-t border-slate-800/80 pt-8">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold tracking-tight text-white">
					More by {album.artist}
				</h2>
				<a
					href={resolve('/[artist]', { artist: album.artistSlug })}
					class="text-xs font-semibold text-blue-400 hover:text-blue-300"
				>
					Full {album.artist} Discography &rarr;
				</a>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each relatedAlbums as rel (rel.id)}
					<a
						href={resolve('/[artist]/[album]', { artist: rel.artistSlug, album: rel.slug })}
						class="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-all hover:border-blue-600/60 hover:bg-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div
							class="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-800"
						>
							<img
								src={rel.artwork}
								alt="Cover artwork for {rel.title}"
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
						</div>
						<div class="mt-2.5 min-w-0">
							<h3
								class="truncate text-xs font-bold text-white group-hover:text-blue-400 sm:text-sm"
							>
								{rel.title}
							</h3>
							<p class="truncate text-[11px] text-slate-400">
								{rel.temporalCoverage || rel.year} • {rel.tracks.length} tracks
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Book-Reader Style Share Section for this Album -->
	<div id="share-album-section" class="pt-4">
		<ShareSection
			title={album.title}
			subtitle={album.artist}
			description={album.description}
			url={canonicalUrl}
			socialPreview={album.socialPreview}
			sharePrompt="Share this direct album link with friends. Social platforms will automatically display the custom 1200x630 OpenGraph preview card."
		/>
	</div>
</div>

