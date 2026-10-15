<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (The Listening Room Radio Route: /radio)
	 * ============================================================================
	 * Dedicated continuous broadcast console for Engine Room Records
	 * (`music.raggiesoft.com/radio`), migrated and enhanced from the legacy
	 * `raggiesoft-hub/pages/engine-room/radio.php` station.
	 *
	 * Architectural Guarantees:
	 * 1. Rock Opera & Multi-Album Rock Opera Series Integrity:
	 *    - Powered by `buildRadioBroadcast()`, which deduplicates all catalog tracks
	 *      by canonical ISRC (`isrc.trim().toUpperCase()`), glues multi-album Rock
	 *      Opera Series (`rockOperaSetId`, such as The Paper Wall's `Guiding Stars` ->
	 *      `Static & Silence Book 1` -> `Static & Silence Book 2` and `The Eleventh
	 *      Child Book 1` -> `Book 2`) into unbroken chronological narrative blocks,
	 *      glues single-album Rock Operas (`isRockOpera === true`) into unbroken
	 *      album blocks, and shuffles at the block level.
	 *    - Disables random per-track jumping (`player.isShuffle = false`) and enables
	 *      continuous loop (`player.repeatMode = 'all'`) when the broadcast is active
	 *      so Rock Operas are never broken apart mid-story.
	 * 2. Gentle, Non-Interrupting DSP & Fourthwall Nudge:
	 *    - Displays a live, non-blocking companion card for the currently playing
	 *      (or queued) broadcast track with `<StoreButton />` and Fourthwall links.
	 *    - Opening a DSP link or Fourthwall digital archive opens in a new tab and
	 *      NEVER pauses or interrupts the active radio stream.
	 * 3. Estimated Block Time & Reality Check:
	 *    - Computes and displays the exact Days, Hours, and Minutes required to
	 *      listen to the entire deduplicated broadcast from start to finish, paired
	 *      with the classic Engine Room Records reality-check comparison.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import {
		allAlbums,
		buildRadioBroadcast,
		hasAnyDsp,
		hasFourthwallStore
	} from '#lib/data/musicData.js';
	import StoreButton from '#lib/components/StoreButton.svelte';
	import ShareModal from '#lib/components/ShareModal.svelte';
	import ShareSection from '#lib/components/ShareSection.svelte';

	let broadcast = $state(buildRadioBroadcast(allAlbums));
	let shareModalData = $state(/** @type {any} */ (null));
	let searchFilter = $state('');

	// Determine whether the global player is currently playing from the radio queue
	let isRadioActive = $derived(
		player.queue.length > 0 &&
			broadcast.tracks.length > 0 &&
			player.queue.length === broadcast.tracks.length &&
			player.queue[0]?.id === broadcast.tracks[0]?.id
	);

	// The track to highlight in the Broadcast Companion & DSP Nudge card:
	// Uses `player.currentTrack` if a track is loaded, otherwise previews the first track of the broadcast.
	let activeCompanionTrack = $derived(
		player.currentTrack?.id ? player.currentTrack : broadcast.tracks[0] || null
	);

	// Look up the matching radio queue entry so we can display Rock Opera Series progress badges
	let activeRadioQueueEntry = $derived(
		activeCompanionTrack
			? broadcast.tracks.find((t) => t.id === activeCompanionTrack.id) || activeCompanionTrack
			: null
	);

	// Filterable view of the broadcast queue for quick navigation
	let filteredQueue = $derived.by(() => {
		const q = searchFilter.trim().toLowerCase();
		return broadcast.tracks
			.map((track, index) => ({ track, index }))
			.filter(({ track }) => {
				if (!q) return true;
				return (
					track.title.toLowerCase().includes(q) ||
					track.artist.toLowerCase().includes(q) ||
					track.album.toLowerCase().includes(q) ||
					(track.radioBlockTitle && track.radioBlockTitle.toLowerCase().includes(q)) ||
					(track.isrc && track.isrc.toLowerCase().includes(q))
				);
			});
	});

	/**
	 * Starts or resumes the Engine Room Radio broadcast at a given queue index.
	 * Forces sequential block playback (`isShuffle = false`, `repeatMode = 'all'`)
	 * so Rock Operas and Rock Opera Series play in unbroken narrative order.
	 *
	 * @param {number} [startIndex=0]
	 */
	function startRadioBroadcast(startIndex = 0) {
		if (broadcast.tracks.length === 0) return;
		player.isShuffle = false;
		player.repeatMode = 'all';
		player.loadQueue(broadcast.tracks, startIndex, true);
	}

	/**
	 * Toggles playback of the active radio broadcast.
	 */
	function toggleRadioPlay() {
		if (isRadioActive && player.currentTrack?.audioUrl) {
			player.togglePlay();
		} else {
			startRadioBroadcast(0);
		}
	}

	/**
	 * Generates a fresh Rock-Opera-preserving Fisher-Yates block shuffle and
	 * immediately loads it into the player if the radio is active.
	 */
	function reshuffleBroadcast() {
		broadcast = buildRadioBroadcast(allAlbums);
		if (player.isPlaying || isRadioActive) {
			startRadioBroadcast(0);
		}
	}

	/**
	 * Jumps directly to the first track of a specific Rock Opera or Rock Opera Series
	 * block within the current broadcast queue.
	 *
	 * @param {string} blockTitle
	 */
	function jumpToOperaBlock(blockTitle) {
		const targetIndex = broadcast.tracks.findIndex((t) => t.radioBlockTitle === blockTitle);
		if (targetIndex !== -1) {
			startRadioBroadcast(targetIndex);
		}
	}

	/**
	 * Formats duration seconds into `Xh Ym` for Rock Opera block badges.
	 * @param {number} secs
	 * @returns {string}
	 */
	function formatBlockDuration(secs) {
		const hrs = Math.floor(secs / 3600);
		const mins = Math.max(1, Math.round((secs % 3600) / 60));
		return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
	}
