<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * src/routes/[artist]/[album]/[track]/+page.svelte
	 * ============================================================================
	 * Canonical pre-rendered HTML song page for The Listening Room
	 * (`https://music.raggiesoft.com/[artist]/[album]/[track]`).
	 *
	 * Architectural Responsibilities:
	 * 1. Authoritative Song Entity Destination:
	 *    - Renders the song's `<h1>` title, artist & album links, disc/track
	 *      position, runtime, genres, songwriter/producer credits, ISRC registry
	 *      link, dual chronology (`Narrative Release` vs. `Real-World DSP Release`
	 *      + `℗ 2026 Engine Room Records`), story lore, and full lyrics directly
	 *      in server-rendered static HTML.
	 * 2. Structured Data (`MusicRecording` + `BreadcrumbList` `@graph`):
	 *    - Emits Schema.org `MusicRecording` with ISO 8601 duration (`PT5M8S`),
	 *      `inAlbum`, `byArtist`, real-world `datePublished`, narrative
	 *      `temporalCoverage`, `isrcCode`, `recordLabel`, `creator`,
	 *      `copyrightHolder`, `sameAs` DSP URLs, and `BreadcrumbList`.
	 * 3. User-Initiated Preview & Lossless DSP Upgrade Actions:
	 *    - Streams the 128 kbps reference preview on click via the persistent
	 *      global `player` (zero audio preload on initial page load) alongside
	 *      prominent Spotify, Apple Music, Amazon Music, YouTube Music, and
	 *      Fourthwall links (`StoreButton`).
	 * 4. Rich Internal Link Graph:
	 *    - Connects previous/next album tracks, alternate studio/live recordings,
	 *      connected story playlists, same-era catalog releases, and the official
	 *      DSP Verification Ledger using standard crawlable `<a href>` anchors.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { playlistManager } from '#lib/playlists.svelte.js';
	import {
		buildSongFamilyComparisonQueue,
		formatAlbumQueue,
		formatReleaseDate,
		formatStardustMarkdown,
		hasAnyDsp,
		hasFourthwallStore
	} from '#lib/data/musicData.js';
	import { buildTrackJsonLdScript, buildTrackSeoMeta } from '#lib/seo.js';
	import ShareSection from '#lib/components/ShareSection.svelte';
	import StoreButton from '#lib/components/StoreButton.svelte';

	let { data } = $props();

	let album = $derived(data.album);
	let track = $derived(data.track);
	let prevTrack = $derived(data.prevTrack);
	let nextTrack = $derived(data.nextTrack);
	let relatedSongs = $derived(data.relatedSongs || []);
	let connectedPlaylists = $derived(data.connectedPlaylists || []);
	let sameEraAlbums = $derived(data.sameEraAlbums || []);

	let seo = $derived(buildTrackSeoMeta(track, album));
	let jsonLdScript = $derived(buildTrackJsonLdScript(track, album));

	let isMultiDisc = $derived(album.tracks.some((t) => (t.disc || 1) > 1));
	let positionSummary = $derived(
		isMultiDisc
			? `Disc ${track.disc || 1}, Track ${track.track}`
			: `Track ${track.track} of ${album.totalTracksCount}`
	);

	let dspVerificationHref = $derived(
		`https://engineroom.raggiesoft.com/dsp-verification/?artist=${encodeURIComponent(album.artistSlug)}&album=${encodeURIComponent(album.slug)}&track=${encodeURIComponent(track.fileName || track.slug || track.id)}`
	);

	let comparisonData = $derived(
		relatedSongs.length > 0
			? buildSongFamilyComparisonQueue(track, album)
			: { queue: [], startIndex: 0 }
	);

	/**
	 * Checks whether this track is currently loaded in the persistent audio player.
	 */
	let isActiveInPlayer = $derived.by(() => {
		if (!player.currentTrack) return false;
		if (track.isrc && player.currentTrack.isrc) {
			return track.isrc === player.currentTrack.isrc;
		}
		return player.currentTrack.id === track.id;
	});

	/**
	 * Starts or toggles user-initiated 128 kbps preview playback for this song,
	 * queuing the parent album so playback flows naturally to subsequent tracks.
	 */
	function togglePreviewTrack() {
		if (!track.isPlayable || !track.audioUrl) return;
		if (isActiveInPlayer) {
			player.togglePlay();
			return;
		}
		const queue = formatAlbumQueue(album);
		const idx = queue.findIndex(
			(item) => item.id === track.id || (item.isrc && item.isrc === track.isrc)
		);
		if (idx !== -1) {
			player.loadQueue(queue, idx, true);
		}
	}

	/**
	 * Queues all playable recordings in this song's family for chronological comparison.
	 */
	function compareAllVersions() {
		if (comparisonData.queue.length > 0) {
			player.loadQueue(comparisonData.queue, 0, true);
		}
	}

	/**
	 * Plays a specific alternate recording in the persistent audio player.
	 * @param {import('#lib/data/musicData.js').RelatedSongEntry} relEntry
	 */
	function playRelatedVersion(relEntry) {
		if (!relEntry?.track?.isPlayable) return;
		const { queue, startIndex } = buildSongFamilyComparisonQueue(relEntry.track, relEntry.album);
		if (queue.length > 0) {
			player.loadQueue(queue, startIndex, true);
		}
	}
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<link rel="canonical" href={seo.canonicalUrl} />

	<!-- Open Graph -->
	<meta property="og:type" content="music.song" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:url" content={seo.canonicalUrl} />
	<meta property="og:title" content={seo.ogTitle} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={album.socialPreview} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{seo.displayTitle} from {album.title} by {album.artist}" />
	<meta property="music:musician" content="https://music.raggiesoft.com/{album.artistSlug}" />
	<meta
		property="music:album"
		content="https://music.raggiesoft.com/{album.artistSlug}/{album.slug}"
	/>
	<meta property="music:album:disc" content={String(track.disc || 1)} />
	<meta property="music:album:track" content={String(track.track)} />
	<meta property="music:release_date" content={seo.releaseDate} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={seo.canonicalUrl} />
	<meta name="twitter:title" content={seo.ogTitle} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={album.socialPreview} />
	<meta
		name="twitter:image:alt"
		content="{seo.displayTitle} from {album.title} by {album.artist}"
	/>

	<!-- Structured Data (Schema.org MusicRecording + BreadcrumbList) -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<article class="space-y-10">
	<!-- Breadcrumb Navigation -->
	<nav
		class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm"
		aria-label="Breadcrumb"
	>
		<a
			href={resolve('/')}
			class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			Home
		</a>
		<span class="text-slate-600" aria-hidden="true">/</span>
		<a
			href={resolve('/discography')}
			class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			Discography
		</a>
		<span class="text-slate-600" aria-hidden="true">/</span>
		<a
			href={resolve('/[artist]', { artist: album.artistSlug })}
			class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			{album.artist}
		</a>
		<span class="text-slate-600" aria-hidden="true">/</span>
		<a
			href={resolve('/[artist]/[album]', { artist: album.artistSlug, album: album.slug })}
			class="transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			{album.title}
		</a>
		<span class="text-slate-600" aria-hidden="true">/</span>
		<span class="font-semibold text-slate-200">{seo.displayTitle}</span>
	</nav>

	<!-- =================================================================== -->
	<!-- SONG HERO HEADER                                                    -->
	<!-- =================================================================== -->
	<section
		class="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
	>
		<div class="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
			<!-- Album Artwork (LCP Hero Image with Explicit Dimensions & High Priority) -->
			<div
				class="group relative mx-auto h-60 w-60 shrink-0 overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl sm:h-72 sm:w-72 md:mx-0"
			>
				<a
					href={resolve('/[artist]/[album]', { artist: album.artistSlug, album: album.slug })}
					class="block h-full w-full"
					title="View full album {album.title} by {album.artist}"
				>
					<img
						src={album.artwork}
						alt="Album cover artwork for {album.title} by {album.artist}, featuring the song {seo.displayTitle}"
						width="600"
						height="600"
						fetchpriority="high"
						decoding="async"
						class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				</a>

				{#if track.isPlayable}
					<button
						type="button"
						onclick={togglePreviewTrack}
						class="absolute right-3 bottom-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
						aria-label="{isActiveInPlayer && player.isPlaying
							? 'Pause'
							: 'Play'} 128 kbps preview of {seo.displayTitle}"
					>
						{#if isActiveInPlayer && player.isPlaying}
							<span class="text-base font-black">❚❚</span>
						{:else}
							<svg
								class="h-7 w-7 translate-x-0.5 fill-current"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path d="M8 5v14l11-7z" />
							</svg>
						{/if}
					</button>
				{/if}
			</div>

			<!-- Song Title, Dual Chronology, Credits & Streaming Actions -->
			<div class="flex flex-1 flex-col justify-between text-left">
				<div>
					<div class="mb-3 flex flex-wrap items-center gap-2">
						<span
							class="rounded-md border border-blue-700/50 bg-blue-950/80 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-blue-300 uppercase"
						>
							{positionSummary}
						</span>
						<span
							class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-200"
						>
							{track.duration}
						</span>
						<span
							class="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300"
						>
							{album.genre}
						</span>
						{#if track.legacyTier}
							<span
								class="rounded-md border border-indigo-600/50 bg-indigo-950/70 px-2.5 py-0.5 text-xs font-bold tracking-wider text-indigo-300 uppercase"
							>
								{track.legacyTier}
							</span>
						{/if}
						{#if !track.isPlayable}
							<span
								class="rounded-md border border-amber-700/60 bg-amber-950/80 px-2.5 py-0.5 text-xs font-semibold text-amber-300 uppercase"
							>
								In Studio
							</span>
						{/if}
					</div>

					<!-- Single Primary H1 Song Title -->
					<h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
						{seo.displayTitle}
					</h1>

					<!-- Artist & Parent Album Links -->
					<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:text-base">
						<a
							href={resolve('/[artist]', { artist: album.artistSlug })}
							class="inline-flex items-center gap-2 font-bold text-blue-400 hover:underline"
						>
							{#if album.artistLogo}
								<img
									src={album.artistLogo}
									alt="{album.artist} emblem"
									width="28"
									height="28"
									decoding="async"
									class="h-7 w-7 shrink-0 rounded-full border border-slate-700/80 bg-slate-950 object-cover"
								/>
							{/if}
							<span>{album.artist}</span>
						</a>
						<span class="text-slate-600" aria-hidden="true">&bull;</span>
						<span class="text-slate-300">
							From the {album.albumTypeLabel?.toLowerCase() || 'album'}
							<a
								href={resolve('/[artist]/[album]', {
									artist: album.artistSlug,
									album: album.slug
								})}
								class="font-bold text-white underline decoration-slate-600 underline-offset-4 hover:text-blue-300 hover:decoration-blue-400"
							>
								{album.title}
							</a>
							{#if track.discName}
								<span class="text-slate-400">({track.discName})</span>
							{/if}
						</span>
					</div>

					<!-- Dual Chronology & Provenance Grid -->
					<dl
						class="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 text-xs sm:grid-cols-2 lg:grid-cols-3"
					>
						<div>
							<dt class="font-bold tracking-wider text-amber-300 uppercase">Narrative Release</dt>
							<dd class="mt-0.5 font-mono text-sm font-semibold text-white">
								{formatReleaseDate(album.temporalCoverage, album.year)}
							</dd>
							<dd class="text-[11px] text-slate-400">In-universe story era</dd>
						</div>
						<div>
							<dt class="font-bold tracking-wider text-emerald-300 uppercase">
								Real-World DSP Release
							</dt>
							<dd class="mt-0.5 font-mono text-sm font-semibold text-white">
								{formatReleaseDate(seo.releaseDate)}
							</dd>
							<dd class="text-[11px] text-slate-400">
								Sound recording: &#8471; 2026 Engine Room Records
							</dd>
						</div>
						<div>
							<dt class="font-bold tracking-wider text-blue-300 uppercase">
								Credits &amp; Registry
							</dt>
							<dd class="mt-0.5 text-slate-200">
								Created by <strong class="text-white">Michael P. Ragsdale</strong>
							</dd>
							<dd class="mt-0.5 text-[11px] text-slate-400">
								Label: Engine Room Records
								{#if track.isrc}
									&bull;
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									<a
										href="https://engineroom.raggiesoft.com/isrc?code={encodeURIComponent(
											track.isrc
										)}"
										target="_blank"
										rel="noopener noreferrer"
										class="font-mono text-amber-300 underline hover:text-white"
									>
										ISRC {track.isrc}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{/if}
							</dd>
						</div>
					</dl>

					<p class="mt-3 text-xs leading-relaxed text-slate-400">
						<strong class="text-slate-200">Dual Chronology Note:</strong>
						{album.artist} is a fictional band within the RaggieSoft story universe ({album.year} narrative
						setting). This commercial sound recording and its lyrics were produced and published in the
						real world in {seo.releaseDate.slice(0, 4)} by Michael P. Ragsdale under Engine Room Records.
					</p>
				</div>

				<!-- User-Initiated Preview + Official DSP & Fourthwall Actions -->
				<div class="mt-6 space-y-3 border-t border-slate-800/80 pt-5">
					<div class="flex flex-wrap items-center gap-3">
						<StoreButton
							type="album"
							size="large"
							spotifyId={album.spotifyId}
							appleId={album.appleId}
							amazonId={album.amazonId}
							youtubeId={album.youtubeId}
							dspExempt={album.dspExempt}
							storeStandardUrl={album.storeStandardUrl}
							storeAudiophileUrl={album.storeAudiophileUrl}
						/>

						{#if track.isPlayable && track.audioUrl}
							<button
								type="button"
								onclick={togglePreviewTrack}
								class="flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 {hasAnyDsp(
									album
								) || hasFourthwallStore(album)
									? 'border border-blue-500/50 bg-slate-900/90 text-blue-200 hover:border-blue-400 hover:bg-slate-800 hover:text-white'
									: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500'}"
							>
								{#if isActiveInPlayer && player.isPlaying}
									<span>❚❚ Pause Preview</span>
								{:else}
									<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
										<path d="M8 5v14l11-7z" />
									</svg>
									<span>Play Free Preview (128 kbps)</span>
								{/if}
							</button>

							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={track.audioUrl}
								download="{track.fileName || track.id}.mp3"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
								title="Download free 128 kbps MP3 of {seo.displayTitle} under CC BY-SA 4.0"
							>
								<span>⬇ Free 128 kbps MP3</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->

							<button
								type="button"
								onclick={() =>
									playlistManager.openAddModal({
										artistSlug: album.artistSlug,
										albumSlug: album.slug,
										trackId: track.id,
										title: track.title,
										artist: album.artist,
										album: album.title,
										artwork: album.artwork
									})}
								class="rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-emerald-500/50 hover:bg-slate-700 hover:text-white"
							>
								+ Add to Playlist
							</button>
						{:else}
							<span
								class="rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm font-semibold text-amber-300"
							>
								Audio Master Currently in Studio Production
							</span>
						{/if}

						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={dspVerificationHref}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 sm:text-sm"
						>
							Real-World DSP Verification &nearr;
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- PREVIOUS / NEXT TRACK SEQUENCE NAVIGATION                           -->
	<!-- =================================================================== -->
	<nav aria-label="Album track sequence navigation" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		{#if prevTrack && prevTrack.slug}
			<a
				href={resolve('/[artist]/[album]/[track]', {
					artist: album.artistSlug,
					album: album.slug,
					track: prevTrack.slug
				})}
				class="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-900"
			>
				<span class="font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase">
					&larr; Previous Song (Track {prevTrack.track})
				</span>
				<span class="mt-1 truncate text-sm font-bold text-white group-hover:text-blue-400">
					{prevTrack.title}{prevTrack.version ? ` (${prevTrack.version})` : ''}
				</span>
			</a>
		{:else}
			<div
				class="hidden items-center rounded-2xl border border-slate-800/40 bg-slate-950/40 p-4 text-xs text-slate-500 sm:flex"
			>
				Opening track on {album.title}
			</div>
		{/if}

		<a
			href={resolve('/[artist]/[album]', { artist: album.artistSlug, album: album.slug })}
			class="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-blue-500/50 hover:bg-slate-900"
		>
			<span class="font-mono text-[11px] font-bold tracking-wider text-blue-400 uppercase">
				Full Album Tracklist
			</span>
			<span class="mt-1 truncate text-sm font-bold text-white">
				{album.title} ({album.totalTracksCount} Songs)
			</span>
		</a>

		{#if nextTrack && nextTrack.slug}
			<a
				href={resolve('/[artist]/[album]/[track]', {
					artist: album.artistSlug,
					album: album.slug,
					track: nextTrack.slug
				})}
				class="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-right transition-all hover:border-blue-500/50 hover:bg-slate-900"
			>
				<span class="font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase">
					Next Song (Track {nextTrack.track}) &rarr;
				</span>
				<span class="mt-1 truncate text-sm font-bold text-white group-hover:text-blue-400">
					{nextTrack.title}{nextTrack.version ? ` (${nextTrack.version})` : ''}
				</span>
			</a>
		{:else}
			<div
				class="hidden items-center justify-end rounded-2xl border border-slate-800/40 bg-slate-950/40 p-4 text-xs text-slate-500 sm:flex"
			>
				Closing track on {album.title}
			</div>
		{/if}
	</nav>

	<!-- =================================================================== -->
	<!-- SONG LORE & OFFICIAL LYRICS                                         -->
	<!-- =================================================================== -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- Story & Production Context Column -->
		<section class="space-y-6 lg:col-span-5">
			<div class="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 shadow-xl">
				<h2 class="text-lg font-extrabold tracking-tight text-indigo-300 uppercase sm:text-xl">
					Song Story &amp; Lore Context
				</h2>
				{#if track.loreNote}
					<!-- eslint-disable svelte/no-at-html-tags -->
					<div class="er-lore-prose mt-3 text-sm leading-relaxed text-slate-200">
						{@html track.loreNoteHtml || formatStardustMarkdown(track.loreNote)}
					</div>
					<!-- eslint-enable svelte/no-at-html-tags -->
				{:else}
					<p class="mt-3 text-sm leading-relaxed text-slate-300">
						<strong>{seo.displayTitle}</strong> appears as {positionSummary.toLowerCase()} on
						<a
							href={resolve('/[artist]/[album]', {
								artist: album.artistSlug,
								album: album.slug
							})}
							class="font-semibold text-blue-300 underline hover:text-white"
						>
							{album.title}
						</a>
						({formatReleaseDate(album.temporalCoverage, album.year)} narrative era) by
						<a
							href={resolve('/[artist]', { artist: album.artistSlug })}
							class="font-semibold text-blue-300 underline hover:text-white"
						>
							{album.artist}
						</a>. {album.description}
					</p>
				{/if}

				{#if album.loreLinks && album.loreLinks.length > 0}
					<div class="mt-5 border-t border-indigo-500/20 pt-4">
						<h3 class="text-xs font-bold tracking-wider text-indigo-300 uppercase">
							Connected Books &amp; Lore Archives
						</h3>
						<div class="mt-2.5 flex flex-wrap gap-2">
							{#each album.loreLinks as loreLink (loreLink.url)}
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={loreLink.url}
									target={loreLink.url.startsWith('http') ? '_blank' : undefined}
									rel={loreLink.url.startsWith('http') ? 'noopener noreferrer' : undefined}
									class="rounded-lg border border-indigo-500/40 bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:text-white"
								>
									{loreLink.label} &nearr;
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/each}
						</div>
					</div>
				{:else if album.loreUrl || album.artistLoreUrl}
					<div class="mt-5 border-t border-indigo-500/20 pt-4">
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={album.loreUrl || album.artistLoreUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 underline hover:text-white"
						>
							<span>Explore Official {album.artist} Story Archive</span>
							<span>&nearr;</span>
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
				{/if}
			</div>

			{#if connectedPlaylists.length > 0}
				<div class="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-6 shadow-xl">
					<h2 class="text-base font-extrabold tracking-tight text-emerald-300 uppercase">
						Featured in Story Playlists
					</h2>
					<div class="mt-3 space-y-3">
						{#each connectedPlaylists as pl (pl.slug)}
							<a
								href={resolve('/playlists/[slug]', { slug: pl.slug })}
								class="block rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 transition-colors hover:border-emerald-500/50 hover:bg-slate-900"
							>
								<div class="text-sm font-bold text-white">{pl.title}</div>
								{#if pl.actLabel || pl.chapterTitle}
									<div class="mt-0.5 text-xs font-medium text-emerald-300">
										{pl.actLabel}{pl.chapterTitle ? ` — ${pl.chapterTitle}` : ''}
									</div>
								{/if}
								<div class="mt-1 text-xs text-slate-400">{pl.subtitle}</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<!-- Official Lyrics Column -->
		<section class="lg:col-span-7">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl sm:p-8">
				<div
					class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4"
				>
					<div>
						<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
							Official Lyrics
						</h2>
						<p class="mt-0.5 text-xs text-slate-400">
							Written by Michael P. Ragsdale &bull; Licensed under CC BY-SA 4.0
						</p>
					</div>
					{#if track.vttUrl}
						<span
							class="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300"
						>
							Time-Synced Lyrics Available in Player
						</span>
					{/if}
				</div>

				{#if track.lyrics}
					<!-- eslint-disable svelte/no-at-html-tags -->
					<div
						class="er-lyrics-prose mt-5 font-sans text-sm leading-relaxed text-slate-200 sm:text-base"
					>
						{@html track.lyricsHtml || formatStardustMarkdown(track.lyrics)}
					</div>
					<!-- eslint-enable svelte/no-at-html-tags -->
				{:else}
					<p class="mt-5 text-sm leading-relaxed text-slate-400">
						{#if track.duration === 'In Studio'}
							Lyrics and studio master recording for <strong>{seo.displayTitle}</strong> are currently
							in production at Engine Room Records.
						{:else}
							Instrumental recording or lyrics transcript pending publication for
							<strong>{seo.displayTitle}</strong>.
						{/if}
					</p>
				{/if}
			</div>
		</section>
	</div>

	<!-- =================================================================== -->
	<!-- RELATED RECORDINGS & ALTERNATE VERSIONS                             -->
	<!-- =================================================================== -->
	{#if relatedSongs.length > 0}
		<section
			class="space-y-4 rounded-2xl border border-purple-500/40 bg-purple-950/15 p-6 shadow-xl"
		>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-xl font-bold tracking-tight text-white">
						Alternate Versions &amp; Related Recordings ({relatedSongs.length})
					</h2>
					<p class="text-xs text-slate-300 sm:text-sm">
						Compare studio masters, demos, remixes, and live concert performances of this song
						across the Engine Room Records catalog.
					</p>
				</div>

				{#if comparisonData.queue.length > 1}
					<button
						type="button"
						onclick={compareAllVersions}
						class="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-colors hover:bg-purple-500 sm:text-sm"
					>
						▶ Compare All {comparisonData.queue.length} Playable Versions
					</button>
				{/if}
			</div>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#each relatedSongs as rel (rel.key)}
					<div
						class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 transition-colors hover:border-purple-500/40"
					>
						<div class="flex min-w-0 items-center gap-3">
							<img
								src={rel.album.artwork}
								alt="Cover artwork for {rel.album.title} by {rel.album.artist}"
								width="48"
								height="48"
								loading="lazy"
								decoding="async"
								class="h-12 w-12 shrink-0 rounded-lg border border-slate-700 object-cover"
							/>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-1.5">
									<span
										class="rounded border border-purple-500/40 bg-purple-950/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-purple-200 uppercase"
									>
										{rel.releaseYear} &bull; {rel.versionLabel}
									</span>
									{#if rel.sharedMasterLabel}
										<span
											class="rounded border border-emerald-600/50 bg-emerald-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
										>
											{rel.sharedMasterLabel}
										</span>
									{/if}
								</div>
								<div class="mt-1 truncate text-sm font-bold text-white">
									{#if rel.track.slug}
										<a
											href={resolve('/[artist]/[album]/[track]', {
												artist: rel.album.artistSlug,
												album: rel.album.slug,
												track: rel.track.slug
											})}
											class="hover:text-blue-400 hover:underline"
										>
											{rel.track.title}
										</a>
									{:else}
										{rel.track.title}
									{/if}
								</div>
								<div class="truncate text-xs text-slate-400">
									<a
										href={resolve('/[artist]/[album]', {
											artist: rel.album.artistSlug,
											album: rel.album.slug
										})}
										class="hover:text-slate-200 hover:underline"
									>
										{rel.album.title}
									</a>
									({rel.album.artist})
								</div>
							</div>
						</div>

						<div class="flex shrink-0 items-center gap-2">
							{#if rel.track.isPlayable}
								<button
									type="button"
									onclick={() => playRelatedVersion(rel)}
									class="rounded-lg border border-blue-500/50 bg-blue-950/60 px-2.5 py-1.5 text-xs font-bold text-blue-200 transition-colors hover:bg-blue-600 hover:text-white"
								>
									▶ Play
								</button>
							{/if}
							{#if rel.track.slug}
								<a
									href={resolve('/[artist]/[album]/[track]', {
										artist: rel.album.artistSlug,
										album: rel.album.slug,
										track: rel.track.slug
									})}
									class="rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
								>
									Song &rarr;
								</a>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- =================================================================== -->
	<!-- APPEARS IN THE SAME NARRATIVE ERA                                   -->
	<!-- =================================================================== -->
	{#if sameEraAlbums.length > 0}
		<section class="space-y-4 border-t border-slate-800/80 pt-8">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold tracking-tight text-white">
						From the Same Narrative Era ({album.year})
					</h2>
					<p class="text-xs text-slate-400">
						Explore contemporary releases across the Engine Room Records story timeline
					</p>
				</div>
				<a
					href={resolve('/discography')}
					class="text-xs font-semibold text-blue-400 hover:text-blue-300"
				>
					Full Label Timeline &rarr;
				</a>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{#each sameEraAlbums as eraAlbum (eraAlbum.id)}
					<a
						href={resolve('/[artist]/[album]', {
							artist: eraAlbum.artistSlug,
							album: eraAlbum.slug
						})}
						class="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-all hover:border-blue-600/60 hover:bg-slate-900"
					>
						<div class="aspect-square w-full overflow-hidden rounded-lg border border-slate-800">
							<img
								src={eraAlbum.artwork}
								alt="Cover artwork for {eraAlbum.title} by {eraAlbum.artist}"
								width="300"
								height="300"
								loading="lazy"
								decoding="async"
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
						</div>
						<div class="mt-2.5 min-w-0">
							<h3
								class="truncate text-xs font-bold text-white group-hover:text-blue-400 sm:text-sm"
							>
								{eraAlbum.title}
							</h3>
							<p class="truncate text-[11px] text-slate-400">
								{eraAlbum.artist} &bull; {eraAlbum.year}
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Share Song Section -->
	<div id="share-song-section" class="pt-4">
		<ShareSection
			title={seo.displayTitle}
			subtitle="{album.artist} — {album.title}"
			description={seo.description}
			url={seo.canonicalUrl}
			socialPreview={album.socialPreview}
			sharePrompt="Share this song's lyrics, lore, and preview link with friends."
		/>
	</div>
</article>
