<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * FILE: src/routes/settings/+page.svelte
	 * URL SERVED: https://music.raggiesoft.com/settings
	 * ============================================================================
	 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
	 * Paired with `src/routes/settings/+page.js` (`export const prerender = true`),
	 * this component renders the interactive Preferences & Theme Settings screen
	 * at `/settings`.
	 *
	 * HOW PREFERENCES WORK WITHOUT A SERVER DATABASE:
	 * Every button on this page calls methods on two shared Svelte 5 reactive
	 * stores (`themeManager` from `#lib/theme.svelte.js` and `dspManager` from
	 * `#lib/dspPreference.svelte.js`). Those stores:
	 *   1. Update reactive `$state` properties immediately (so buttons, badges,
	 *      CSS custom properties on `<html>`, and logos update in real time!).
	 *   2. Save the chosen value into `window.localStorage` inside the user's
	 *      own browser so their choice is remembered on future visits.
	 *
	 * WHAT THE USER SEES & INTERACTS WITH ON THIS SCREEN:
	 * 1. Preferred Streaming Platform Picker (Spotify, Apple Music, Amazon Music,
	 *    YouTube Music) + Autoplay on Shared Song Links toggle (defaults to Off
	 *    so opening a link never surprises someone with sudden audio) + Streaming
	 *    Support Reminder reset button.
	 * 2. Appearance Mode Selector (`auto` Match System Appearance, `light`, `dark`)
	 *    with a live preview of the black vs. white Engine Room Records studio logo.
	 * 3. Adaptive Theme Palette Picker (`studio`, `industrial`, `sepia`,
	 *    `stardust`, `solstice`) showing both Light and Dark color swatches.
	 * 4. Playback & Storage Controls to clear the saved "Jump Back In" session,
	 *    restore dismissed banners, or reset everything to factory defaults.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { themeManager, THEME_PALETTES } from '#lib/theme.svelte.js';
	import {
		dspManager,
		DSP_PLATFORMS,
		DSP_ORDER,
		MAX_NUDGE_DISMISSALS
	} from '#lib/dspPreference.svelte.js';

	// Static array of configuration objects describing the 3 brightness modes.
	// Defining data in an array lets us render all 3 cards cleanly with `{#each}`
	// in the HTML template instead of copy-pasting nearly identical `<button>` markup!
	const COLOR_MODES = [
		{
			id: 'auto',
			label: 'Match System Appearance (Auto)',
			icon: '🌓',
			description:
				'Automatically switches between Light and Dark variants based on your device’s system appearance setting.'
		},
		{
			id: 'light',
			label: 'Always Light Mode',
			icon: '☀️',
			description:
				'Uses the daylight-balanced Light Mode variant of your selected theme palette and the black Engine Room logo.'
		},
		{
			id: 'dark',
			label: 'Always Dark Mode',
			icon: '🌙',
			description:
				'Uses the studio-calibrated Dark Mode variant of your selected theme palette and the white Engine Room logo.'
		}
	];

	// Reactive `$state` holding a temporary toast confirmation string (or `null` when hidden).
	let statusMessage = $state(/** @type {string | null} */ (null));

	/**
	 * Displays a brief confirmation banner when a setting is updated or reset,
	 * then clears `statusMessage` back to `null` after 3,000 milliseconds (3 seconds)
	 * using JavaScript's built-in `setTimeout()` timer.
	 *
	 * @param {string} msg
	 */
	function notifyChange(msg) {
		statusMessage = msg;
		setTimeout(() => {
			statusMessage = null;
		}, 3000);
	}

	/**
	 * Selects a theme palette and persists to `localStorage`.
	 * @param {'studio' | 'industrial' | 'sepia' | 'stardust' | 'solstice'} themeId
	 * @param {string} label
	 */
	function selectTheme(themeId, label) {
		themeManager.setTheme(themeId);
		notifyChange(`Theme updated to "${label}" (persisted to local storage).`);
	}

	/**
	 * Selects the appearance mode (`auto` | `light` | `dark`) and persists to `localStorage`.
	 * @param {'auto' | 'light' | 'dark'} modeId
	 * @param {string} label
	 */
	function selectColorMode(modeId, label) {
		themeManager.setColorMode(modeId);
		notifyChange(`Appearance mode set to "${label}".`);
	}

	/**
	 * Selects the listener's global preferred streaming platform so `<StoreButton />`
	 * components across every album and artist page highlight their favorite app first.
	 * @param {'spotify' | 'apple' | 'amazon' | 'youtube'} platformId
	 * @param {string} name
	 */
	function selectPreferredDsp(platformId, name) {
		dspManager.setPreferredDsp(platformId);
		notifyChange(`Global preferred streaming service set to "${name}".`);
	}

	/**
	 * Resets the end-of-track DSP support reminder counter.
	 */
	function restoreStreamingNudges() {
		dspManager.resetPlayerNudges();
		notifyChange('End-of-track streaming support reminders restored.');
	}

	/**
	 * Updates whether deep-linked track URLs (`?track=...`) automatically start audio playback.
	 * Defaults to `false` to respect WCAG 2.1 Audio Control accessibility guidelines.
	 * @param {boolean} enabled
	 */
	function selectAutoplayDeepLinks(enabled) {
		dspManager.setAutoplayDeepLinks(enabled);
		notifyChange(
			enabled
				? 'Direct Song Link Autoplay enabled: shared song links will start playing automatically.'
				: 'Direct Song Link Autoplay disabled (Default): shared song links will scroll and expand without auto-starting audio.'
		);
	}

	/**
	 * Clears the saved "Jump Back In" playback session from `localStorage`.
	 * Wrapped in `try / catch` because strict browser privacy modes (like Safari
	 * Private Browsing) can throw a `SecurityError` when touching `localStorage`.
	 */
	function clearPlaybackHistory() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('raggiesoft_music_session_v1');
				notifyChange('Saved playback session cleared.');
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * Restores the dismissed Transparency Notice on the Home dashboard by removing
	 * its dismissal flag from `localStorage`.
	 */
	function restoreTransparencyBanner() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('raggiesoft_music_transparency_dismissed');
				notifyChange('Transparency & Dual Timeline banner restored on Home screen.');
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * Resets all theme and appearance preferences to factory defaults.
	 */
	function resetAllPreferences() {
		themeManager.reset();
		dspManager.setAutoplayDeepLinks(false);
		notifyChange(
			'All theme & autoplay preferences reset to System Default (Studio Cobalt + Match System OS + Autoplay Off).'
		);
	}
