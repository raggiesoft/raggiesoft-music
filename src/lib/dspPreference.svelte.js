/**
 * @license MIT
 * ============================================================================
 * src/lib/dspPreference.svelte.js — Preferred Streaming App & Respectful Nudge Manager
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript & Svelte 5 Runes Guide):
 *   What is a "DSP", and what does this file do?
 *     "DSP" stands for Digital Service Provider—streaming music apps like
 *     Spotify, Apple Music, Amazon Music, and YouTube Music. On The Listening
 *     Room (`music.raggiesoft.com`), listeners can preview free 128 kbps song
 *     streams and then click one button (`<StoreButton />`) to jump straight
 *     to full lossless/high-res audio on their favorite streaming app.
 *
 *     Rather than cluttering every album page with four separate buttons,
 *     this `.svelte.js` Svelte 5 Runes module remembers which streaming app the
 *     listener prefers (`preferredDsp`), saves it in `localStorage`, and keeps
 *     every `<StoreButton />` across the entire website synchronized instantly!
 *
 * Architectural Responsibilities:
 * 1. Global Preferred Streaming Platform (`preferredDsp`):
 *    - Synchronizes the user's preferred Digital Service Provider (`spotify`,
 *      `apple`, `amazon`, or `youtube`) across every `<StoreButton />` instance
 *      and the persistent bottom `<Player />` bar in real time.
 *    - Persists selection to `localStorage` under `user_preferred_dsp` (matching
 *      the `store-button.php` convention used on `raggiesoft-hub`).
 * 2. Smart Partial-DSP Fallback Resolution (`resolveActiveDsp`):
 *    - Some releases have partial DSP availability (e.g., an album live on
 *      Spotify, Apple Music, and Amazon Music, while still pending on YouTube).
 *    - `resolveActiveDsp()` checks if the user's global `preferredDsp` is
 *      available on that specific album/artist; if not, it automatically falls
 *      back to the first available platform so a broken or empty link is never
 *      rendered.
 * 3. Respectful Nudge Dismissal Tracking (`nudgeDismissCount`):
 *    - Tracks how many times the listener has dismissed the gentle DSP/Fourthwall
 *      support prompt in the player (`raggiesoft_listening_room_nudge_dismissals`).
 *    - After 3 dismissals (or an explicit "Don't remind me" action), the floating
 *      player nudge permanently stays hidden while keeping 128kbps playback
 *      uninterrupted for listeners who do not use a commercial DSP.
 * ============================================================================
 */

// Keys used in `window.localStorage` to persist user preferences across visits
const STORAGE_KEY_DSP = 'user_preferred_dsp';
const LEGACY_STORAGE_KEY_DSP = 'preferredMusicStore';
const STORAGE_KEY_NUDGE_DISMISSALS = 'raggiesoft_listening_room_nudge_dismissals';
const STORAGE_KEY_AUTOPLAY_DEEPLINKS = 'raggiesoft_music_autoplay_deeplinks_v1';
// Maximum number of times the end-of-song support banner may be dismissed before staying hidden forever
export const MAX_NUDGE_DISMISSALS = 3;

/**
 * Detects the most natural default streaming platform for a first-time visitor
 * based on their operating system / device ecosystem before they explicitly
 * choose a global default:
 * - Android & ChromeOS (`Android`, `CrOS`) -> `'youtube'` (YouTube / YouTube Music,
 *   which is native to Google's ecosystem).
 * - macOS, iOS, and iPadOS (`Mac`, `iPhone`, `iPad`, `iPod`) -> `'apple'` (Apple Music,
 *   which is pre-installed natively on every Apple device).
 * - Windows, Linux, and other desktop platforms -> `'spotify'`.
 *
 * Note: If a specific album is not yet on the detected default platform (e.g., a
 * partial-DSP release where `youtubeId` is still empty), `resolveActiveDsp()`
 * automatically falls back to the first available platform on that release.
 *
 * @returns {'spotify' | 'apple' | 'amazon' | 'youtube'}
 */
export function detectSystemDefaultDsp() {
	// During Server-Side Rendering (Node.js), `navigator` does not exist yet, so default to `'spotify'`
	if (typeof navigator === 'undefined') return 'spotify';
	const ua = navigator.userAgent || '';
	const platform = navigator.platform || '';
	const combined = ua + ' ' + platform;
	if (/Android|CrOS/i.test(combined)) {
		return 'youtube';
	}
	if (/Macintosh|MacIntel|MacPPC|Mac68K|iPhone|iPad|iPod/i.test(combined)) {
		return 'apple';
	}
	return 'spotify';
}

/**
 * Canonical configuration dictionary for each supported streaming platform.
 * Brand colors and labels mirror `raggiesoft-hub/includes/components/store-button.php`
 * while framing the audio fidelity upgrade over the 128kbps web preview stream.
 */
