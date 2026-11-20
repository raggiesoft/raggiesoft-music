/**
 * @license MIT
 * ============================================================================
 * src/lib/theme.svelte.js — Global Reactive Theme & Appearance Engine
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript & Svelte 5 Runes Guide):
 *   Why is this file named `.svelte.js` instead of `.js`?
 *     In Svelte 5, naming a JavaScript module `.svelte.js` unlocks "Universal
 *     Reactivity"—allowing us to use Svelte 5 Runes (`$state`, `$derived`, and
 *     `$derived.by`) directly inside a JavaScript `class`! Whenever any UI
 *     component reads `themeManager.theme` or `themeManager.isDark`, Svelte
 *     automatically re-renders that component the instant the value changes.
 *
 *   How this file connects to The Listening Room (`music.raggiesoft.com`):
 *     - Inputs: Reads the visitor's OS color preference via
 *       `window.matchMedia('(prefers-color-scheme: dark)')` and saved settings
 *       from `localStorage.getItem('engine_room_settings')`.
 *     - Outputs: Updates `data-theme`, `data-color-scheme`, and `data-color-mode`
 *       on `<html>` (which drives the CSS variables in `src/app.css`), updates
 *       `<meta name="theme-color">` for mobile browser toolbars, and exports
 *       `THEME_PALETTES` + the `themeManager` singleton used by `+layout.svelte`
 *       and `/settings`.
 *
 * Architectural Overview:
 * 1. OS `prefers-color-scheme` Integration:
 *    - Every theme palette is dual-architected with both a Light Mode ("Day Shift")
 *      and Dark Mode ("Night Shift") variant.
 *    - By default (`colorMode: 'auto'`), all themes automatically adapt in real time
 *      to the user's operating system `prefers-color-scheme` media query.
 *    - Users may also explicitly lock Light or Dark mode if desired.
 * 2. User-Selectable Theme Palettes:
 *    - `studio`: Studio Cobalt (Crisp Slate & Electric Blue — Default)
 *    - `industrial`: Engine Room Industrial (Poured Concrete / Gunmetal & Hazard Red)
 *    - `sepia`: Analog Vinyl (Warm Parchment / Espresso & Vacuum-Tube Amber)
 *    - `stardust`: Stardust Violet (Starlight Lavender / Nebula Obsidian & Cosmic Violet)
 *    - `solstice`: Arctic Aurora (Glacial Frost / Midnight Solstice & Borealis Emerald)
 * 3. Client-Side Persistence:
 *    - Persists immediately to `localStorage` under `'engine_room_settings'`.
 * 4. Dual Logo Switching:
 *    - Resolves `/logos/engine-room-records-logo.png` (black on transparent) in
 *      Light Mode and `/logos/engine-room-records-logo-white.png` (white on
 *      transparent) in Dark Mode.
 * ============================================================================
 */

// Key used in `window.localStorage` (must match the zero-FOUC inline script in `src/app.html`!)
const STORAGE_KEY = 'engine_room_settings';

/**
 * Available user-selectable theme palettes.
 * Every palette natively supports both Light and Dark `prefers-color-scheme` modes,
 * and includes swatch preview hex codes for the visual theme picker cards on `/settings`.
 */
