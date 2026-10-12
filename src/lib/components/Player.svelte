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
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end transition-opacity duration-300"
		role="dialog"
		aria-modal="true"
		aria-label="Now Playing, Lore Notes, and Album Details"
	>
		<!-- Backdrop click to dismiss -->
		<button
			class="absolute inset-0 w-full h-full cursor-default border-0 bg-transparent"
			onclick={() => (player.isExpanded = false)}
			aria-label="Close Now Playing Modal"
		></button>

		<!-- Content Panel -->
		<div
			class="relative z-10 bg-slate-900 border-t border-slate-700/80 rounded-t-2xl max-h-[88vh] overflow-y-auto w-full max-w-5xl mx-auto p-6 shadow-2xl flex flex-col"
		>
			<!-- Header / Close button -->
			<div class="flex items-center justify-between pb-4 border-b border-slate-800">
				<div class="flex items-center gap-3">
					<span class="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-blue-900/60 text-blue-300 rounded border border-blue-700/50">
						Now Playing
					</span>
					{#if player.currentTrack.disc && player.currentTrack.track}
						<span class="text-xs text-slate-400 font-mono">
							Disc {player.currentTrack.disc} • Track {player.currentTrack.track}
						</span>
					{/if}
				</div>
				<button
					onclick={() => (player.isExpanded = false)}
					class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
					aria-label="Close details"
				>
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Main Drawer Grid -->
			<div class="grid grid-cols-1 md:grid-cols-12 gap-8 py-6">
				<!-- Left Column: Album Art & Metadata -->
				<div class="md:col-span-5 flex flex-col items-center text-center md:text-left md:items-start">
					{#if player.currentTrack.artwork}
						<img
							src={player.currentTrack.artwork}
							alt="Cover artwork for {player.currentTrack.album}"
							class="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-2xl object-cover border border-slate-800"
						/>
					{:else}
						<div class="w-64 h-64 md:w-80 md:h-80 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600 border border-slate-700">
							<span class="text-5xl">♫</span>
						</div>
					{/if}

					<div class="mt-4 w-full">
						<h2 class="text-2xl font-bold text-white tracking-tight">{player.currentTrack.title}</h2>
						<p class="text-lg font-medium text-blue-400 mt-1">{player.currentTrack.artist}</p>
						<p class="text-sm text-slate-400 mt-0.5">{player.currentTrack.album}</p>

						{#if player.currentTrack.isrc}
							<div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
								<span>ISRC: {player.currentTrack.isrc}</span>
								{#if player.currentTrack.year}
									<span>{player.currentTrack.year}</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Column: Lore Notes & Synchronized Lyrics / Queue -->
				<div class="md:col-span-7 flex flex-col gap-6">
					<!-- Canonical Universe Lore Note -->
					{#if player.currentTrack.loreNote}
						<div class="bg-slate-950/80 rounded-xl p-5 border border-indigo-900/40 shadow-inner">
							<div class="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Canonical Lore Note
							</div>
							<p class="text-slate-300 text-sm leading-relaxed whitespace-pre-line italic">
								"{player.currentTrack.loreNote}"
							</p>
						</div>
					{/if}

					<!-- Synchronized Lyrics (WebVTT Cues) -->
					{#if player.cues.length > 0}
						<div class="bg-slate-950/60 rounded-xl p-5 border border-slate-800">
							<h3 class="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3">
								Synchronized Lyrics
							</h3>
							<div class="max-h-48 overflow-y-auto space-y-2 pr-2">
								{#each player.cues as cue}
									<p
										class="text-sm transition-all duration-200 {player.currentTime >= cue.start && player.currentTime <= cue.end ? 'text-white font-bold text-base scale-102 pl-2 border-l-2 border-blue-500' : 'text-slate-500'}"
									>
										{cue.text}
									</p>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Active Rock Opera Queue -->
					{#if player.queue.length > 0}
						<div class="bg-slate-950/40 rounded-xl p-5 border border-slate-800/80">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-xs font-semibold tracking-wider uppercase text-slate-400">
									Album Sequence ({player.queue.length} Tracks)
								</h3>
								<span class="text-xs text-slate-500">Continuous Playback Active</span>
							</div>
							<div class="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
								{#each player.queue as track, idx}
									<button
										onclick={() => player.loadQueue(player.queue, idx, true)}
										class="w-full py-2.5 px-3 flex items-center justify-between text-left hover:bg-slate-800/60 rounded-lg transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {idx === player.currentIndex ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300'}"
									>
										<div class="flex items-center gap-3 truncate">
											<span class="w-6 text-xs text-slate-500 font-mono text-center">
												{idx === player.currentIndex && player.isPlaying ? '▶' : track.track || idx + 1}
											</span>
											<span class="text-sm truncate">{track.title}</span>
										</div>
										<span class="text-xs text-slate-500 font-mono ml-4 shrink-0">
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
	class="fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl text-white border-t border-slate-800/90 shadow-2xl z-40"
	aria-label="Audio Player Controls"
>
	<!-- Continuous Progress Scrub Bar (Full Width Top Edge) -->
	<div class="relative w-full h-2 bg-slate-800 group cursor-pointer">
		<!-- Buffer / Duration Track -->
		<div
			class="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
			style="width: {isScrubbing ? (scrubTime / (player.duration || 1)) * 100 : player.progressPercent}%;"
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
			class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
		/>
	</div>

	<!-- Controls & Metadata Grid -->
	<div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
		
		<!-- 1. LEFT: Album Art & Track Info -->
		<div class="flex items-center gap-3.5 w-1/4 min-w-[200px]">
			<!-- Clickable thumbnail toggles Expanded Drawer -->
			<button
				onclick={() => player.toggleExpanded()}
				class="relative group rounded-md overflow-hidden shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				aria-label="View album artwork and canonical lore"
			>
				{#if player.currentTrack.artwork}
					<img
						src={player.currentTrack.artwork}
						alt="Cover artwork for {player.currentTrack.title}"
						class="w-13 h-13 rounded-md object-cover shadow-md group-hover:opacity-85 transition-opacity"
					/>
				{:else}
					<div class="w-13 h-13 bg-slate-800 rounded-md flex items-center justify-center text-slate-500 border border-slate-700">
						♫
					</div>
				{/if}
				<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
					</svg>
				</div>
			</button>

			<div class="truncate text-left">
				<h3 class="font-bold text-sm text-white truncate leading-snug">
					{player.currentTrack.title || 'Engine Room Records'}
				</h3>
				<p class="text-xs text-slate-400 truncate mt-0.5">
					{player.currentTrack.artist || 'Select a track to start'}
				</p>
			</div>
		</div>

		<!-- 2. CENTER: Playback Controls & Timestamp Display -->
		<div class="flex flex-col items-center justify-center flex-1 max-w-md">
			<div class="flex items-center gap-4">
				<!-- Step Backward / Previous Track -->
				<button
					onclick={() => player.prev()}
					disabled={!player.currentTrack.audioUrl}
					aria-label="Previous track"
					class="p-2 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<!-- Primary Play / Pause Toggle -->
				<button
					onclick={() => player.togglePlay()}
					disabled={!player.currentTrack.audioUrl}
					aria-label={player.isPlaying ? 'Pause' : 'Play'}
					class="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{#if player.isLoading}
						<svg class="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
						</svg>
					{:else if player.isPlaying}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
						</svg>
					{:else}
						<svg class="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				<!-- Step Forward / Next Track -->
				<button
					onclick={() => player.next()}
					disabled={!player.hasNext}
					aria-label="Next track"
					class="p-2 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
			</div>

			<!-- Timestamp Counters -->
			<div class="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
				<span>{player.formattedCurrentTime}</span>
				<span>/</span>
				<span>{player.formattedDuration}</span>
			</div>
		</div>

		<!-- 3. RIGHT: Lore/Lyrics Drawer Toggle & Volume Slider -->
		<div class="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
			<!-- Lore / Lyrics Drawer Toggle Button -->
			<button
				onclick={() => player.toggleExpanded()}
				aria-label="Toggle canonical lore and lyrics"
				title="Lore & Lyrics"
				class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 relative"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				{#if player.currentTrack.loreNote}
					<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></span>
				{/if}
			</button>

			<!-- Volume Controls -->
			<div class="flex items-center gap-2">
				<button
					onclick={() => player.toggleMute()}
					aria-label={player.isMuted ? 'Unmute' : 'Mute'}
					class="p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
				>
					{#if player.isMuted || player.volume === 0}
						<!-- Muted Icon -->
						<svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
						</svg>
					{:else if player.volume < 0.5}
						<!-- Low Volume -->
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
						</svg>
					{:else}
						<!-- High Volume -->
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
					oninput={(e) => player.setVolume(parseFloat(/** @type {HTMLInputElement} */ (e.target).value))}
					aria-label="Volume level slider"
					class="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				/>
			</div>
		</div>

	</div>
</nav>
