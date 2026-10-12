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
	import { player } from '#lib/player.svelte.js';

	let audioElement = $state(/** @type {HTMLAudioElement | null} */ (null));
	let isScrubbing = $state(false);
	let scrubTime = $state(0);

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
			<!-- Header / Close button -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-4">
				<div class="flex items-center gap-3">
					<span
						class="rounded border border-blue-700/50 bg-blue-900/60 px-2.5 py-1 text-xs font-semibold tracking-wider text-blue-300 uppercase"
					>
						Now Playing
					</span>
					{#if player.currentTrack.disc && player.currentTrack.track}
						<span class="font-mono text-xs text-slate-400">
							Disc {player.currentTrack.disc} • Track {player.currentTrack.track}
						</span>
					{/if}
				</div>
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

			<!-- Main Drawer Grid -->
			<div class="grid grid-cols-1 gap-8 py-6 md:grid-cols-12">
				<!-- Left Column: Album Art & Metadata -->
				<div
					class="flex flex-col items-center text-center md:col-span-5 md:items-start md:text-left"
				>
					{#if player.currentTrack.artwork}
						<img
							src={player.currentTrack.artwork}
							alt="Cover artwork for {player.currentTrack.album}"
							class="h-64 w-64 rounded-xl border border-slate-800 object-cover shadow-2xl md:h-80 md:w-80"
						/>
					{:else}
						<div
							class="flex h-64 w-64 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-600 md:h-80 md:w-80"
						>
							<span class="text-5xl">♫</span>
						</div>
					{/if}

					<div class="mt-4 w-full">
						<h2 class="text-2xl font-bold tracking-tight text-white">
							{player.currentTrack.title}
						</h2>
						<p class="mt-1 text-lg font-medium text-blue-400">{player.currentTrack.artist}</p>
						<p class="mt-0.5 text-sm text-slate-400">{player.currentTrack.album}</p>

						{#if player.currentTrack.isrc}
							<div
								class="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 font-mono text-xs text-slate-500"
							>
								<span>ISRC: {player.currentTrack.isrc}</span>
								{#if player.currentTrack.year}
									<span>{player.currentTrack.year}</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Column: Lore Notes & Synchronized Lyrics / Queue -->
				<div class="flex flex-col gap-6 md:col-span-7">
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
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
							<h3 class="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
								Synchronized Lyrics
							</h3>
							<div class="max-h-48 space-y-2 overflow-y-auto pr-2">
								{#each player.cues as cue (cue.start + cue.text)}
									<p
										class="text-sm transition-all duration-200 {player.currentTime >= cue.start &&
										player.currentTime <= cue.end
											? 'scale-102 border-l-2 border-blue-500 pl-2 text-base font-bold text-white'
											: 'text-slate-500'}"
									>
										{cue.text}
									</p>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Active Rock Opera Queue -->
					{#if player.queue.length > 0}
						<div class="rounded-xl border border-slate-800/80 bg-slate-950/40 p-5">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
									Album Sequence ({player.queue.length} Tracks)
								</h3>
								<span class="text-xs text-slate-500">Continuous Playback Active</span>
							</div>
							<div class="max-h-56 divide-y divide-slate-800/60 overflow-y-auto">
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
												{idx === player.currentIndex && player.isPlaying
													? '▶'
													: track.track || idx + 1}
											</span>
											<span class="truncate text-sm">{track.title}</span>
										</div>
										<span class="ml-4 shrink-0 font-mono text-xs text-slate-500">
											{track.duration || ''}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
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
		<div class="flex w-1/4 min-w-[200px] items-center gap-3.5">
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

			<div class="truncate text-left">
				<h3 class="truncate text-sm leading-snug font-bold text-white">
					{player.currentTrack.title || 'Engine Room Records'}
				</h3>
				<p class="mt-0.5 truncate text-xs text-slate-400">
					{player.currentTrack.artist || 'Select a track to start'}
				</p>
			</div>
		</div>

		<!-- 2. CENTER: Playback Controls & Timestamp Display -->
		<div class="flex max-w-md flex-1 flex-col items-center justify-center">
			<div class="flex items-center gap-4">
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
					disabled={!player.hasNext}
					aria-label="Next track"
					class="rounded-full p-2 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
			</div>

			<!-- Timestamp Counters -->
			<div class="mt-1 flex items-center gap-2 font-mono text-xs text-slate-400">
				<span>{player.formattedCurrentTime}</span>
				<span>/</span>
				<span>{player.formattedDuration}</span>
			</div>
		</div>

		<!-- 3. RIGHT: Lore/Lyrics Drawer Toggle & Volume Slider -->
		<div class="flex w-1/4 min-w-[200px] items-center justify-end gap-3">
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