export const THEME_PALETTES = [
	{
		id: 'studio',
		name: 'Studio Cobalt (Default)',
		description: 'Crisp studio slate paired with electric cobalt blue accents.',
		lightPreview: { bg: '#f8fafc', surface: '#ffffff', text: '#0f172a', accent: '#2563eb' },
		darkPreview: { bg: '#020617', surface: '#0f172a', text: '#f8fafc', accent: '#3b82f6' }
	},
	{
		id: 'industrial',
		name: 'Engine Room Industrial',
		description:
			'Poured concrete and stamped iron by day; deep vault gunmetal and hazard red by night.',
		lightPreview: { bg: '#e9ecef', surface: '#f8f9fa', text: '#1a1d20', accent: '#c82333' },
		darkPreview: { bg: '#090b0e', surface: '#14171c', text: '#f1f3f5', accent: '#ef4444' }
	},
	{
		id: 'sepia',
		name: 'Analog Vinyl (Sepia)',
		description: 'Warm archival parchment in light mode; mahogany tube-amp glow in dark mode.',
		lightPreview: { bg: '#f5efe6', surface: '#fdfaf5', text: '#2a2118', accent: '#b45309' },
		darkPreview: { bg: '#14100c', surface: '#211b15', text: '#f5ebe0', accent: '#f59e0b' }
	},
	{
		id: 'stardust',
		name: 'Stardust Violet',
		description:
			'Inspired by Progress Street and Twin Moons. Soft lavender light and deep nebula violet dark.',
		lightPreview: { bg: '#f5f3ff', surface: '#ffffff', text: '#1e1b4b', accent: '#7c3aed' },
		darkPreview: { bg: '#080514', surface: '#130d26', text: '#f3e8ff', accent: '#8b5cf6' }
	},
	{
		id: 'solstice',
		name: 'Arctic Aurora',
		description:
			'Inspired by The Arctic Symphony Project. Glacial frost by day and emerald aurora by night.',
		lightPreview: { bg: '#f0fdf9', surface: '#ffffff', text: '#062c22', accent: '#059669' },
		darkPreview: { bg: '#03110e', surface: '#09221c', text: '#ecfdf5', accent: '#10b981' }
	}
];

class ThemeManager {
	// `$state(...)` is a Svelte 5 Rune that turns a normal class property into a reactive signal.
	// Assigning `this.theme = 'stardust'` automatically updates every component reading `themeManager.theme`!
	/** @type {'studio' | 'industrial' | 'sepia' | 'stardust' | 'solstice'} */
	theme = $state('studio');

	// Tracks whether the user chose `'auto'` (follow OS), `'light'`, or `'dark'`
	/** @type {'auto' | 'light' | 'dark'} */
	colorMode = $state('auto');

	// Tracks the live boolean result of `window.matchMedia('(prefers-color-scheme: dark)')`
	/** @type {boolean} */
	osPrefersDark = $state(false);

	// True once `init()` has hydrated saved settings in the browser
	/** @type {boolean} */
	initialized = $state(false);

	/**
	 * Resolved active color scheme ('light' | 'dark').
	 * `$derived.by(() => { ... })` is Svelte 5's multi-line computed value rune:
	 * it automatically recalculates whenever `this.colorMode` or `this.osPrefersDark` changes!
	 * Always respects OS `prefers-color-scheme` when `colorMode === 'auto'`.
	 */
	resolvedColorScheme = $derived.by(() => {
		if (this.colorMode === 'light') return 'light';
		if (this.colorMode === 'dark') return 'dark';
		return this.osPrefersDark ? 'dark' : 'light';
	});

	/**
	 * Boolean convenience getter indicating if dark mode is currently active.
	 * `$derived(expression)` is the concise single-expression form of `$derived.by`.
	 */
	isDark = $derived(this.resolvedColorScheme === 'dark');

	/**
	 * Returns the appropriate transparent Engine Room Records logo for the active color scheme.
	 * - Light Mode: Black logo on transparent background (`/logos/engine-room-records-logo.png`)
	 * - Dark Mode: White logo on transparent background (`/logos/engine-room-records-logo-white.png`)
	 */
	logoUrl = $derived(
		this.isDark
			? 'https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo-white.png'
			: 'https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo.png'
	);