</script>

<svelte:head>
	<title>The Listening Room Radio | Engine Room Records</title>
	<meta
		name="description"
		content="Tune into The Listening Room Radio on Engine Room Records. An uninterrupted, ISRC-deduplicated catalog broadcast that preserves full Rock Operas and multi-album Rock Opera Series in exact narrative order."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:title" content="The Listening Room Radio | Engine Room Records" />
	<meta
		property="og:description"
		content="Stream the entire Engine Room Records catalog in one continuous broadcast that respects both standalone Rock Operas and multi-album Rock Opera Series."
	/>
	<meta property="og:url" content="https://music.raggiesoft.com/radio" />
	<meta property="og:image" content="https://music.raggiesoft.com/og-radio.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="The Listening Room Radio — Engine Room Records Broadcast Booth"
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="The Listening Room Radio | Engine Room Records" />
	<meta
		name="twitter:description"
		content="Continuous catalog radio broadcast that keeps Rock Operas and multi-album Rock Opera Series intact in chronological narrative order."
	/>
	<meta name="twitter:image" content="https://music.raggiesoft.com/og-radio.jpg" />
</svelte:head>

<div class="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
	<!-- =================================================================== -->
	<!-- 1. BROADCAST CONSOLE HERO & ESTIMATED BLOCK TIME                    -->
	<!-- =================================================================== -->
	<section
		class="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 p-6 shadow-2xl sm:p-10"
		aria-labelledby="radio-hero-heading"
	>
		<div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
			<!-- Left Column: Station Identity & Controls -->
			<div class="space-y-5 lg:col-span-7">
				<div class="flex flex-wrap items-center gap-2.5">
					<span
						class="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-950/70 px-3 py-1 text-xs font-extrabold tracking-widest text-red-300 uppercase shadow-sm"
					>
						<span
							class="h-2 w-2 rounded-full {isRadioActive && player.isPlaying
								? 'animate-ping bg-red-400'
								: 'bg-red-500'}"
						></span>
						<span>{isRadioActive && player.isPlaying ? 'On Air • Broadcasting' : 'Station Ready'}</span>
					</span>

					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-300"
					>
						<span>🎭</span>
						<span>Rock Opera &amp; Series Lock Enabled</span>
					</span>

					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-xs font-semibold text-slate-300"
					>
						<span>{broadcast.stats.totalTracks} Unique ISRCs</span>
					</span>
				</div>

				<div>
					<h1
						id="radio-hero-heading"
						class="text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
					>
						The Listening Room Radio
					</h1>
					<p class="mt-3 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
						A continuous, commercial-free 128kbps discovery broadcast spanning the entire
						<strong class="text-white">Engine Room Records</strong> vault. Standalone studio and live
						tracks are shuffled freely, while <strong class="text-amber-300">Rock Operas</strong> and
						multi-album <strong class="text-amber-300">Rock Opera Series</strong> (like
						<em>Guiding Stars → Static &amp; Silence Book 1 &amp; Book 2</em> and
						<em>The Eleventh Child Book 1 &amp; Book 2</em>) remain glued together in unbroken
						narrative sequence.
					</p>
				</div>

				<!-- Primary Broadcast Action Buttons -->
				<div class="flex flex-wrap items-center gap-3 pt-2">
					<button
						type="button"
						onclick={toggleRadioPlay}
						class="inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 sm:text-base"
					>
						{#if isRadioActive && player.isPlaying}
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
							</svg>
							<span>Pause Broadcast</span>
						{:else if isRadioActive}
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							<span>Resume Broadcast</span>
						{:else}
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
							<span>Tune In &amp; Start Broadcast</span>
						{/if}
					</button>

					<button
						type="button"
						onclick={reshuffleBroadcast}
						class="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/90 px-5 py-3.5 text-sm font-bold text-slate-200 transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						title="Generate a new block-level shuffle while keeping Rock Operas and Series intact"
					>
						<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<span>Reshuffle Broadcast Blocks</span>
					</button>

					<button
						type="button"
						onclick={() =>
							(shareModalData = {
								title: 'The Listening Room Radio',
								subtitle: 'Engine Room Records',
								description:
									'Tune into The Listening Room Radio on Engine Room Records! Full catalog broadcast with unbroken Rock Operas and Rock Opera Series.',
								url: 'https://music.raggiesoft.com/radio',
								socialPreview: 'https://music.raggiesoft.com/og-radio.jpg'
							})}
						class="inline-flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
					>
						<span>🔗</span>
						<span>Share Station</span>
					</button>
				</div>
			</div>

			<!-- Right Column: Estimated Block Time & Reality Check Panel -->
			<div class="lg:col-span-5">
				<div
					class="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 text-center shadow-inner"
				>
					<span
						class="block font-mono text-xs font-extrabold tracking-widest text-slate-400 uppercase"
					>
						Estimated Full-Catalog Block Time
					</span>

					<div class="my-5 flex items-center justify-center gap-6 sm:gap-8">
						{#if broadcast.stats.days > 0}
							<div>
								<span class="block font-mono text-4xl font-extrabold text-amber-400 sm:text-5xl">
									{broadcast.stats.days}
								</span>
								<span class="mt-1 block text-xs font-bold tracking-wider text-slate-400 uppercase">
									{broadcast.stats.days === 1 ? 'Day' : 'Days'}
								</span>
							</div>
						{/if}

						<div>
							<span class="block font-mono text-4xl font-extrabold text-blue-400 sm:text-5xl">
								{broadcast.stats.hours}
							</span>
							<span class="mt-1 block text-xs font-bold tracking-wider text-slate-400 uppercase">
								{broadcast.stats.hours === 1 ? 'Hour' : 'Hours'}
							</span>
						</div>

						<div>
							<span class="block font-mono text-4xl font-extrabold text-emerald-400 sm:text-5xl">
								{broadcast.stats.minutes}
							</span>
							<span class="mt-1 block text-xs font-bold tracking-wider text-slate-400 uppercase">
								{broadcast.stats.minutes === 1 ? 'Minute' : 'Minutes'}
							</span>
						</div>
					</div>

					<div class="border-t border-slate-800/80 pt-4 text-left">
						<p class="text-xs leading-relaxed text-slate-300">
							<span class="mr-1 text-amber-400">✈️</span>
							<strong class="text-white">Reality Check:</strong>
							<span class="italic">{broadcast.stats.realityCheck}</span>
						</p>
						<p class="mt-2 text-[11px] text-slate-400">
							Deduplicated by ISRC across all studio albums, rock operas, live recordings, and vault
							compilations so you never hear the same master recording twice in one cycle.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 2. GENTLE NON-INTERRUPTING DSP & ARCHIVE COMPANION CARD             -->
	<!-- =================================================================== -->
	{#if activeCompanionTrack}
		<section
			class="rounded-3xl border border-blue-500/30 bg-slate-900/90 p-6 shadow-xl"
			aria-labelledby="dsp-companion-heading"
		>
			<div class="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
				<!-- Currently Playing / Queued Track Summary -->
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-6">
					<div class="relative shrink-0">
						{#if activeCompanionTrack.artwork}
							<img
								src={activeCompanionTrack.artwork}
								alt="Cover art for {activeCompanionTrack.album}"
								class="h-24 w-24 rounded-2xl border border-slate-700 object-cover shadow-lg sm:h-28 sm:w-28"
							/>
						{/if}
						{#if player.isPlaying && player.currentTrack?.id === activeCompanionTrack.id}
							<span
								class="absolute -top-2 -right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase shadow"
							>
								Live
							</span>
						{/if}
					</div>

					<div class="min-w-0 space-y-1.5">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="rounded-md border border-blue-500/40 bg-blue-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300 uppercase"
							>
								{player.currentTrack?.id === activeCompanionTrack.id
									? 'Now Playing on Radio'
									: 'Queued First on Radio'}
							</span>

							{#if activeRadioQueueEntry?.radioBlockType === 'series'}
								<span
									class="rounded-md border border-amber-500/40 bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-300"
								>
									🎭 Rock Opera Series ({activeRadioQueueEntry.radioBlockTrackIndex} of {activeRadioQueueEntry.radioBlockTrackCount})
								</span>
							{:else if activeRadioQueueEntry?.radioBlockType === 'opera'}
								<span
									class="rounded-md border border-purple-500/40 bg-purple-950/70 px-2 py-0.5 text-[10px] font-bold text-purple-300"
								>
									🎭 Full Rock Opera ({activeRadioQueueEntry.radioBlockTrackIndex} of {activeRadioQueueEntry.radioBlockTrackCount})
								</span>
							{/if}
						</div>

						<h2 id="dsp-companion-heading" class="truncate text-xl font-extrabold text-white">
							{activeCompanionTrack.title}
						</h2>

						<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
							{#if activeCompanionTrack.artistSlug}
								<a
									href={resolve('/[artist]', { artist: activeCompanionTrack.artistSlug })}
									class="font-bold text-blue-400 hover:underline"
								>
									{activeCompanionTrack.artist}
								</a>
							{:else}
								<span class="font-bold text-blue-400">{activeCompanionTrack.artist}</span>
							{/if}
							<span class="text-slate-600">•</span>
							{#if activeCompanionTrack.artistSlug && activeCompanionTrack.albumSlug}
								<a
									href={resolve('/[artist]/[album]', {
										artist: activeCompanionTrack.artistSlug,
										album: activeCompanionTrack.albumSlug
									})}
									class="text-slate-300 hover:text-white hover:underline"
								>
									{activeCompanionTrack.album}
								</a>
							{:else}
								<span>{activeCompanionTrack.album}</span>
							{/if}
						</div>

						{#if activeRadioQueueEntry?.radioBlockTitle}
							<p class="text-xs font-medium text-amber-300/90">
								Narrative Sequence: {activeRadioQueueEntry.radioBlockTitle}
							</p>
						{/if}
					</div>
				</div>

				<!-- Gentle Non-Blocking DSP & Fourthwall Support Box -->
				<div
					class="rounded-2xl border border-slate-800 bg-slate-950/85 p-5 shadow-inner lg:col-span-6"
				>
					<div class="mb-2 flex items-center justify-between gap-2">
						<span class="text-xs font-extrabold tracking-wider text-emerald-400 uppercase">
							🎧 Lossless DSP &amp; Vault Companion • Never Stops Playback
						</span>
					</div>

					<p class="mb-4 text-xs leading-relaxed text-slate-300">
						The Listening Room Radio streams our <strong>128kbps web preview</strong> continuously without
						interruptions. Love what’s playing right now? Open
						<strong class="text-white">{activeCompanionTrack.album}</strong> in lossless/high-res on your
						preferred streaming service or grab the DRM-free digital archive on Fourthwall to support
						<strong class="text-blue-300">Michael Ragsdale</strong>—links open in a new tab so your
						radio broadcast keeps playing.
					</p>

					{#if hasAnyDsp(activeCompanionTrack) || hasFourthwallStore(activeCompanionTrack)}
						<div class="flex flex-wrap items-center gap-3">
							<StoreButton
								type="album"
								size="small"
								spotifyId={activeCompanionTrack.spotifyId}
								appleId={activeCompanionTrack.appleId}
								amazonId={activeCompanionTrack.amazonId}
								youtubeId={activeCompanionTrack.youtubeId}
								dspExempt={activeCompanionTrack.dspExempt}
								storeStandardUrl={activeCompanionTrack.storeStandardUrl}
								storeAudiophileUrl={activeCompanionTrack.storeAudiophileUrl}
							/>

							<button
								type="button"
								onclick={() => {
									player.drawerTab = 'lyrics-lore';
									player.isExpanded = true;
								}}
								class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-blue-500 hover:text-white"
							>
								<span>📖</span>
								<span>Read Lyrics &amp; Lore</span>
							</button>
						</div>
					{:else if activeCompanionTrack.dspNotice}
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-amber-300/90 italic">{activeCompanionTrack.dspNotice}</p>
							<button
								type="button"
								onclick={() => {
									player.drawerTab = 'lyrics-lore';
									player.isExpanded = true;
								}}
								class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-blue-500 hover:text-white"
							>
								<span>📖</span>
								<span>Read Lyrics &amp; Lore</span>
							</button>
						</div>
					{:else}
						<div class="flex flex-wrap items-center gap-3">
							{#if activeCompanionTrack.artistSlug && activeCompanionTrack.albumSlug}
								<a
									href={resolve('/[artist]/[album]', {
										artist: activeCompanionTrack.artistSlug,
										album: activeCompanionTrack.albumSlug
									})}
									class="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/60 px-3.5 py-1.5 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-900/60 hover:text-white"
								>
									<span>💿</span>
									<span>Explore Full Album Page</span>
								</a>
							{/if}
							<button
								type="button"
								onclick={() => {
									player.drawerTab = 'lyrics-lore';
									player.isExpanded = true;
								}}
								class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-blue-500 hover:text-white"
							>
								<span>📖</span>
								<span>Read Lyrics &amp; Lore</span>
							</button>
						</div>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<!-- =================================================================== -->
	<!-- 3. PROTECTED ROCK OPERA SERIES & NARRATIVE BLOCKS                   -->
	<!-- =================================================================== -->
	{#if broadcast.operaBlocks.length > 0}
		<section class="space-y-4" aria-labelledby="opera-blocks-heading">
			<div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
				<div>
					<h2 id="opera-blocks-heading" class="text-xl font-extrabold tracking-tight text-white">
						Protected Rock Opera &amp; Multi-Album Series Blocks
					</h2>
					<p class="text-sm text-slate-400">
						Whenever the radio shuffler lands on one of these narrative works, it locks the station
						into chronological sequence from the opening overture to the final curtain.
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each broadcast.operaBlocks as block (block.id)}
					<div
						class="flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-lg transition-all hover:border-amber-500/60"
					>
						<div class="space-y-2">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/70 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 uppercase"
								>
									<span>🎭</span>
									<span
										>{block.type === 'series'
											? 'Multi-Album Rock Opera Series'
											: 'Full Rock Opera'}</span
									>
								</span>

								<span class="font-mono text-xs font-semibold text-slate-400">
									{block.trackCount} Tracks • {formatBlockDuration(block.durationSeconds)}
								</span>
							</div>

							<h3 class="text-lg font-extrabold text-white">{block.title}</h3>
							<p class="text-xs font-semibold text-blue-400">{block.artist}</p>

							<div class="pt-1">
								<span
									class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
								>
									Unbroken Playback Order:
								</span>
								<ol class="mt-1.5 space-y-1 text-xs text-slate-300">
									{#each block.albums as albumName, idx (albumName)}
										<li class="flex items-center gap-2">
											<span
												class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-800 font-mono text-[10px] font-bold text-amber-400"
											>
												{idx + 1}
											</span>
											<span>{albumName}</span>
										</li>
									{/each}
								</ol>
							</div>
						</div>

						<div class="mt-5 border-t border-slate-800/80 pt-3">
							<button
								type="button"
								onclick={() => jumpToOperaBlock(block.title)}
								class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/50 px-4 py-2 text-xs font-extrabold text-amber-200 transition-colors hover:border-amber-400 hover:bg-amber-900/60 hover:text-white"
							>
								<span>▶</span>
								<span>Jump to Start of Saga in Broadcast</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- =================================================================== -->
	<!-- 4. FULL BROADCAST QUEUE MANIFEST                                    -->
	<!-- =================================================================== -->
	<section class="space-y-4" aria-labelledby="broadcast-queue-heading">
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h2 id="broadcast-queue-heading" class="text-xl font-extrabold tracking-tight text-white">
					Active Broadcast Queue ({filteredQueue.length} of {broadcast.tracks.length} Tracks)
				</h2>
				<p class="text-sm text-slate-400">
					Click any track below to tune the broadcast directly to that point in the schedule.
				</p>
			</div>

			<div class="w-full sm:w-72">
				<input
					type="search"
					bind:value={searchFilter}
					placeholder="Filter broadcast queue..."
					aria-label="Filter broadcast queue by song, artist, album, or ISRC"
					class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
				/>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
			<div class="max-h-[640px] divide-y divide-slate-800/70 overflow-y-auto">
				{#each filteredQueue as { track, index } (track.id + '-' + index)}
					{@const isCurrent =
						player.currentTrack?.id === track.id &&
						(!isRadioActive || player.currentIndex === index)}
					<div
						class="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-800/60 {isCurrent
							? 'bg-blue-950/40'
							: ''}"
					>
						<button
							type="button"
							onclick={() => startRadioBroadcast(index)}
							class="flex min-w-0 flex-1 items-center gap-3.5 text-left focus:outline-none"
						>
							<span
								class="w-8 shrink-0 text-center font-mono text-xs {isCurrent
									? 'font-extrabold text-blue-400'
									: 'text-slate-500'}"
							>
								{#if isCurrent && player.isPlaying}
									▶
								{:else}
									{index + 1}
								{/if}
							</span>

							{#if track.artwork}
								<img
									src={track.artwork}
									alt=""
									loading="lazy"
									class="h-10 w-10 shrink-0 rounded-lg border border-slate-700/80 object-cover"
								/>
							{/if}

							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="truncate text-sm font-bold {isCurrent ? 'text-blue-300' : 'text-white'}"
									>
										{track.title}
									</span>

									{#if track.radioBlockType === 'series'}
										<span
											class="rounded border border-amber-500/40 bg-amber-950/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300"
											title={track.radioBlockTitle}
										>
											🎭 Series {track.radioBlockTrackIndex}/{track.radioBlockTrackCount}
										</span>
									{:else if track.radioBlockType === 'opera'}
										<span
											class="rounded border border-purple-500/40 bg-purple-950/70 px-1.5 py-0.5 text-[10px] font-bold text-purple-300"
											title={track.radioBlockTitle}
										>
											🎭 Opera {track.radioBlockTrackIndex}/{track.radioBlockTrackCount}
										</span>
									{/if}
								</div>

								<div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
									<span class="font-medium text-slate-300">{track.artist}</span>
									<span>•</span>
									<span class="truncate">{track.album}</span>
									{#if track.isrc}
										<span class="hidden font-mono text-[10px] text-slate-500 sm:inline">
											({track.isrc})
										</span>
									{/if}
								</div>
							</div>
						</button>

						<div class="flex shrink-0 items-center gap-3">
							<span class="font-mono text-xs text-slate-400">{track.duration}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 5. SHARE THE LISTENING ROOM RADIO                                   -->
	<!-- =================================================================== -->
	<ShareSection
		title="The Listening Room Radio"
		subtitle="Engine Room Records"
		description="Stream the full Engine Room Records catalog with unbroken Rock Operas and multi-album Rock Opera Series on The Listening Room Radio!"
		url="https://music.raggiesoft.com/radio"
		socialPreview="https://music.raggiesoft.com/og-radio.jpg"
	/>
</div>

<ShareModal
	isOpen={!!shareModalData}
	onClose={() => (shareModalData = null)}
	title={shareModalData?.title || ''}
	subtitle={shareModalData?.subtitle || ''}
	description={shareModalData?.description || ''}
	url={shareModalData?.url || ''}
	socialPreview={shareModalData?.socialPreview || ''}
/>