</script>

<!--
	Mark `/settings` with `noindex,follow`: utility preference screens shouldn't
	clutter search engine results, whereas songs, albums, and artists SHOULD be indexed.
-->
<svelte:head>
	<title>Preferences &amp; Theme Settings | The Listening Room (Engine Room Records)</title>
	<meta name="robots" content="noindex,follow" />
	<meta
		name="description"
		content="Customize your preferred streaming service, visual theme palette, OS color scheme behavior, and audio preferences in The Listening Room."
	/>
	<link rel="canonical" href="https://music.raggiesoft.com/settings" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-10">
	<!-- Top Page Header -->
	<section class="border-b border-slate-800/80 pb-6">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<span class="text-xs font-bold tracking-widest text-blue-400 uppercase">
					The Listening Room Preferences
				</span>
				<h1 class="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
					Settings, Streaming &amp; Themes
				</h1>
				<p class="mt-1 text-xs text-slate-400 sm:text-sm">
					Configure your default streaming app, adaptive theme palette, and local session
					preferences.
				</p>
			</div>

			<a
				href={resolve('/')}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:text-sm"
			>
				&larr; Back to The Listening Room
			</a>
		</div>

		<!--
			Accessible Live Confirmation Toast (`role="status"` + `aria-live="polite"`):
			Screen readers announce `statusMessage` politely after finishing the current
			word whenever `notifyChange()` sets a confirmation string!
		-->
		{#if statusMessage}
			<div
				class="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs font-bold text-emerald-200 sm:text-sm"
				role="status"
				aria-live="polite"
			>
				<span>✓</span>
				<span>{statusMessage}</span>
			</div>
		{/if}
	</section>

	<!-- =================================================================== -->
	<!-- 1. PREFERRED STREAMING PLATFORM & DEEP-LINK AUTOPLAY                -->
	<!-- Inside `{#each}`, `{@const ...}` declares scoped local helper       -->
	<!-- constants for that single loop iteration (`platform`, `isSelected`) -->
	<!-- and `aria-pressed={isSelected}` tells assistive tech which toggle   -->
	<!-- button is currently selected!                                       -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<div class="mb-5">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				1. Preferred Streaming Platform &amp; Playback Behavior
			</h2>
			<p class="mt-1 text-xs text-slate-400 sm:text-sm">
				Select your primary music service. Every <strong class="text-slate-200"
					>Stream in High-Res / Lossless</strong
				> button across The Listening Room will automatically default to this platform when available.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each DSP_ORDER as platformId (platformId)}
				{@const platform = DSP_PLATFORMS[platformId]}
				{@const isSelected = dspManager.preferredDsp === platformId}
				<button
					type="button"
					onclick={() => selectPreferredDsp(platformId, platform.name)}
					class="flex flex-col justify-between rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isSelected
						? 'border-blue-500 bg-blue-950/30 shadow-lg ring-1 ring-blue-500'
						: 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'}"
					aria-pressed={isSelected}
				>
					<div class="flex items-center justify-between gap-2">
						<span
							class="inline-block h-3.5 w-3.5 rounded-full"
							style="background-color: {platform.brandHex};"
						></span>
						{#if isSelected}
							<span
								class="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase"
							>
								Default
							</span>
						{/if}
					</div>
					<div class="mt-3">
						<h3 class="text-sm font-bold text-white">{platform.name}</h3>
						<p class="mt-1 text-[11px] leading-snug text-slate-400">
							{platform.upgradeLabel}
						</p>
					</div>
				</button>
			{/each}
		</div>

		<!-- Deep-Link Track Autoplay Toggle -->
		<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
			<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-xs font-extrabold tracking-wide text-white sm:text-sm">
							Autoplay on Shared Song Links
						</span>
						<span
							class="rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase {dspManager.autoplayDeepLinks
								? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
								: 'border-amber-500/50 bg-amber-950/60 text-amber-300'}"
						>
							{dspManager.autoplayDeepLinks ? 'On (Autoplay)' : 'Off (Default)'}
						</span>
					</div>
					<p class="mt-1 text-xs leading-relaxed text-slate-400">
						When following a direct song link from a story or lore page, The Listening Room scrolls
						to the song and expands its Lyrics &amp; Lore. Defaults to
						<strong class="text-slate-200">Off</strong> so listeners are never surprised by unexpected
						audio when opening a page.
					</p>
				</div>

				<div class="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onclick={() => selectAutoplayDeepLinks(false)}
						aria-pressed={!dspManager.autoplayDeepLinks}
						class="rounded-xl border px-3.5 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {!dspManager.autoplayDeepLinks
							? 'border-blue-500 bg-blue-600 text-white shadow-md'
							: 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}"
					>
						Off (Default)
					</button>
					<button
						type="button"
						onclick={() => selectAutoplayDeepLinks(true)}
						aria-pressed={dspManager.autoplayDeepLinks}
						class="rounded-xl border px-3.5 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {dspManager.autoplayDeepLinks
							? 'border-emerald-500 bg-emerald-600 text-white shadow-md'
							: 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}"
					>
						On (Autoplay)
					</button>
				</div>
			</div>
		</div>

		<div
			class="mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:flex-row sm:items-center"
		>
			<div>
				<div class="text-xs font-bold text-slate-200">
					Respectful Support Reminders ({dspManager.nudgeDismissCount} / {MAX_NUDGE_DISMISSALS} Dismissals)
				</div>
				<p class="mt-0.5 text-xs text-slate-400">
					{#if dspManager.canShowPlayerNudge}
						Gentle end-of-track streaming upgrade reminders are currently enabled.
					{:else}
						You have dismissed the end-of-track streaming reminder—we’ve permanently hidden it so
						you can enjoy 128kbps web playback uninterrupted.
					{/if}
				</p>
			</div>
			{#if dspManager.nudgeDismissCount > 0}
				<button
					type="button"
					onclick={restoreStreamingNudges}
					class="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
				>
					Restore Streaming Reminders
				</button>
			{/if}
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 2. APPEARANCE MODE (MATCH OS / LIGHT / DARK)                        -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<div class="mb-5">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				2. Color Scheme Mode
			</h2>
			<p class="mt-1 text-xs text-slate-400 sm:text-sm">
				Choose whether The Listening Room automatically follows your device’s system light/dark
				schedule or stays locked to a specific brightness mode.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each COLOR_MODES as mode (mode.id)}
				{@const isSelected = themeManager.colorMode === mode.id}
				<button
					type="button"
					onclick={() =>
						selectColorMode(/** @type {'auto' | 'light' | 'dark'} */ (mode.id), mode.label)}
					class="flex flex-col items-start justify-between rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isSelected
						? 'border-blue-500 bg-blue-950/30 shadow-lg ring-1 ring-blue-500'
						: 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'}"
					aria-pressed={isSelected}
				>
					<div class="flex w-full items-center justify-between">
						<span class="text-2xl">{mode.icon}</span>
						{#if isSelected}
							<span
								class="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase"
							>
								Active
							</span>
						{/if}
					</div>
					<div class="mt-4">
						<h3 class="text-base font-bold text-white">{mode.label}</h3>
						<p class="mt-1 text-xs leading-relaxed text-slate-400">
							{mode.description}
						</p>
					</div>
				</button>
			{/each}
		</div>

		<!-- Active Resolution Status Bar & Dual Logo Preview -->
		<div
			class="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:flex-row sm:items-center"
		>
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-md"
				>
					<img
						src="https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo.png"
						alt="Engine Room Records Light Mode Logo (Black on Transparent)"
						width="40"
						height="40"
						decoding="async"
						class="er-logo-light h-full w-full object-contain"
					/>
					<img
						src="https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo-white.png"
						alt="Engine Room Records Dark Mode Logo (White on Transparent)"
						width="40"
						height="40"
						decoding="async"
						class="er-logo-dark h-full w-full object-contain"
					/>
				</div>
				<div>
					<div class="text-xs font-bold tracking-wider text-blue-400 uppercase">
						Active Appearance: {themeManager.resolvedColorScheme.toUpperCase()} MODE
					</div>
					<p class="mt-0.5 text-xs text-slate-300">
						Currently displaying the {!themeManager.isDark
							? 'Light Mode (Black on Transparent)'
							: 'Dark Mode (White on Transparent)'} Engine Room Records studio emblem.
					</p>
				</div>
			</div>
			<span class="font-mono text-xs text-slate-400">
				Device Appearance: {themeManager.osPrefersDark ? 'Dark' : 'Light'}
			</span>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 3. USER-SELECTABLE ADAPTIVE THEME PALETTES                          -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<div class="mb-5">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				3. Select Theme Palette
			</h2>
			<p class="mt-1 text-xs text-slate-400 sm:text-sm">
				Every theme below includes both a daylight-balanced Light Mode and a studio-calibrated Dark
				Mode so it adapts seamlessly to your Color Scheme Mode above.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each THEME_PALETTES as theme (theme.id)}
				{@const isSelected = themeManager.theme === theme.id}
				<button
					type="button"
					onclick={() =>
						selectTheme(
							/** @type {'studio' | 'industrial' | 'sepia' | 'stardust' | 'solstice'} */ (theme.id),
							theme.name
						)}
					class="flex flex-col justify-between rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {isSelected
						? 'border-blue-500 bg-blue-950/30 shadow-lg ring-1 ring-blue-500'
						: 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'}"
					aria-pressed={isSelected}
				>
					<div>
						<div class="flex items-center justify-between gap-2">
							<span class="font-mono text-[11px] font-bold tracking-wider text-blue-400 uppercase">
								Adaptive Light &amp; Dark Theme
							</span>
							{#if isSelected}
								<span
									class="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase"
								>
									Selected
								</span>
							{/if}
						</div>

						<h3 class="mt-1 text-lg font-extrabold text-white">{theme.name}</h3>
						<p class="mt-1.5 text-xs leading-relaxed text-slate-400">
							{theme.description}
						</p>
					</div>

					<!-- Dual Light & Dark Color Swatch Preview Bar -->
					<div class="mt-5 flex items-center gap-3 border-t border-slate-800/80 pt-3.5">
						<div class="flex items-center gap-1.5">
							<span
								class="inline-block h-5 w-5 rounded-full border border-slate-600 shadow-inner"
								style="background-color: {theme.lightPreview.bg};"
								title="Light Mode Surface"
							></span>
							<span
								class="inline-block h-5 w-5 rounded-full border border-slate-600 shadow-inner"
								style="background-color: {theme.lightPreview.accent};"
								title="Light Mode Accent"
							></span>
							<span class="text-[11px] font-medium text-slate-400">Light</span>
						</div>

						<span class="text-slate-600">&bull;</span>

						<div class="flex items-center gap-1.5">
							<span
								class="inline-block h-5 w-5 rounded-full border border-slate-600 shadow-inner"
								style="background-color: {theme.darkPreview.bg};"
								title="Dark Mode Surface"
							></span>
							<span
								class="inline-block h-5 w-5 rounded-full border border-slate-600 shadow-inner"
								style="background-color: {theme.darkPreview.accent};"
								title="Dark Mode Accent"
							></span>
							<span class="text-[11px] font-medium text-slate-400">Dark</span>
						</div>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 4. PLAYBACK & LOCAL STORAGE CONTROLS                                -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
			4. Playback &amp; Storage Controls
		</h2>
		<p class="mt-1 text-xs text-slate-400 sm:text-sm">
			Manage your locally saved listening session and interface notices. All preferences are saved
			privately on your device.
		</p>

		<div class="mt-6 flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={clearPlaybackHistory}
				class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:text-sm"
			>
				Clear Saved "Jump Back In" Session
			</button>

			<button
				type="button"
				onclick={restoreTransparencyBanner}
				class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:text-sm"
			>
				Restore Transparency Notice Banner
			</button>

			<button
				type="button"
				onclick={restoreStreamingNudges}
				class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:text-sm"
			>
				Restore Streaming Support Reminders
			</button>

			<button
				type="button"
				onclick={resetAllPreferences}
				class="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-900/60 hover:text-white sm:text-sm"
			>
				Reset Theme to Default
			</button>
		</div>
	</section>
</div>
