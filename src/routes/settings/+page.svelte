<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Preferences & Theme Settings Route: /settings)
	 * ============================================================================
	 * Dedicated Preferences, Adaptive Theme Picker & System Configuration Portal
	 * for Engine Room Records (`music.raggiesoft.com/settings`), modeled after
	 * `raggiesoft-book-library/sophia/settings.php`.
	 *
	 * Features:
	 * 1. Adaptive Theme Palette Selection:
	 *    - Choose between 5 custom theme palettes (`studio`, `industrial`, `sepia`,
	 *      `stardust`, `solstice`).
	 *    - Every theme automatically respects `prefers-color-scheme` (with tailored
	 *      Light and Dark surface/text/border tokens).
	 * 2. Appearance Mode Override (`auto` [Match OS], `light`, `dark`):
	 *    - Defaults to `auto` so it follows the user's OS `prefers-color-scheme`
	 *      in real time, while also allowing manual override.
	 * 3. Live Brand Logo Preview:
	 *    - Shows how the official Engine Room Records logo automatically swaps
	 *      between `/logos/engine-room-records-logo.png` (pure black on transparent
	 *      for light mode) and `/logos/engine-room-records-logo-white.png` (pure
	 *      white on transparent for dark mode).
	 * 4. Playback Session & Local Storage Management:
	 *    - Inspect or clear saved playback session and reset preferences.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { themeManager, THEME_PALETTES } from '#lib/theme.svelte.js';

	const COLOR_MODES = [
		{
			id: 'auto',
			label: 'Match System OS (Auto)',
			icon: '🌓',
			description:
				'Automatically switches between Light and Dark variants based on your device’s prefers-color-scheme setting.'
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

	let statusMessage = $state(/** @type {string | null} */ (null));

	/**
	 * Displays a brief confirmation banner when a setting is updated or reset.
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
	 * Clears the saved "Jump Back In" playback session from `localStorage`.
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
	 * Restores the dismissed Transparency Notice on the Home dashboard.
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
		notifyChange(
			'All theme preferences reset to System Default (Studio Cobalt + Match System OS).'
		);
	}
</script>

<svelte:head>
	<title>Preferences &amp; Theme Settings | Engine Room Records</title>
	<meta
		name="description"
		content="Customize your visual theme palette, OS color scheme behavior, and audio preferences on Engine Room Records."
	/>
	<link rel="canonical" href="https://music.raggiesoft.com/settings" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-10">
	<!-- Top Page Header -->
	<section class="border-b border-slate-800/80 pb-6">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<span class="text-xs font-bold tracking-widest text-blue-400 uppercase">
					Listener Preferences
				</span>
				<h1 class="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
					Settings &amp; Themes
				</h1>
				<p class="mt-1 text-xs text-slate-400 sm:text-sm">
					All themes respect your operating system’s <code class="font-mono text-slate-300"
						>prefers-color-scheme</code
					> setting and persist automatically in browser local storage.
				</p>
			</div>

			<a
				href={resolve('/')}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:text-sm"
			>
				&larr; Back to Player
			</a>
		</div>

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
	<!-- 1. APPEARANCE MODE (MATCH OS / LIGHT / DARK)                        -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<div class="mb-5">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				1. Color Scheme Mode (<code class="font-mono text-base text-blue-400"
					>prefers-color-scheme</code
				>)
			</h2>
			<p class="mt-1 text-xs text-slate-400 sm:text-sm">
				Choose whether Engine Room Records automatically follows your device’s system light/dark
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
						src="/logos/engine-room-records-logo.png"
						alt="Engine Room Records Light Mode Logo (Black on Transparent)"
						class="er-logo-light h-full w-full object-contain"
					/>
					<img
						src="/logos/engine-room-records-logo-white.png"
						alt="Engine Room Records Dark Mode Logo (White on Transparent)"
						class="er-logo-dark h-full w-full object-contain"
					/>
				</div>
				<div>
					<div class="text-xs font-bold tracking-wider text-blue-400 uppercase">
						Active Resolved Polarity: {themeManager.resolvedColorScheme.toUpperCase()} MODE
					</div>
					<p class="mt-0.5 text-xs text-slate-300">
						Currently displaying <code class="font-mono text-slate-200">{themeManager.logoUrl}</code
						> ({!themeManager.isDark ? 'Pure Black on Transparent' : 'Pure White on Transparent'}).
					</p>
				</div>
			</div>
			<span class="font-mono text-xs text-slate-400">
				OS Preference: {themeManager.osPrefersDark ? 'Dark' : 'Light'}
			</span>
		</div>
	</section>

	<!-- =================================================================== -->
	<!-- 2. USER-SELECTABLE ADAPTIVE THEME PALETTES                          -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<div class="mb-5">
			<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
				2. Select Theme Palette
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
	<!-- 3. PLAYBACK & LOCAL STORAGE CONTROLS                                -->
	<!-- =================================================================== -->
	<section class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl sm:p-8">
		<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
			3. Playback &amp; Storage Controls
		</h2>
		<p class="mt-1 text-xs text-slate-400 sm:text-sm">
			Manage your locally stored listening session and interface notices. All data is stored
			strictly on your device via <code class="font-mono text-slate-300">localStorage</code>.
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
				onclick={resetAllPreferences}
				class="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-900/60 hover:text-white sm:text-sm"
			>
				Reset Theme to Default
			</button>
		</div>
	</section>
</div>