export const DSP_PLATFORMS = {
	spotify: {
		id: 'spotify',
		name: 'Spotify',
		shortLabel: 'Spotify',
		upgradeLabel: 'Stream High-Res on Spotify',
		artistLabel: 'Follow & Stream on Spotify',
		bgStyle: 'background-color: #1DB954; color: #000000; border-color: #1DB954;',
		hoverClass: 'hover:brightness-110',
		textColor: '#000000',
		brandHex: '#1DB954'
	},
	apple: {
		id: 'apple',
		name: 'Apple Music',
		shortLabel: 'Apple Music',
		upgradeLabel: 'Listen in Lossless HD on Apple Music',
		artistLabel: 'Listen in Lossless on Apple Music',
		bgStyle: 'background-color: #FA243C; color: #ffffff; border-color: #FA243C;',
		hoverClass: 'hover:brightness-110',
		textColor: '#ffffff',
		brandHex: '#FA243C'
	},
	amazon: {
		id: 'amazon',
		name: 'Amazon Music',
		shortLabel: 'Amazon Music',
		upgradeLabel: 'Stream Ultra HD on Amazon Music',
		artistLabel: 'Stream Ultra HD on Amazon Music',
		bgStyle: 'background-color: #00A8E1; color: #000000; border-color: #00A8E1;',
		hoverClass: 'hover:brightness-110',
		textColor: '#000000',
		brandHex: '#00A8E1'
	},
	youtube: {
		id: 'youtube',
		name: 'YouTube Music',
		shortLabel: 'YouTube',
		upgradeLabel: 'Stream Full Audio on YouTube',
		artistLabel: 'Subscribe & Stream on YouTube',
		bgStyle: 'background-color: #FF0000; color: #ffffff; border-color: #FF0000;',
		hoverClass: 'hover:brightness-110',
		textColor: '#ffffff',
		brandHex: '#FF0000'
	}
};

// Ordered tuple of platform keys used when iterating over DSP options in UI menus
export const DSP_ORDER = /** @type {const} */ (['spotify', 'apple', 'amazon', 'youtube']);

class DspPreferenceManager {
	// Svelte 5 `$state()` rune: changing `this.preferredDsp` instantly updates every `<StoreButton />` on screen
	/** @type {'spotify' | 'apple' | 'amazon' | 'youtube'} */
	preferredDsp = $state('spotify');

	// Reactive counter tracking how many times the user dismissed the gentle player support banner
	/** @type {number} */
	nudgeDismissCount = $state(0);

	/**
	 * Whether visiting a deep-linked track URL (`?track=...`) should automatically
	 * begin audio playback. Defaults to `false` in strict compliance with WCAG 2.1
	 * Success Criterion 1.4.2 (Audio Control) so screen-reader and keyboard users
	 * are never surprised by unexpected audio on page load.
	 * @type {boolean}
	 */
	autoplayDeepLinks = $state(false);

	/** @type {boolean} */
	initialized = false;

	constructor() {
		// Automatically hydrate saved `localStorage` values when instantiated in a browser
		if (typeof window !== 'undefined') {
			this.init();
		}
	}

	/**
	 * Hydrates preferred DSP, nudge dismissal count, and deep-link autoplay preference
	 * from `localStorage`. If the visitor has never set a DSP preference, defaults
	 * intelligently based on their operating system.
	 */
	init() {
		if (this.initialized || typeof window === 'undefined') return;
		this.initialized = true;

		try {
			// Check both current key (`user_preferred_dsp`) and legacy hub key (`preferredMusicStore`)
			const savedDsp =
				localStorage.getItem(STORAGE_KEY_DSP) || localStorage.getItem(LEGACY_STORAGE_KEY_DSP);
			if (
				savedDsp === 'spotify' ||
				savedDsp === 'apple' ||
				savedDsp === 'amazon' ||
				savedDsp === 'youtube'
			) {
				this.preferredDsp = savedDsp;
			} else {
				this.preferredDsp = detectSystemDefaultDsp();
			}

			// Parse base-10 integer dismissal count from localStorage
			const savedDismissals = parseInt(
				localStorage.getItem(STORAGE_KEY_NUDGE_DISMISSALS) || '0',
				10
			);
			if (!Number.isNaN(savedDismissals) && savedDismissals >= 0) {
				this.nudgeDismissCount = savedDismissals;
			}

			// `localStorage` stores strings, so `'true'` converts back to boolean `true`
			const savedAutoplay = localStorage.getItem(STORAGE_KEY_AUTOPLAY_DEEPLINKS);
			this.autoplayDeepLinks = savedAutoplay === 'true';
		} catch {
			this.preferredDsp = detectSystemDefaultDsp();
			this.autoplayDeepLinks = false;
		}
	}

