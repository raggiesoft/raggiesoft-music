/**
 * @license MIT
 * ============================================================================
 * dspPreference.svelte.js
 * ============================================================================
 * Global Reactive DSP Preference & Respectful Nudge State Manager for
 * The Listening Room by Engine Room Records (music.raggiesoft.com).
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

const STORAGE_KEY_DSP = 'user_preferred_dsp';
const STORAGE_KEY_NUDGE_DISMISSALS = 'raggiesoft_listening_room_nudge_dismissals';
export const MAX_NUDGE_DISMISSALS = 3;

/**
 * Canonical configuration for each supported streaming platform.
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

export const DSP_ORDER = /** @type {const} */ (['spotify', 'apple', 'amazon', 'youtube']);

class DspPreferenceManager {
	/** @type {'spotify' | 'apple' | 'amazon' | 'youtube'} */
	preferredDsp = $state('spotify');

	/** @type {number} */
	nudgeDismissCount = $state(0);

	/** @type {boolean} */
	initialized = false;

	constructor() {
		if (typeof window !== 'undefined') {
			this.init();
		}
	}

	/**
	 * Hydrates preferred DSP and nudge dismissal count from `localStorage`.
	 */
	init() {
		if (this.initialized || typeof window === 'undefined') return;
		this.initialized = true;

		try {
			const savedDsp = localStorage.getItem(STORAGE_KEY_DSP);
			if (
				savedDsp === 'spotify' ||
				savedDsp === 'apple' ||
				savedDsp === 'amazon' ||
				savedDsp === 'youtube'
			) {
				this.preferredDsp = savedDsp;
			}

			const savedDismissals = parseInt(
				localStorage.getItem(STORAGE_KEY_NUDGE_DISMISSALS) || '0',
				10
			);
			if (!Number.isNaN(savedDismissals) && savedDismissals >= 0) {
				this.nudgeDismissCount = savedDismissals;
			}
		} catch {
			// Ignore storage privacy restrictions
		}
	}

	/**
	 * Sets the global preferred DSP and persists it to `localStorage`.
	 * @param {'spotify' | 'apple' | 'amazon' | 'youtube'} platform
	 */
	setPreferredDsp(platform) {
		if (!DSP_PLATFORMS[platform]) return;
		this.preferredDsp = platform;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY_DSP, platform);
			} catch {
				// Ignore storage errors
			}
		}
	}

	/**
	 * Whether the gentle DSP support nudge is still allowed to appear after tracks finish.
	 * Respects the user's decision once they have dismissed it `MAX_NUDGE_DISMISSALS` times.
	 */
	get canShowPlayerNudge() {
		return this.nudgeDismissCount < MAX_NUDGE_DISMISSALS;
	}

	/**
	 * Increments the dismissal counter when the user closes a player DSP nudge.
	 * @param {boolean} [permanent=false] - If true, immediately suppresses future nudges.
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
	 * Builds the dictionary of available DSP URLs for a given album or artist.
	 * Handles partial DSP availability cleanly by omitting platforms without an ID.
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
	 * falling back gracefully to the first available platform if the user's
	 * preferred platform is missing on a partial-DSP release.
	 *
	 * @param {Parameters<DspPreferenceManager['getAvailablePlatforms']>[0]} item
	 */
	resolveActiveDsp(item) {
		const available = this.getAvailablePlatforms(item);
		if (available.length === 0) return null;
		return available.find((p) => p.id === this.preferredDsp) || available[0];
	}
}

export const dspManager = new DspPreferenceManager();