	/**
	 * Initializes the theme manager on client mount, attaches the OS `prefers-color-scheme`
	 * media query listener, and applies the saved or default preferences.
	 */
	init() {
		// Guard against Server-Side Rendering (SSR) where `window` does not exist
		if (typeof window === 'undefined') return;

		// 1. Detect initial OS prefers-color-scheme
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.osPrefersDark = mediaQuery.matches;

		// 2. Listen for real-time OS theme changes (e.g., macOS/iOS Sunset auto-switch)
		const handleMediaChange = (/** @type {MediaQueryListEvent} */ e) => {
			this.osPrefersDark = e.matches;
			this.applyToDom();
		};
		mediaQuery.addEventListener('change', handleMediaChange);

		// 3. Load saved settings from localStorage (wrapped in try/catch in case private browsing blocks storage)
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				// Validate saved IDs against known palettes/modes before applying
				if (parsed.theme && THEME_PALETTES.some((p) => p.id === parsed.theme)) {
					this.theme = parsed.theme;
				}
				if (parsed.colorMode && ['auto', 'light', 'dark'].includes(parsed.colorMode)) {
					this.colorMode = parsed.colorMode;
				}
			}
		} catch (err) {
			console.warn('Unable to read theme settings from localStorage:', err);
		}

		this.initialized = true;
		this.applyToDom();
	}

	/**
	 * Updates the active theme palette and persists to localStorage.
	 * @param {'studio' | 'industrial' | 'sepia' | 'stardust' | 'solstice'} newTheme
	 */
	setTheme(newTheme) {
		this.theme = newTheme;
		this.save();
		this.applyToDom();
	}

	/**
	 * Updates the color mode ('auto' | 'light' | 'dark') and persists to localStorage.
	 * @param {'auto' | 'light' | 'dark'} newMode
	 */
	setColorMode(newMode) {
		this.colorMode = newMode;
		this.save();
		this.applyToDom();
	}

	/**
	 * Cycles or toggles between Light, Dark, and Auto modes (used by the header quick-toggle button).
	 */
	cycleColorMode() {
		if (this.colorMode === 'auto') {
			// Jump immediately to the opposite of the current OS mode so the first click has an obvious visual effect
			this.setColorMode(this.osPrefersDark ? 'light' : 'dark');
		} else if (this.colorMode === 'light') {
			this.setColorMode('dark');
		} else {
			this.setColorMode('auto');
		}
	}

	/**
	 * Resets theme preferences to factory defaults ('studio' + 'auto') and clears overrides.
	 */
	reset() {
		this.theme = 'studio';
		this.colorMode = 'auto';
		this.save();
		this.applyToDom();
	}

	/**
	 * Persists current settings as a JSON string in `window.localStorage`.
	 */
	save() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					theme: this.theme,
					colorMode: this.colorMode
				})
			);
		} catch (err) {
			console.warn('Failed to save theme settings to localStorage:', err);
		}
	}

	/**
	 * Synchronizes `data-theme`, `data-color-scheme`, and `data-color-mode` attributes
	 * on `document.documentElement` (`<html>`) so CSS custom properties in `src/app.css` update immediately.
	 */
	applyToDom() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		const scheme = this.resolvedColorScheme;

		// Note: `root.dataset.colorScheme = 'dark'` sets the HTML attribute `data-color-scheme="dark"`
		root.dataset.theme = this.theme;
		root.dataset.colorScheme = scheme;
		root.dataset.colorMode = this.colorMode;
		// `style.colorScheme` tells native browser scrollbars and form controls whether to render dark or light
		root.style.colorScheme = scheme;

		// Update PWA <meta name="theme-color"> for native browser chrome matching
		const metaTheme = document.querySelector('meta[name="theme-color"]');
		if (metaTheme) {
			const palette = THEME_PALETTES.find((p) => p.id === this.theme) || THEME_PALETTES[0];
			const bg = scheme === 'dark' ? palette.darkPreview.bg : palette.lightPreview.bg;
			metaTheme.setAttribute('content', bg);
		}
	}
}

// Export a single shared ("singleton") instance so every page and component shares one theme state
export const themeManager = new ThemeManager();
