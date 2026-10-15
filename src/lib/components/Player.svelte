<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * Player.svelte
	 * ============================================================================
	 * High-performance, WCAG 2.1 AA compliant persistent audio player built with
	 * Svelte 5 Runes.
	 *
	 * Features:
	 * - Seamless gapless queue playback for multi-disc rock operas.
	 * - Full browser Media Session API synchronization (lockscreen, keyboard media keys).
	 * - Keyboard accessibility (Space to play/pause, Arrows to seek & adjust volume, M to mute).
	 * - ARIA live region announcements for assistive technologies on track change.
	 * - High-resolution album artwork presentation with expandable canonical lore & lyrics drawer.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { player } from '#lib/player.svelte.js';
	import { formatReleaseDate } from '#lib/data/musicData.js';
	import StoreButton from '#lib/components/StoreButton.svelte';

	let audioElement = $state(/** @type {HTMLAudioElement | null} */ (null));
	let isScrubbing = $state(false);
	let scrubTime = $state(0);

	// Synchronized WebVTT lyrics scroll container and tracking
	let lyricsContainer = $state(/** @type {HTMLElement | null} */ (null));
	let lastActiveIndex = -1;

	// Automatically scroll the synchronized lyrics container to keep the active cue in view
	$effect(() => {
		if (!player.isExpanded || player.drawerTab !== 'lyrics-lore') {
			lastActiveIndex = -1;
			return;
		}

		const currentCue = player.activeCue;
		if (!currentCue || !lyricsContainer) return;

		const activeIndex = player.cues.indexOf(currentCue);
		if (activeIndex !== -1 && activeIndex !== lastActiveIndex) {
			lastActiveIndex = activeIndex;
			const activeEl = lyricsContainer.querySelector(`#lyric-cue-${activeIndex}`);
			if (activeEl instanceof HTMLElement) {
				const containerHeight = lyricsContainer.clientHeight;
				const elTop = activeEl.offsetTop;
				const elHeight = activeEl.clientHeight;
				const targetScrollTop = elTop - containerHeight / 2 + elHeight / 2;

				lyricsContainer.scrollTo({
					top: Math.max(0, targetScrollTop),
					behavior: 'smooth'
				});
			}
		}
	});

	// Synchronize audio element playback state with player store
	$effect(() => {
		if (!audioElement || !player.currentTrack.audioUrl) return;

		if (player.isPlaying) {
			const playPromise = audioElement.play();
			if (playPromise !== undefined) {
				playPromise.catch((err) => {
					console.warn('Playback intercepted by browser autoplay policy:', err);
					player.isPlaying = false;
				});
			}
		} else {
			audioElement.pause();
		}
	});

	// Synchronize volume and mute properties
	$effect(() => {
		if (!audioElement) return;
		audioElement.volume = player.volume;
		audioElement.muted = player.isMuted;
	});

	// Synchronize audio playback rate
	$effect(() => {
		if (!audioElement) return;
		audioElement.playbackRate = player.playbackRate;
	});

	// Synchronize browser Media Session API
	$effect(() => {
		if (
			typeof navigator === 'undefined' ||
			!('mediaSession' in navigator) ||
			!player.currentTrack.audioUrl
		) {
			return;
		}

		navigator.mediaSession.metadata = new MediaMetadata({
			title: player.currentTrack.title || 'Unknown Title',
			artist: player.currentTrack.artist || 'Engine Room Records',
			album: player.currentTrack.album || 'Engine Room Records',
			artwork: player.currentTrack.artwork
				? [
						{ src: player.currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' },
						{ src: player.currentTrack.artwork, sizes: '256x256', type: 'image/jpeg' }
					]
				: []
		});

		navigator.mediaSession.setActionHandler('play', () => player.play());
		navigator.mediaSession.setActionHandler('pause', () => player.pause());
		navigator.mediaSession.setActionHandler('previoustrack', () => player.prev());
		navigator.mediaSession.setActionHandler('nexttrack', () => player.next());
		navigator.mediaSession.setActionHandler('seekto', (details) => {
			if (details.seekTime !== undefined && details.seekTime !== null) {
				player.seek(details.seekTime);
				if (audioElement) audioElement.currentTime = details.seekTime;
			}
		});
		navigator.mediaSession.setActionHandler('seekforward', () => {
			player.seekRelative(10);
			if (audioElement) audioElement.currentTime = player.currentTime;
		});
		navigator.mediaSession.setActionHandler('seekbackward', () => {
			player.seekRelative(-10);
			if (audioElement) audioElement.currentTime = player.currentTime;
		});
	});

	/**
	 * Keyboard shortcut handling (Space, Arrow keys, Mute)
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown(event) {
		const target = /** @type {HTMLElement} */ (event.target);
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
			return;
		}

		if (event.code === 'Space') {
			event.preventDefault();
			player.togglePlay();
		} else if (event.code === 'ArrowLeft') {
			event.preventDefault();
			const newTime = Math.max(0, player.currentTime - 5);
			player.seek(newTime);
			if (audioElement) audioElement.currentTime = newTime;
		} else if (event.code === 'ArrowRight') {
			event.preventDefault();
			const newTime = Math.min(player.duration, player.currentTime + 5);
			player.seek(newTime);
			if (audioElement) audioElement.currentTime = newTime;
		} else if (event.key === 'm' || event.key === 'M') {
			player.toggleMute();
		} else if (event.code === 'Escape' && player.isExpanded) {
			player.isExpanded = false;
		}
	}

	/**
	 * @param {Event} e
	 */
	function onScrubInput(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		isScrubbing = true;
		scrubTime = parseFloat(target.value);
	}

	/**
	 * @param {Event} e
	 */
	function onScrubChange(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		const targetTime = parseFloat(target.value);
		isScrubbing = false;
		player.seek(targetTime);
		if (audioElement) {
			audioElement.currentTime = targetTime;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Invisible HTML5 Audio Engine -->
<audio
	bind:this={audioElement}
	src={player.currentTrack.audioUrl}
	preload="auto"
	ontimeupdate={() => {
		if (!isScrubbing && audioElement) {
			player.currentTime = audioElement.currentTime;
		}
	}}
	onloadedmetadata={() => {
		if (audioElement) {
			player.duration = audioElement.duration;
			player.isLoading = false;
		}
	}}
	onwaiting={() => (player.isLoading = true)}
	oncanplay={() => (player.isLoading = false)}
	onended={() => player.onTrackEnded()}
	onerror={() => {
		player.error = 'Unable to stream audio track.';
		player.isLoading = false;
	}}
></audio>

<!-- Screen Reader Announcement Live Region (WCAG 2.1 AA) -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
	{#if player.currentTrack.title}
		Now playing {player.currentTrack.title} by {player.currentTrack.artist}.
	{/if}
</div>

<!-- ======================================================================= -->
<!-- EXPANDABLE DRAWER: LORE, TRACKLIST & LYRICS MODAL                       -->
<!-- ======================================================================= -->
{#if player.isExpanded}
	<div
		class="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md transition-opacity duration-300"
		role="dialog"
		aria-modal="true"
		aria-label="Now Playing, Lore Notes, and Album Details"
	>
		<!-- Backdrop click to dismiss -->
		<button
			class="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent"
			onclick={() => (player.isExpanded = false)}
			aria-label="Close Now Playing Modal"
		></button>

		<!-- Content Panel -->
		<div
			class="relative z-10 mx-auto flex max-h-[88vh] w-full max-w-5xl flex-col overflow-y-auto rounded-t-2xl border-t border-slate-700/80 bg-slate-900 p-6 shadow-2xl"
		>
			<!-- Header / Navigation Tabs / Close button -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
				<div class="flex flex-wrap items-center gap-2">
					<button
						onclick={() => (player.drawerTab = 'lyrics-lore')}
						class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {player.drawerTab ===
						'lyrics-lore'
							? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
							: 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}"
					>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>
						Lyrics & Lore
					</button>

					<button
						onclick={() => (player.drawerTab = 'queue')}
						class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {player.drawerTab ===
						'queue'
							? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
							: 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}"
					>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 10h16M4 14h16M4 18h16"
							/>
						</svg>
						Queue ({player.queue.length})
					</button>

					<button
						onclick={() => (player.drawerTab = 'credits')}
						class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {player.drawerTab ===
						'credits'
							? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
							: 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}"
					>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Liner Notes & Masters
					</button>
				</div>

				<div class="flex items-center gap-3">
					{#if player.currentTrack.disc && player.currentTrack.track}
						<span class="font-mono text-xs text-slate-400">
							Disc {player.currentTrack.disc} • Track {player.currentTrack.track}
						</span>
					{/if}
					<button
						onclick={() => (player.isExpanded = false)}
						class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						aria-label="Close details"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Main Drawer Grid -->
			<div class="grid grid-cols-1 gap-8 py-6 md:grid-cols-12">
				<!-- Left Column: Album Art, Expanded Controls, Speed & Sleep Timer -->
				<div
					class="flex flex-col items-center text-center md:col-span-5 md:items-start md:text-left"
				>
					<div class="flex w-full justify-center">
						<div class="group relative">
							{#if player.currentTrack.artwork}
								<img
									src={player.currentTrack.artwork}
									alt="Cover artwork for {player.currentTrack.album}"
									class="h-64 w-64 rounded-2xl border border-slate-800 object-cover shadow-2xl transition-transform md:h-80 md:w-80 {player.isPlaying
										? 'shadow-blue-500/10'
										: ''}"
								/>
							{:else}
								<div
									class="flex h-64 w-64 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-600 md:h-80 md:w-80"
								>
									<span class="text-5xl">♫</span>
								</div>
							{/if}

							<!-- Equalizer visualizer badge overlay -->
							{#if player.isPlaying}
								<div
									class="absolute right-3 bottom-3 flex items-end gap-1 rounded-lg bg-black/70 px-2.5 py-1.5 backdrop-blur-md"
								>
									<span class="h-4 w-1 animate-pulse rounded bg-blue-400"></span>
									<span
										class="h-6 w-1 animate-pulse rounded bg-indigo-400"
										style="animation-delay: 150ms;"
									></span>
									<span
										class="h-3 w-1 animate-pulse rounded bg-blue-300"
										style="animation-delay: 300ms;"
									></span>
									<span
										class="h-5 w-1 animate-pulse rounded bg-purple-400"
										style="animation-delay: 450ms;"
									></span>
								</div>
							{/if}
						</div>
					</div>

					<div class="mt-5 w-full">
						<div class="mb-1.5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
							<span
								class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/90 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-300 uppercase"
							>
								<span>🎧</span>
								<span>128kbps Preview Stream</span>
							</span>
						</div>
						<h2 class="text-2xl font-bold tracking-tight text-white">
							{player.currentTrack.title || 'The Listening Room'}
						</h2>
						<div class="mt-1 flex items-center justify-center md:justify-start gap-2">
							{#if player.currentTrack.artistLogo}
								<img
									src={player.currentTrack.artistLogo}
									alt="{player.currentTrack.artist} logo"
									class="h-6 w-6 rounded-full object-cover border border-slate-700/80 shadow-sm bg-slate-950 shrink-0"
								/>
							{/if}
							{#if player.currentTrack.artistSlug}
								<a
									href={resolve('/[artist]', { artist: player.currentTrack.artistSlug })}
									onclick={() => (player.isExpanded = false)}
									class="text-lg font-medium text-blue-400 hover:underline"
								>
									{player.currentTrack.artist}
								</a>
							{:else}
								<p class="text-lg font-medium text-blue-400">
									{player.currentTrack.artist || 'Select a track'}
								</p>
							{/if}
						</div>
						{#if player.currentTrack.albumSlug && player.currentTrack.artistSlug}
							<a
								href={resolve('/[artist]/[album]', {
									artist: player.currentTrack.artistSlug,
									album: player.currentTrack.albumSlug
								})}
								onclick={() => (player.isExpanded = false)}
								class="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-blue-300 hover:underline"
							>
								<span>{player.currentTrack.album}</span>
								<svg
									class="h-3 w-3 opacity-70"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</a>
						{:else}
							<p class="mt-0.5 text-sm text-slate-400">{player.currentTrack.album}</p>
						{/if}

						{#if player.currentTrack.loreUrl || player.currentTrack.artistLoreUrl}
							<div class="mt-2">
								<a
									href={player.currentTrack.loreUrl || player.currentTrack.artistLoreUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/50 px-2.5 py-1 text-xs font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white"
								>
									<span>
										{player.currentTrack.loreUrl
											? 'Album Lore Archive (RaggieSoft.com)'
											: `${player.currentTrack.artist} Lore Archive (RaggieSoft.com)`}
									</span>
									<span>&nearr;</span>
								</a>
							</div>
						{/if}

						{#if player.hasActiveExternalSupportLinks(player.currentTrack)}
							<div
								class="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-left shadow-inner"
							>
								<p class="mb-2.5 text-[11px] leading-relaxed text-slate-300">
									<strong class="text-white">Enjoying the preview?</strong> Listening in lossless/high-res
									on your favorite streaming app or purchasing the digital archive on Fourthwall directly
									supports <strong class="text-blue-300">Michael Ragsdale</strong> &amp;
									<strong class="text-blue-300">Engine Room Records</strong>.
								</p>
								<StoreButton
									type="album"
									size="small"
									spotifyId={player.currentTrack.spotifyId}
									appleId={player.currentTrack.appleId}
									amazonId={player.currentTrack.amazonId}
									youtubeId={player.currentTrack.youtubeId}
									dspExempt={player.currentTrack.dspExempt}
									storeStandardUrl={player.currentTrack.storeStandardUrl}
									storeAudiophileUrl={player.currentTrack.storeAudiophileUrl}
								/>
							</div>
						{/if}

						<!-- In-Drawer Progress Scrubber -->
						<div class="mt-4">
							<div class="flex justify-between font-mono text-xs text-slate-400">
								<span>{player.formattedCurrentTime}</span>
								<span>{player.formattedDuration}</span>
							</div>
							<div class="relative mt-1.5 h-2 w-full cursor-pointer rounded-full bg-slate-800">
								<div
									class="h-full rounded-full bg-blue-500"
									style="width: {player.progressPercent}%"
								></div>
								<input
									type="range"
									min="0"
									max={player.duration || 100}
									step="0.1"
									value={isScrubbing ? scrubTime : player.currentTime}
									oninput={onScrubInput}
									onchange={onScrubChange}
									disabled={!player.currentTrack.audioUrl}
									aria-label="Seek track"
									class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
								/>
							</div>
						</div>

						<!-- Playback Action Controls Row -->
						<div class="mt-5 flex items-center justify-center gap-3 md:justify-start">
							<!-- Shuffle Toggle -->
							<button
								onclick={() => player.toggleShuffle()}
								class="rounded-full p-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {player.isShuffle
									? 'bg-blue-600/30 text-blue-400'
									: 'text-slate-400 hover:text-white'}"
								title={player.isShuffle ? 'Shuffle: On' : 'Shuffle: Off'}
								aria-label="Toggle shuffle"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</button>

							<!-- Previous Track -->
							<button
								onclick={() => player.prev()}
								disabled={!player.currentTrack.audioUrl}
								class="rounded-full p-2.5 text-slate-300 hover:text-white disabled:opacity-40"
								aria-label="Previous track"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
									<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
								</svg>
							</button>

							<!-- Large Play/Pause Toggle -->
							<button
								onclick={() => player.togglePlay()}
								disabled={!player.currentTrack.audioUrl}
								class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 disabled:opacity-40"
								aria-label={player.isPlaying ? 'Pause' : 'Play'}
							>
								{#if player.isPlaying}
									<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
										<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
									</svg>
								{:else}
									<svg class="h-6 w-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z" />
									</svg>
								{/if}
							</button>

							<!-- Next Track -->
							<button
								onclick={() => player.next()}
								disabled={!player.hasNext && !player.isShuffle}
								class="rounded-full p-2.5 text-slate-300 hover:text-white disabled:opacity-40"
								aria-label="Next track"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
									<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
								</svg>
							</button>

							<!-- Repeat Toggle -->
							<button
								onclick={() => player.toggleRepeat()}
								class="relative rounded-full p-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {player.repeatMode !==
								'none'
									? 'bg-blue-600/30 text-blue-400'
									: 'text-slate-400 hover:text-white'}"
								title="Repeat: {player.repeatMode}"
								aria-label="Toggle repeat mode"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								{#if player.repeatMode === 'one'}
									<span
										class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white"
										>1</span
									>
								{/if}
							</button>
						</div>

						<!-- Playback Speed & Sleep Timer Utilities -->
						<div
							class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4"
						>
							<!-- Playback Speed -->
							<div class="flex items-center gap-1.5">
								<span class="text-[11px] font-medium text-slate-500 uppercase">Speed</span>
								{#each [0.8, 1.0, 1.25, 1.5] as rate (rate)}
									<button
										onclick={() => player.setPlaybackRate(rate)}
										class="rounded px-2 py-0.5 text-xs font-semibold transition-colors {player.playbackRate ===
										rate
											? 'bg-blue-600 text-white'
											: 'bg-slate-800 text-slate-400 hover:text-white'}"
									>
										{rate}x
									</button>
								{/each}
							</div>

							<!-- Sleep Timer -->
							<div class="flex items-center gap-1.5">
								<span class="text-[11px] font-medium text-slate-500 uppercase">Sleep</span>
								{#each [null, 15, 30, 45] as min (min ?? 0)}
									<button
										onclick={() => player.setSleepTimer(min)}
										class="rounded px-2 py-0.5 text-xs font-semibold transition-colors {player.sleepTimerMinutes ===
										min
											? 'bg-indigo-600 text-white'
											: 'bg-slate-800 text-slate-400 hover:text-white'}"
									>
										{min ? `${min}m` : 'Off'}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Right Column: Tabs Content (Lyrics & Lore, Queue, Master Info) -->
				<div class="flex flex-col gap-6 md:col-span-7">
					{#if player.drawerTab === 'lyrics-lore'}
						<!-- Canonical Universe Lore Note -->
						{#if player.currentTrack.loreNote}
							<div class="rounded-xl border border-indigo-900/40 bg-slate-950/80 p-5 shadow-inner">
								<div
									class="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-400 uppercase"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										/>
									</svg>
									Canonical Lore Note
								</div>
								<p class="text-sm leading-relaxed whitespace-pre-line text-slate-300 italic">
									"{player.currentTrack.loreNote}"
								</p>
							</div>
						{/if}

						<!-- Synchronized Lyrics (WebVTT Cues) -->
						{#if player.cues.length > 0}
							<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
										Synchronized WebVTT Lyrics
									</h3>
									<span class="flex items-center gap-1.5 text-xs text-blue-400">
										<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"></span>
										Live Karaoke Sync
									</span>
								</div>
								<div
									bind:this={lyricsContainer}
									class="relative max-h-72 space-y-2.5 overflow-y-auto pr-2 scroll-smooth"
								>
									{#each player.cues as cue, idx (cue.start + '-' + idx)}
										{@const isActive =
											player.currentTime >= cue.start && player.currentTime <= cue.end}
										<button
											type="button"
											id="lyric-cue-{idx}"
											onclick={() => {
												player.seek(cue.start);
												if (audioElement) audioElement.currentTime = cue.start;
											}}
											class="block w-full text-left rounded-lg px-3 py-2 text-sm transition-all duration-200 cursor-pointer hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isActive
												? 'scale-102 border-l-4 border-blue-500 bg-blue-950/30 pl-3 text-base font-bold text-white shadow-sm'
												: 'text-slate-400 hover:text-slate-200'}"
											aria-current={isActive ? 'true' : undefined}
										>
											{cue.text}
										</button>
									{/each}
								</div>
							</div>
						{:else if player.currentTrack.lyrics}
							<!-- Static Formatted Lyrics from metadata.json -->
							<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
								<h3 class="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
									Official Song Lyrics
								</h3>
								<div
									class="max-h-80 space-y-2 overflow-y-auto pr-2 font-sans text-sm leading-relaxed whitespace-pre-line text-slate-300"
								>
									{player.currentTrack.lyrics}
								</div>
							</div>
						{:else}
							<div
								class="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500"
							>
								No lyrics manifest filed for this recording. Enjoy the music!
							</div>
						{/if}
					{:else if player.drawerTab === 'queue'}
						<!-- Active Playback Queue List -->
						<div class="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
									Album Sequence ({player.queue.length} Tracks)
								</h3>
								<span class="text-xs text-slate-500">Continuous Rock Opera Flow</span>
							</div>
							<div class="max-h-96 divide-y divide-slate-800/60 overflow-y-auto">
								{#each player.queue as track, idx (track.id || idx)}
									<button
										onclick={() => player.loadQueue(player.queue, idx, true)}
										class="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {idx ===
										player.currentIndex
											? 'bg-slate-800 font-semibold text-blue-400'
											: 'text-slate-300'}"
									>
										<div class="flex items-center gap-3 truncate">
											<span class="w-6 text-center font-mono text-xs text-slate-500">
												{#if idx === player.currentIndex && player.isPlaying}
													<span class="text-blue-400">▶</span>
												{:else}
													{track.track || idx + 1}
												{/if}
											</span>
											<div class="truncate">
												<span class="block truncate text-sm">{track.title}</span>
												{#if track.loreNote}
													<span class="block truncate text-[11px] text-slate-500"
														>{track.loreNote.slice(0, 60)}...</span
													>
												{/if}
											</div>
										</div>
										<span class="ml-4 shrink-0 font-mono text-xs text-slate-500">
											{track.duration || ''}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{:else if player.drawerTab === 'credits'}
						<!-- Liner Notes, ISRC, and Master Details -->
						<div class="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
							<h3 class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
								Release Information & Sound Architecture
							</h3>

							<div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
								<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
									<span class="block text-xs font-medium text-slate-500 uppercase"
										>In-Universe Release</span
									>
									<span class="mt-0.5 block font-semibold text-slate-200">
										{formatReleaseDate(
											player.currentTrack.temporalCoverage,
											player.currentTrack.year
										)}
									</span>
								</div>

								<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
									<span class="block text-xs font-medium text-slate-500 uppercase"
										>Earth Release Year</span
									>
									<span class="mt-0.5 block font-semibold text-slate-200">
										{player.currentTrack.year || 'Standard Catalog'}
									</span>
								</div>

								<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
									<span class="block text-xs font-medium text-slate-500 uppercase">ISRC Code</span>
									<span class="mt-0.5 block font-mono text-xs text-blue-400">
										{player.currentTrack.isrc || 'Pending Registration'}
									</span>
								</div>

								<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
									<span class="block text-xs font-medium text-slate-500 uppercase"
										>Master Quality Tier</span
									>
									<span class="mt-0.5 block font-semibold text-emerald-400">
										{player.currentTrack.legacyTier || 'Lossless Vault Master'}
									</span>
								</div>
							</div>

							<div
								class="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3.5 text-xs leading-relaxed text-slate-400"
							>
								<p class="font-semibold text-slate-300">The Listening Room • Preview Specification:</p>
								<p class="mt-1">
									Onsite audio is served via <code class="text-blue-400">assets.raggiesoft.com</code>
									as a free <strong>128kbps MP3 Preview Stream</strong> for exploring lyrics and canonical
									lore. To experience full lossless/high-res audio and support
									<strong class="text-slate-200">Michael Ragsdale</strong> &amp;
									<strong class="text-slate-200">Engine Room Records</strong>, stream on your
									preferred DSP or purchase the DRM-free digital archive (High-Quality MP3/OGG or
									Premium WAV/FLAC) on Fourthwall.
								</p>
							</div>

							{#if player.currentTrack.albumSlug && player.currentTrack.artistSlug}
								<div class="flex items-center justify-between border-t border-slate-800/80 pt-3">
									<a
										href={resolve('/[artist]/[album]', {
											artist: player.currentTrack.artistSlug,
											album: player.currentTrack.albumSlug
										})}
										onclick={() => (player.isExpanded = false)}
										class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
									>
										<span>View Dedicated Album Page & Lore</span>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</a>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ======================================================================= -->
<!-- GENTLE OPTION-B END-OF-TRACK DSP & FOURTHWALL NUDGE BANNER              -->
<!-- ======================================================================= -->
{#if player.showDspNudgeBanner && player.hasActiveExternalSupportLinks(player.currentTrack)}
	<aside
		class="fixed right-4 bottom-24 left-4 z-40 mx-auto max-w-3xl rounded-2xl border border-blue-500/40 bg-slate-900/95 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:p-5"
		role="region"
		aria-label="Support the Artist on Streaming or Fourthwall"
	>
		<div class="flex flex-col gap-3">
			<!-- Header Row: Badge + Album Title + Prominent &times; Close Button -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="rounded-full border border-blue-500/40 bg-blue-950/80 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-blue-300 uppercase"
					>
						Support the Artist
					</span>
					<span class="text-xs font-bold text-white sm:text-sm">
						Enjoying <em>{player.currentTrack.album}</em>?
					</span>
				</div>

				<button
					type="button"
					onclick={() => player.dismissDspNudge(false)}
					class="-mt-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-lg leading-none font-bold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
					aria-label="Close notification"
					title="Dismiss notification"
				>
					&times;
				</button>
			</div>

			<!-- Full-Width Body Copy (Never Crushed by Action Buttons) -->
			<p class="text-xs leading-relaxed text-slate-300">
				We’re keeping the free <strong class="text-white">128kbps preview stream</strong> playing for
				you! If you use a streaming app—or want to own the High-Quality MP3/OGG or Studio Master WAV/FLAC
				via Fourthwall—listening there upgrades your audio and directly supports
				<strong class="text-white">Michael Ragsdale</strong> &amp;
				<strong class="text-white">Engine Room Records</strong>.
			</p>

			<!-- Bottom Action Row: Store / Streaming Links + Dismissal Options -->
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3"
			>
				<StoreButton
					type="album"
					size="small"
					spotifyId={player.currentTrack.spotifyId}
					appleId={player.currentTrack.appleId}
					amazonId={player.currentTrack.amazonId}
					youtubeId={player.currentTrack.youtubeId}
					dspExempt={player.currentTrack.dspExempt}
					storeStandardUrl={player.currentTrack.storeStandardUrl}
					storeAudiophileUrl={player.currentTrack.storeAudiophileUrl}
				/>

				<div class="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						onclick={() => player.dismissDspNudge(false)}
						class="whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
						title="Keep listening to the 128kbps preview stream"
					>
						Keep Previewing
					</button>

					<button
						type="button"
						onclick={() => player.dismissDspNudge(true)}
						class="whitespace-nowrap px-1.5 py-1 text-[11px] font-medium text-slate-400 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-slate-200"
						title="Don't show this reminder again"
					>
						Don’t remind me
					</button>
				</div>
			</div>
		</div>
	</aside>
{/if}

<!-- ======================================================================= -->
<!-- GENTLE ISRC MATCH NOTIFICATION BANNER                                   -->
<!-- ======================================================================= -->
{#if player.isrcNotice}
	<aside
		class="fixed bottom-22 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-500/40 bg-slate-900/95 px-4 py-2.5 text-xs text-emerald-300 shadow-2xl backdrop-blur-md transition-all duration-300"
		role="status"
		aria-live="polite"
	>
		<div
			class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
		>
			<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.5"
					d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
				/>
			</svg>
		</div>
		<div class="truncate text-left font-medium">
			<span class="font-bold text-white">{player.isrcNotice.title}</span>: {player.isrcNotice
				.message}
			<span class="ml-1 font-mono text-[10px] text-emerald-400/80">({player.isrcNotice.isrc})</span>
		</div>
		<button
			onclick={() => player.dismissIsrcNotice()}
			class="ml-1 rounded-full p-1 text-slate-400 transition-colors hover:text-white focus:outline-none"
			aria-label="Dismiss notice"
		>
			<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</aside>
{/if}

<!-- ======================================================================= -->
<!-- PERSISTENT BOTTOM PLAYER BAR (WCAG 2.1 AA)                             -->
<!-- ======================================================================= -->
<nav
	class="fixed bottom-0 left-0 z-40 w-full border-t border-slate-800/90 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl"
	aria-label="Audio Player Controls"
>
	<!-- Continuous Progress Scrub Bar (Full Width Top Edge) -->
	<div class="group relative h-2 w-full cursor-pointer bg-slate-800">
		<!-- Buffer / Duration Track -->
		<div
			class="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
			style="width: {isScrubbing
				? (scrubTime / (player.duration || 1)) * 100
				: player.progressPercent}%;"
		></div>
		<!-- Accessible Slider Control -->
		<input
			type="range"
			min="0"
			max={player.duration || 100}
			step="0.1"
			value={isScrubbing ? scrubTime : player.currentTime}
			oninput={onScrubInput}
			onchange={onScrubChange}
			disabled={!player.currentTrack.audioUrl}
			aria-label="Track progress slider"
			aria-valuemin="0"
			aria-valuemax={player.duration || 100}
			aria-valuenow={Math.round(player.currentTime)}
			aria-valuetext="{player.formattedCurrentTime} of {player.formattedDuration}"
			class="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
		/>
	</div>

	<!-- Controls & Metadata Grid -->
	<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
		<!-- 1. LEFT: Album Art & Track Info -->
		<div class="flex min-w-0 flex-1 items-center gap-3.5">
			<!-- Clickable thumbnail toggles Expanded Drawer -->
			<button
				onclick={() => player.toggleExpanded()}
				class="group relative shrink-0 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				aria-label="View album artwork and canonical lore"
			>
				{#if player.currentTrack.artwork}
					<img
						src={player.currentTrack.artwork}
						alt="Cover artwork for {player.currentTrack.title}"
						class="h-13 w-13 rounded-md object-cover shadow-md transition-opacity group-hover:opacity-85"
					/>
				{:else}
					<div
						class="flex h-13 w-13 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-500"
					>
						♫
					</div>
				{/if}
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
						/>
					</svg>
				</div>
			</button>

			<div class="truncate text-left min-w-0">
				<div class="flex items-center gap-1.5 truncate">
					<h3 class="truncate text-sm leading-snug font-bold text-white">
						{player.currentTrack.title || 'The Listening Room'}
					</h3>
					{#if player.currentTrack.audioUrl}
						<span
							class="hidden shrink-0 rounded border border-slate-700 bg-slate-800/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400 uppercase sm:inline-block"
							title="Free 128kbps Discovery Preview Stream"
						>
							128k Preview
						</span>
					{/if}
				</div>
				<div class="mt-0.5 flex items-center gap-1.5 truncate">
					{#if player.currentTrack.artistLogo}
						<img
							src={player.currentTrack.artistLogo}
							alt="{player.currentTrack.artist} logo"
							class="h-3.5 w-3.5 shrink-0 rounded-full object-cover border border-slate-700/80 bg-slate-950"
						/>
					{/if}
					<p class="truncate text-xs text-slate-400">
						{player.currentTrack.artist || 'Select a track to preview (128kbps)'}
					</p>
				</div>
			</div>
		</div>

		<!-- 2. CENTER: Playback Controls & Timestamp Display -->
		<div class="flex shrink-0 flex-col items-center justify-center">
			<div class="flex items-center gap-3 sm:gap-4">
				<!-- Shuffle Toggle (Desktop) -->
				<button
					onclick={() => player.toggleShuffle()}
					class="hidden rounded-full p-2 transition-colors sm:block {player.isShuffle
						? 'text-blue-400'
						: 'text-slate-500 hover:text-white'}"
					aria-label="Toggle shuffle"
					title={player.isShuffle ? 'Shuffle: On' : 'Shuffle: Off'}
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</button>

				<!-- Step Backward / Previous Track -->
				<button
					onclick={() => player.prev()}
					disabled={!player.currentTrack.audioUrl}
					aria-label="Previous track"
					class="rounded-full p-2 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<!-- Primary Play / Pause Toggle -->
				<button
					onclick={() => player.togglePlay()}
					disabled={!player.currentTrack.audioUrl}
					aria-label={player.isPlaying ? 'Pause' : 'Play'}
					class="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{#if player.isLoading}
						<svg class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
						</svg>
					{:else if player.isPlaying}
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
						</svg>
					{:else}
						<svg class="h-5 w-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				<!-- Step Forward / Next Track -->
				<button
					onclick={() => player.next()}
					disabled={!player.hasNext && !player.isShuffle}
					aria-label="Next track"
					class="rounded-full p-2 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>

				<!-- Repeat Toggle (Desktop) -->
				<button
					onclick={() => player.toggleRepeat()}
					class="relative hidden rounded-full p-2 transition-colors sm:block {player.repeatMode !==
					'none'
						? 'text-blue-400'
						: 'text-slate-500 hover:text-white'}"
					aria-label="Toggle repeat"
					title="Repeat: {player.repeatMode}"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					{#if player.repeatMode === 'one'}
						<span
							class="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white"
							>1</span
						>
					{/if}
				</button>
			</div>

			<!-- Timestamp Counters -->
			<div class="mt-1 flex items-center gap-2 font-mono text-xs text-slate-400">
				<span>{player.formattedCurrentTime}</span>
				<span>/</span>
				<span>{player.formattedDuration}</span>
			</div>
		</div>

		<!-- 3. RIGHT: DSP Upgrade Pill, Lore/Lyrics Drawer Toggle & Volume Slider -->
		<div class="flex flex-1 items-center justify-end gap-2.5">
			{#if player.hasActiveExternalSupportLinks(player.currentTrack)}
				<div class="hidden shrink-0 lg:block">
					<StoreButton
						type="album"
						size="small"
						compactLabel={true}
						showFourthwall={false}
						spotifyId={player.currentTrack.spotifyId}
						appleId={player.currentTrack.appleId}
						amazonId={player.currentTrack.amazonId}
						youtubeId={player.currentTrack.youtubeId}
						dspExempt={player.currentTrack.dspExempt}
					/>
				</div>
			{/if}

			<!-- Lore / Lyrics Drawer Toggle Button -->
			<button
				onclick={() => player.toggleExpanded()}
				aria-label="Toggle canonical lore and lyrics"
				title="Lore & Lyrics"
				class="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				{#if player.currentTrack.loreNote}
					<span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500"></span>
				{/if}
			</button>

			<!-- Volume Controls -->
			<div class="flex items-center gap-2">
				<button
					onclick={() => player.toggleMute()}
					aria-label={player.isMuted ? 'Unmute' : 'Mute'}
					class="rounded-md p-1.5 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					{#if player.isMuted || player.volume === 0}
						<!-- Muted Icon -->
						<svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
							/>
						</svg>
					{:else if player.volume < 0.5}
						<!-- Low Volume -->
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							/>
						</svg>
					{:else}
						<!-- High Volume -->
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							/>
						</svg>
					{/if}
				</button>

				<!-- Accessible Volume Slider -->
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={player.isMuted ? 0 : player.volume}
					oninput={(e) =>
						player.setVolume(parseFloat(/** @type {HTMLInputElement} */ (e.target).value))}
					aria-label="Volume level slider"
					class="h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				/>
			</div>
		</div>
	</div>
</nav>