	/**
	 * Sets whether deep-linked track URLs (`?track=...`, `?play=...`, `#track-...`)
	 * automatically start audio playback when opened. Defaults to `false` for WCAG 1.4.2.
	 * @param {boolean} enabled
	 */
	setAutoplayDeepLinks(enabled) {
		this.autoplayDeepLinks = Boolean(enabled);
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY_AUTOPLAY_DEEPLINKS, String(this.autoplayDeepLinks));
			} catch {
				// Ignore storage errors (e.g., Safari Private Browsing quota restrictions)
			}
		}
	}

	/**
	 * Sets the global preferred DSP and persists it to `localStorage`.
	 * Synchronizes both `user_preferred_dsp` and `preferredMusicStore` (used on raggiesoft-hub).
	 * @param {'spotify' | 'apple' | 'amazon' | 'youtube'} platform
	 */
	setPreferredDsp(platform) {
		if (!DSP_PLATFORMS[platform]) return;
		this.preferredDsp = platform;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY_DSP, platform);
				localStorage.setItem(LEGACY_STORAGE_KEY_DSP, platform);
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * JavaScript getter (`dspManager.canShowPlayerNudge`) that evaluates reactively
	 * because it reads `this.nudgeDismissCount` (`$state`).
	 * Respects the user's decision once they have dismissed it `MAX_NUDGE_DISMISSALS` times.
	 */
	get canShowPlayerNudge() {
		return this.nudgeDismissCount < MAX_NUDGE_DISMISSALS;
	}

	/**
	 * Increments the dismissal counter when the user closes a player DSP nudge.
	 * @param {boolean} [permanent=false] - If true ("Don't remind me"), jumps straight to `MAX_NUDGE_DISMISSALS`.
	 */
	dismissPlayerNudge(permanent = false) {
		this.nudgeDismissCount = permanent
			? MAX_NUDGE_DISMISSALS
			: Math.min(MAX_NUDGE_DISMISSALS, this.nudgeDismissCount + 1);
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY_NUDGE_DISMISSALS, String(this.nudgeDismissCount));
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * Resets the DSP nudge dismissal counter so prompts appear again (accessible via `/settings`).
	 */
	resetPlayerNudges() {
		this.nudgeDismissCount = 0;
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem(STORAGE_KEY_NUDGE_DISMISSALS);
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * Builds the array of available DSP URLs for a given album or artist.
	 * Handles partial DSP availability cleanly by omitting platforms without an ID,
	 * and returns `[]` immediately when `item.dspExempt` is `true` (e.g., cover songs or CC-only bonuses).
	 *
	 * @param {Object} item
	 * @param {'album' | 'artist'} [item.type='album']
	 * @param {string} [item.spotifyId]
	 * @param {string} [item.appleId]
	 * @param {string} [item.amazonId]
	 * @param {string} [item.youtubeId]
	 * @param {boolean} [item.dspExempt]
	 * @returns {Array<{ id: 'spotify' | 'apple' | 'amazon' | 'youtube', url: string, config: typeof DSP_PLATFORMS['spotify'] }>}
	 */
	getAvailablePlatforms(item) {
		if (!item || item.dspExempt) return [];
		const type = item.type || 'album';

		/** @type {Array<{ id: 'spotify' | 'apple' | 'amazon' | 'youtube', url: string, config: typeof DSP_PLATFORMS['spotify'] }>} */
		const list = [];

		// 1. Spotify (`/artist/<id>` vs. `/album/<id>`)
		const spotifyId = (item.spotifyId || '').trim();
		if (spotifyId) {
			list.push({
				id: 'spotify',
				url:
					type === 'artist'
						? `https://open.spotify.com/artist/${spotifyId}`
						: `https://open.spotify.com/album/${spotifyId}`,
				config: DSP_PLATFORMS.spotify
			});
		}

		// 2. Apple Music (`/us/artist/<id>` vs. `/us/album/<id>`)
		const appleId = (item.appleId || '').trim();
		if (appleId) {
			list.push({
				id: 'apple',
				url:
					type === 'artist'
						? `https://music.apple.com/us/artist/${appleId}`
						: `https://music.apple.com/us/album/${appleId}`,
				config: DSP_PLATFORMS.apple
			});
		}

		// 3. Amazon Music (`/artists/<id>` vs. `/albums/<id>`)
		const amazonId = (item.amazonId || '').trim();
		if (amazonId) {
			list.push({
				id: 'amazon',
				url:
					type === 'artist'
						? `https://music.amazon.com/artists/${amazonId}`
						: `https://music.amazon.com/albums/${amazonId}`,
				config: DSP_PLATFORMS.amazon
			});
		}

		// 4. YouTube / YouTube Music (strips any stray trailing `&` query character)
		const youtubeId = (item.youtubeId || '').trim().replace(/&+$/, '');
		if (youtubeId) {
			list.push({
				id: 'youtube',
				url:
					type === 'artist'
						? `https://youtube.com/channel/${youtubeId}`
						: `https://music.youtube.com/playlist?list=${youtubeId}`,
				config: DSP_PLATFORMS.youtube
			});
		}

		return list;
	}

	/**
	 * Resolves the active DSP entry for an item based on `this.preferredDsp`,
	 * falling back gracefully to `available[0]` (the first available platform) if
	 * the user's preferred platform is missing on a partial-DSP release.
	 *
	 * @param {Parameters<DspPreferenceManager['getAvailablePlatforms']>[0]} item
	 */
	resolveActiveDsp(item) {
		const available = this.getAvailablePlatforms(item);
		if (available.length === 0) return null;
		return available.find((p) => p.id === this.preferredDsp) || available[0];
	}
}

// Export singleton instance shared across `<StoreButton />`, `<Player />`, and `/settings`
export const dspManager = new DspPreferenceManager();
