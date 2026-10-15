<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * StoreButton.svelte
	 * ============================================================================
	 * Universal Split DSP & Fourthwall Direct Storefront Component for
	 * The Listening Room by Engine Room Records (music.raggiesoft.com).
	 *
	 * Modeled after `raggiesoft-hub/includes/components/store-button.php` with
	 * reactive Svelte 5 state synchronization via `dspManager`.
	 *
	 * Architectural Features:
	 * 1. Action-Oriented Quality Framing:
	 *    - Highlights the audio quality upgrade over the onsite 128kbps preview
	 *      stream (e.g., "Listen in Lossless HD on Apple Music", "Stream High-Res
	 *      on Spotify", "Stream Ultra HD on Amazon Music").
	 * 2. Persistent Split-Button Global Default Selector:
	 *    - Clicking the primary left button opens the album/artist on the active
	 *      DSP in a new tab.
	 *    - Clicking the right chevron opens the "Set Global Default" menu,
	 *      allowing the listener to switch their preferred app across the entire
	 *      site (`localStorage: user_preferred_dsp`).
	 * 3. Partial & Missing DSP Resilience:
	 *    - If an album is missing from one DSP (e.g. YouTube), only the active
	 *      DSPs appear in the menu and the button automatically falls back to an
	 *      available platform if needed.
	 *    - If an album has zero DSP links (or `dspExempt: true`), no DSP button
	 *      or nudge is rendered.
	 * 4. Fourthwall Direct-to-Fan Digital Archive Promotion:
	 *    - Promotes direct purchases on Fourthwall (`store.raggiesoft.com`) when
	 *      `storeStandardUrl` (High-Quality MP3/OGG) and/or `storeAudiophileUrl`
	 *      (Premium WAV/FLAC) are available on the release.
	 * ============================================================================
	 */
	import { dspManager } from '#lib/dspPreference.svelte.js';

	/**
	 * @type {{
	 *   type?: 'album' | 'artist',
	 *   size?: 'small' | 'medium' | 'large',
	 *   spotifyId?: string,
	 *   appleId?: string,
	 *   amazonId?: string,
	 *   youtubeId?: string,
	 *   dspExempt?: boolean,
	 *   storeStandardUrl?: string,
	 *   storeAudiophileUrl?: string,
	 *   storefrontUrl?: string,
	 *   showFourthwall?: boolean,
	 *   compactLabel?: boolean
	 * }}
	 */
	let {
		type = 'album',
		size = 'large',
		spotifyId = '',
		appleId = '',
		amazonId = '',
		youtubeId = '',
		dspExempt = false,
		storeStandardUrl = '',
		storeAudiophileUrl = '',
		storefrontUrl = '',
		showFourthwall = true,
		compactLabel = false
	} = $props();

	let menuOpen = $state(false);
	/** @type {HTMLDivElement | null} */
	let containerEl = $state(null);

	// Reactive list of available DSP platforms for this item
	let availablePlatforms = $derived(
		dspManager.getAvailablePlatforms({
			type,
			spotifyId,
			appleId,
			amazonId,
			youtubeId,
			dspExempt
		})
	);

	// Reactive active platform (matches user's global default, or falls back to first available)
	let activePlatform = $derived(
		dspManager.resolveActiveDsp({
			type,
			spotifyId,
			appleId,
			amazonId,
			youtubeId,
			dspExempt
		})
	);

	// Primary button text based on size, type, and compact mode
	let primaryLabel = $derived.by(() => {
		if (!activePlatform) return '';
		if (size === 'small' || compactLabel) {
			return type === 'artist'
				? `Artist on ${activePlatform.config.shortLabel}`
				: `Stream on ${activePlatform.config.shortLabel}`;
		}
		return type === 'artist'
			? activePlatform.config.artistLabel
			: activePlatform.config.upgradeLabel;
	});

	// Size-specific padding and typography classes
	let sizeClasses = $derived.by(() => {
		if (size === 'small') {
			return 'px-3 py-1.5 text-xs';
		}
		if (size === 'medium') {
			return 'px-4 py-2 text-xs sm:text-sm';
		}
		return 'px-5 py-3 text-sm sm:text-base';
	});

	let chevronSizeClasses = $derived.by(() => {
		if (size === 'small') {
			return 'px-2 py-1.5 text-xs';
		}
		if (size === 'medium') {
			return 'px-2.5 py-2 text-xs sm:text-sm';
		}
		return 'px-3 py-3 text-sm sm:text-base';
	});

	/**
	 * Selects a platform as the user's global default and closes the dropdown.
	 * @param {'spotify' | 'apple' | 'amazon' | 'youtube'} id
	 */
	function handleSelectPlatform(id) {
		dspManager.setPreferredDsp(id);
		menuOpen = false;
	}

	/**
	 * Closes dropdown when clicking outside the button group.
	 * @param {MouseEvent} e
	 */
	function handleWindowClick(e) {
		if (menuOpen && containerEl && !containerEl.contains(/** @type {Node} */ (e.target))) {
			menuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

{#if activePlatform || (showFourthwall && (storeStandardUrl || storeAudiophileUrl || storefrontUrl))}
	<div
		bind:this={containerEl}
		class="inline-flex flex-wrap items-center gap-2.5 {menuOpen ? 'relative z-40' : ''}"
	>
		<!-- 1. SPLIT DSP STREAMING BUTTON -->
		{#if activePlatform}
			<div class="relative inline-flex shrink-0 rounded-xl shadow-lg">
				<!-- Main Action Link (Opens Preferred DSP in New Tab) -->
				<a
					href={activePlatform.url}
					target="_blank"
					rel="noopener noreferrer"
					style="background-color: {activePlatform.config.brandHex}; color: #ffffff;"
					class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-extrabold tracking-tight transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white {sizeClasses} {availablePlatforms.length >
					1
						? 'rounded-l-xl'
						: 'rounded-xl'}"
					title="{primaryLabel} (Opens in new tab)"
				>
					<!-- Platform Brand SVG Icon -->
					{#if activePlatform.id === 'spotify'}
						<svg class="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
							/>
						</svg>
					{:else if activePlatform.id === 'apple'}
						<svg class="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3"
							/>
						</svg>
					{:else if activePlatform.id === 'amazon'}
						<svg class="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M15.93 17.09c-2.75 2.03-6.73 3.11-10.16 3.11-4.81 0-9.14-1.78-12.42-4.74-.26-.23-.03-.55.28-.37 3.54 2.06 7.91 3.3 12.43 3.3 3.05 0 6.41-.63 9.51-1.95.46-.2.85.31.36.65zm1.16-1.29c-.35-.45-2.32-.21-3.21-.11-.27.03-.31-.2-.07-.38 1.57-1.11 4.15-.79 4.45-.42.3.38-.08 2.99-1.56 4.24-.23.19-.45.09-.35-.16.34-.85 1.09-2.72.74-3.17z"
								transform="translate(3, -2)"
							/>
						</svg>
					{:else}
						<svg class="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
							/>
						</svg>
					{/if}
					<span>{primaryLabel}</span>
					<span class="text-[11px] opacity-85" aria-hidden="true">↗</span>
				</a>

				<!-- Split Dropdown Toggle (Set Global Default DSP) -->
				{#if availablePlatforms.length > 1}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							menuOpen = !menuOpen;
						}}
						style="background-color: {activePlatform.config.brandHex}; color: #ffffff;"
						class="inline-flex items-center justify-center rounded-r-xl border-l border-black/25 font-bold transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white {chevronSizeClasses}"
						aria-label="Choose preferred streaming service"
						aria-expanded={menuOpen}
						title="Set your preferred default streaming app"
					>
						<svg
							class="h-3.5 w-3.5 transition-transform {menuOpen ? 'rotate-180' : ''}"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{#if menuOpen}
						<div
							class="absolute left-0 top-full z-[60] mt-2 w-64 overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-900 shadow-2xl"
							role="menu"
						>
							<div class="border-b border-slate-800 bg-slate-950/90 px-3.5 py-2.5">
								<span class="block text-xs font-extrabold tracking-wide text-blue-400 uppercase">
									Set Global Default
								</span>
								<span class="mt-0.5 block text-[11px] leading-snug text-slate-400">
									Select your preferred streaming app. We’ll remember it across all albums.
								</span>
							</div>

							<div class="divide-y divide-slate-800/60 py-1">
								{#each availablePlatforms as item (item.id)}
									<div class="flex items-center justify-between px-3 py-2 hover:bg-slate-800/80">
										<button
											type="button"
											onclick={() => handleSelectPlatform(item.id)}
											class="flex flex-1 items-center gap-2.5 text-left text-xs font-bold text-slate-100"
										>
											<span
												class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
												style="background-color: {item.config.brandHex};"
											></span>
											<span>{item.config.name}</span>
											{#if dspManager.preferredDsp === item.id}
												<span
													class="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300"
												>
													Default
												</span>
											{/if}
										</button>

										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											onclick={() => handleSelectPlatform(item.id)}
											class="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 transition-colors hover:border-blue-500 hover:text-white"
											title="Set as default and open {item.config.name}"
										>
											Open ↗
										</a>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- 2. FOURTHWALL DIRECT DIGITAL STOREFRONT LINKS (MP3/OGG & WAV/FLAC) -->
		{#if showFourthwall}
			{#if storeStandardUrl}
				<a
					href={storeStandardUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-cyan-500/50 bg-cyan-950/60 font-bold text-cyan-200 shadow-md transition-all hover:border-cyan-400 hover:bg-cyan-900/70 hover:text-white {sizeClasses}"
					title="Purchase DRM-Free High-Quality V0 MP3/OGG Archive directly via Fourthwall"
				>
					<span aria-hidden="true">🛍️</span>
					<span>
						{size === 'small' || compactLabel ? 'Buy MP3/OGG' : 'Buy High-Quality MP3/OGG'}
					</span>
					<span class="text-[11px] opacity-80" aria-hidden="true">↗</span>
				</a>
			{/if}

			{#if storeAudiophileUrl}
				<a
					href={storeAudiophileUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-500/60 bg-amber-950/60 font-bold text-amber-200 shadow-md transition-all hover:border-amber-400 hover:bg-amber-900/70 hover:text-white {sizeClasses}"
					title="Purchase Uncompressed Studio Master WAV/FLAC Archive directly via Fourthwall"
				>
					<span aria-hidden="true">🎚️</span>
					<span>
						{size === 'small' || compactLabel ? 'Buy WAV/FLAC' : 'Buy Master WAV/FLAC'}
					</span>
					<span class="text-[11px] opacity-80" aria-hidden="true">↗</span>
				</a>
			{/if}

			{#if !storeStandardUrl && !storeAudiophileUrl && storefrontUrl && type === 'artist'}
				<a
					href={storefrontUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-500/50 bg-amber-950/50 font-bold text-amber-200 shadow-md transition-all hover:border-amber-400 hover:bg-amber-900/60 hover:text-white {sizeClasses}"
					title="Visit Official Fourthwall Digital & Merch Storefront"
				>
					<span aria-hidden="true">🛍️</span>
					<span>{size === 'small' || compactLabel ? 'Store' : 'Official Storefront'}</span>
					<span class="text-[11px] opacity-80" aria-hidden="true">↗</span>
				</a>
			{/if}
		{/if}
	</div>
{/if}

