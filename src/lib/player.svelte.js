/**
 * @license MIT
 * ============================================================================
 * player.svelte.js
 * ============================================================================
 * Reactive Audio Player State Engine built using Svelte 5 Runes ($state, $derived).
 *
 * Key Responsibilities:
 * 1. Global Playback State: Tracks playing/paused status, current time, duration,
 *    volume, mute state, and buffering indicators.
 * 2. Rock Opera & Continuous Playback Queue: Supports seamless queue playback so
 *    multi-part rock operas (e.g., The Paper Wall's 'Static & Silence' or The Stardust
 *    Engine's multi-disc live albums) automatically flow from one track to the next.
 * 3. Media Session API Synchronization: Synchronizes metadata (track, artist, album,
 *    high-resolution artwork) and hardware/system media key events (lockscreen, keyboard).
 * 4. Synchronized WebVTT Lyrics: Automatically manages active lyrics/cues derived from
 *    the active track's playback timestamp.
 * 5. Accessibility (WCAG 2.1 AA): Provides semantic values, formatted time strings, and
 *    state flags for screen-reader live regions.
 * ============================================================================
 */

export class AudioPlayer {
	// Primary playback state
	isPlaying = $state(false);
	currentTime = $state(0);
	duration = $state(0);
	volume = $state(1);
	isMuted = $state(false);
	isLoading = $state(false);
	error = $state(/** @type {string | null} */ (null));

	// Drawer / Modal overlay state for expanded lyrics & canonical lore view
	isExpanded = $state(false);
	drawerTab = $state(/** @type {'lyrics-lore' | 'queue' | 'credits'} */ ('lyrics-lore'));

	// Playback speed and timer
	playbackRate = $state(1);
	sleepTimerMinutes = $state(/** @type {number | null} */ (null));
	sleepTimerEnd = $state(/** @type {number | null} */ (null));
	_sleepTimeout = /** @type {any} */ (null);

	// Queue playback modes
	isShuffle = $state(false);
	repeatMode = $state(/** @type {'none' | 'all' | 'one'} */ ('none'));

	// Local session persistence flag
	hasSavedSession = $state(false);

	// Gentle notice when switching albums on the identical song (matched by ISRC)
	isrcNotice = $state(
		/** @type {{ message: string, title: string, album: string, isrc: string } | null} */ (null)
	);
	_isrcNoticeTimeout = /** @type {any} */ (null);

	// Active track entity
	currentTrack = $state({
		id: '',
		title: '',
		artist: '',
		artistSlug: '',
		artistLogo: '',
		album: '',
		albumSlug: '',
		artwork: '',
		socialPreview: '',
		audioUrl: '',
		vttUrl: '',
		loreNote: '',
		lyrics: '',
		year: '',
		temporalCoverage: '',
		disc: 1,
		track: 1,
		duration: '',
		isrc: '',
		legacyTier: ''
	});

	// Active playback queue for seamless album / rock opera sequencing
	queue = $state(/** @type {Array<any>} */ ([]));
	currentIndex = $state(-1);

	// Synchronized WebVTT cues: [{ start: number, end: number, text: string }]
	cues = $state(/** @type {Array<{ start: number, end: number, text: string }>} */ ([]));

	// Derived state calculations
	hasPrevious = $derived(this.currentIndex > 0);
	hasNext = $derived(this.currentIndex >= 0 && this.currentIndex < this.queue.length - 1);

	// Active synchronized lyric cue corresponding to the current audio playback head
	activeCue = $derived(
		this.cues.find((c) => this.currentTime >= c.start && this.currentTime <= c.end) || null
	);

	// Formatted human-readable timestamp strings (mm:ss)
	formattedCurrentTime = $derived(this.formatTime(this.currentTime));
	formattedDuration = $derived(this.formatTime(this.duration));

	// Percentage head for progress sliders and scrubbers (0 - 100)
	progressPercent = $derived(
		this.duration > 0 ? Math.min(100, (this.currentTime / this.duration) * 100) : 0
	);

	/**
	 * Formats a numeric second value into an accessible mm:ss string.
	 * @param {number} totalSeconds
	 * @returns {string}
	 */
	formatTime(totalSeconds) {
		if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
	}

	/**
	 * Initiates playback of the currently loaded track.
	 */
	play() {
		if (this.currentTrack.audioUrl) {
			this.isPlaying = true;
		}
	}

	/**
	 * Pauses playback.
	 */
	pause() {
		this.isPlaying = false;
	}

	/**
	 * Toggles between playing and paused states.
	 */
	togglePlay() {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	/**
	 * Seeks directly to an absolute timestamp in seconds.
	 * @param {number} time
	 */
	seek(time) {
		const targetTime = Math.max(0, Math.min(this.duration || 0, time));
		this.currentTime = targetTime;
	}

	/**
	 * Seeks forward or backward relative to the current timestamp.
	 * @param {number} offsetSeconds
	 */
	seekRelative(offsetSeconds) {
		this.seek(this.currentTime + offsetSeconds);
	}

	/**
	 * Sets the audio volume level.
	 * @param {number} level - Value between 0.0 and 1.0
	 */
	setVolume(level) {
		this.volume = Math.max(0, Math.min(1, level));
		if (this.volume > 0 && this.isMuted) {
			this.isMuted = false;
		}
	}

	/**
	 * Toggles audio mute state.
	 */
	toggleMute() {
		this.isMuted = !this.isMuted;
	}

	/**
	 * Toggles the expanded now-playing drawer (lore & lyrics).
	 */
	toggleExpanded() {
		this.isExpanded = !this.isExpanded;
	}

	/**
	 * Displays a gentle notice when a song continues playing across album boundaries by matching ISRC.
	 * @param {any} track
	 */
	notifySameSong(track) {
		if (this._isrcNoticeTimeout) {
			clearTimeout(this._isrcNoticeTimeout);
		}
		this.isrcNotice = {
			message: `Same recording • Continuing playback on "${track.album || 'new album'}"`,
			title: track.title,
			album: track.album || '',
			isrc: track.isrc
		};
		this._isrcNoticeTimeout = setTimeout(() => {
			this.isrcNotice = null;
			this._isrcNoticeTimeout = null;
		}, 4500);
	}

	/**
	 * Manually dismisses the gentle ISRC notice banner.
	 */
	dismissIsrcNotice() {
		this.isrcNotice = null;
		if (this._isrcNoticeTimeout) {
			clearTimeout(this._isrcNoticeTimeout);
			this._isrcNoticeTimeout = null;
		}
	}

	/**
	 * Loads an individual track and begins playback.
	 *
	 * ARCHITECTURAL RULE (ISRC as Absolute Source of Truth):
	 * If the requested track has the identical ISRC code as the track currently loaded
	 * or playing, the player MUST preserve continuous playback without resetting to 0:00,
	 * without interrupting the audio stream, and gently informs the listener.
	 *
	 * @param {any} track
	 * @param {boolean} [autoPlay=true]
	 */
	loadTrack(track, autoPlay = true) {
		const currentIsrc = (this.currentTrack.isrc || '').trim().toUpperCase();
		const targetIsrc = (track.isrc || '').trim().toUpperCase();

		// Check if target track has the identical ISRC and an existing audio stream is active/loaded
		const isSameSongByIsrc = Boolean(
			currentIsrc &&
			targetIsrc &&
			currentIsrc === targetIsrc &&
			(this.currentTrack.audioUrl || this.currentTime > 0)
		);

		if (isSameSongByIsrc) {
			const previousAlbum = this.currentTrack.album;
			const isDifferentAlbum = track.album && track.album !== previousAlbum;

			// Seamlessly update metadata to match new album context without resetting playhead
			this.currentTrack.id = track.id || this.currentTrack.id;
			this.currentTrack.title = track.title || this.currentTrack.title;
			this.currentTrack.artist = track.artist || this.currentTrack.artist;
			this.currentTrack.artistSlug = track.artistSlug || this.currentTrack.artistSlug;
			this.currentTrack.artistLogo =
				track.artistLogo || this.currentTrack.artistLogo || '';
			this.currentTrack.album = track.album || this.currentTrack.album;
			this.currentTrack.albumSlug = track.albumSlug || this.currentTrack.albumSlug;
			this.currentTrack.artwork = track.artwork || this.currentTrack.artwork;
			this.currentTrack.socialPreview = track.socialPreview || this.currentTrack.socialPreview;
			this.currentTrack.disc = track.disc || 1;
			this.currentTrack.track = track.track || 1;
			this.currentTrack.year = track.year || this.currentTrack.year;
			this.currentTrack.temporalCoverage =
				track.temporalCoverage || this.currentTrack.temporalCoverage;
			this.currentTrack.loreNote = track.loreNote || this.currentTrack.loreNote;
			this.currentTrack.lyrics = track.lyrics || this.currentTrack.lyrics;
			this.currentTrack.isrc = targetIsrc;
			this.currentTrack.legacyTier = track.legacyTier || this.currentTrack.legacyTier;

			// If current track lacked audioUrl, fall back to target's url
			if (!this.currentTrack.audioUrl && track.audioUrl) {
				this.currentTrack.audioUrl = track.audioUrl;
			}

			// Update VTT lyrics if different
			if (track.vttUrl && track.vttUrl !== this.currentTrack.vttUrl) {
				this.currentTrack.vttUrl = track.vttUrl;
				this.fetchVttCues(track.vttUrl);
			}

			// Ensure playing if autoPlay requested
			if (autoPlay && !this.isPlaying) {
				this.isPlaying = true;
			}

			// Gently notify the listener that playback continues across releases
			if (isDifferentAlbum) {
				this.notifySameSong(track);
			}

			this.saveSession();
			return;
		}

		// Standard Track Loading (starts from 0:00)
		this.currentTrack = {
			id: track.id || '',
			title: track.title || 'Unknown Title',
			artist: track.artist || 'Unknown Artist',
			artistSlug: track.artistSlug || '',
			artistLogo: track.artistLogo || '',
			album: track.album || 'Unknown Album',
			albumSlug: track.albumSlug || '',
			artwork: track.artwork || '',
			socialPreview: track.socialPreview || '',
			audioUrl: track.audioUrl || '',
			vttUrl: track.vttUrl || '',
			loreNote: track.loreNote || '',
			lyrics: track.lyrics || '',
			year: track.year || '',
			temporalCoverage: track.temporalCoverage || '',
			disc: track.disc || 1,
			track: track.track || 1,
			duration: track.duration || '',
			isrc: track.isrc || '',
			legacyTier: track.legacyTier || ''
		};

		this.currentTime = 0;
		this.duration = 0;
		this.error = null;
		this.cues = [];

		if (track.vttUrl) {
			this.fetchVttCues(track.vttUrl);
		}

		if (autoPlay) {
			this.isPlaying = true;
		}

		this.saveSession();
	}

	/**
	 * Loads a sequence of tracks into the queue and starts at the specified index.
	 * @param {Array<any>} trackList
	 * @param {number} [startIndex=0]
	 * @param {boolean} [autoPlay=true]
	 */
	loadQueue(trackList, startIndex = 0, autoPlay = true) {
		this.queue = trackList;
		this.currentIndex = startIndex;
		if (trackList[startIndex]) {
			this.loadTrack(trackList[startIndex], autoPlay);
		}
	}

	/**
	 * Advances playback to the next track in the queue, with shuffle support.
	 */
	next() {
		if (this.isShuffle && this.queue.length > 1) {
			let nextIdx = Math.floor(Math.random() * this.queue.length);
			if (nextIdx === this.currentIndex) {
				nextIdx = (this.currentIndex + 1) % this.queue.length;
			}
			this.currentIndex = nextIdx;
			this.loadTrack(this.queue[this.currentIndex], true);
		} else if (this.hasNext) {
			this.currentIndex += 1;
			this.loadTrack(this.queue[this.currentIndex], true);
		} else if (this.repeatMode === 'all' && this.queue.length > 0) {
			this.currentIndex = 0;
			this.loadTrack(this.queue[0], true);
		}
	}

	/**
	 * Steps back to the previous track, or restarts the current track if > 3 seconds in.
	 */
	prev() {
		if (this.currentTime > 3) {
			this.seek(0);
		} else if (this.hasPrevious) {
			this.currentIndex -= 1;
			this.loadTrack(this.queue[this.currentIndex], true);
		} else {
			this.seek(0);
		}
	}

	/**
	 * Called automatically when the HTML audio element triggers 'ended'.
	 * Flawlessly enables gapless/continuous playback for multi-part rock operas
	 * and honors single-track / queue repeat modes.
	 */
	onTrackEnded() {
		if (this.repeatMode === 'one') {
			this.seek(0);
			this.play();
		} else if (this.hasNext || this.isShuffle) {
			this.next();
		} else if (this.repeatMode === 'all' && this.queue.length > 0) {
			this.currentIndex = 0;
			this.loadTrack(this.queue[0], true);
		} else {
			this.isPlaying = false;
			this.currentTime = 0;
		}
	}

	/**
	 * Toggles queue shuffle mode.
	 */
	toggleShuffle() {
		this.isShuffle = !this.isShuffle;
	}

	/**
	 * Cycles queue repeat mode: none -> all -> one -> none.
	 */
	toggleRepeat() {
		if (this.repeatMode === 'none') this.repeatMode = 'all';
		else if (this.repeatMode === 'all') this.repeatMode = 'one';
		else this.repeatMode = 'none';
	}

	/**
	 * Adjusts playback speed (0.75x to 2.0x).
	 * @param {number} rate
	 */
	setPlaybackRate(rate) {
		this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
	}

	/**
	 * Sets an in-app sleep timer in minutes.
	 * @param {number | null} minutes
	 */
	setSleepTimer(minutes) {
		if (this._sleepTimeout) {
			clearTimeout(this._sleepTimeout);
			this._sleepTimeout = null;
		}
		if (!minutes || minutes <= 0) {
			this.sleepTimerMinutes = null;
			this.sleepTimerEnd = null;
			return;
		}
		this.sleepTimerMinutes = minutes;
		this.sleepTimerEnd = Date.now() + minutes * 60 * 1000;
		this._sleepTimeout = setTimeout(
			() => {
				this.pause();
				this.sleepTimerMinutes = null;
				this.sleepTimerEnd = null;
			},
			minutes * 60 * 1000
		);
	}

	/**
	 * Saves active playback session to browser localStorage for "Jump Back In".
	 */
	saveSession() {
		if (typeof window === 'undefined' || !this.currentTrack.id) return;
		try {
			const session = {
				track: this.currentTrack,
				time: this.currentTime,
				queue: this.queue,
				currentIndex: this.currentIndex,
				volume: this.volume,
				updatedAt: Date.now()
			};
			localStorage.setItem('raggiesoft-music-last-session', JSON.stringify(session));
			this.hasSavedSession = true;
		} catch {
			// localStorage full or restricted
		}
	}

	/**
	 * Retrieves the saved session from localStorage.
	 * @returns {any}
	 */
	getSavedSession() {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem('raggiesoft-music-last-session');
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Resumes playback from the saved session ("Jump Back In").
	 * @returns {boolean}
	 */
	resumeLastSession() {
		const session = this.getSavedSession();
		if (!session || !session.track || !session.track.audioUrl) return false;
		if (Array.isArray(session.queue) && session.queue.length > 0) {
			this.queue = session.queue;
			this.currentIndex = session.currentIndex >= 0 ? session.currentIndex : 0;
		}
		this.loadTrack(session.track, true);
		if (session.time > 0) {
			this.seek(session.time);
		}
		return true;
	}

	/**
	 * Checks on initial boot if a resumeable session exists.
	 */
	checkSavedSession() {
		const session = this.getSavedSession();
		this.hasSavedSession = Boolean(session && session.track && session.track.audioUrl);
		return session;
	}

	/**
	 * Fetches and parses WebVTT lyrics for karaoke/subtitle synchronization.
	 * @param {string} url
	 */
	async fetchVttCues(url) {
		try {
			const res = await fetch(url);
			if (!res.ok) return;
			const text = await res.text();
			this.cues = this.parseVtt(text);
		} catch (e) {
			console.warn('Could not load WebVTT lyrics:', e);
		}
	}

	/**
	 * Simple parser for WebVTT timestamped subtitles.
	 * @param {string} vttText
	 * @returns {Array<{ start: number, end: number, text: string }>}
	 */
	parseVtt(vttText) {
		const lines = vttText.split(/\r?\n/);
		const cues = [];
		const timeRegex =
			/(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/;

		for (let i = 0; i < lines.length; i++) {
			const match = lines[i].match(timeRegex);
			if (match) {
				const startHours = parseInt(match[1] || '0', 10);
				const startMins = parseInt(match[2], 10);
				const startSecs = parseInt(match[3], 10);
				const startMs = parseInt(match[4], 10);
				const start = startHours * 3600 + startMins * 60 + startSecs + startMs / 1000;

				const endHours = parseInt(match[5] || '0', 10);
				const endMins = parseInt(match[6], 10);
				const endSecs = parseInt(match[7], 10);
				const endMs = parseInt(match[8], 10);
				const end = endHours * 3600 + endMins * 60 + endSecs + endMs / 1000;

				let text = '';
				i++;
				while (i < lines.length && lines[i].trim() !== '') {
					text += (text ? '\n' : '') + lines[i].trim();
					i++;
				}
				cues.push({ start, end, text });
			}
		}
		return cues;
	}
}

// Export singleton instance for app-wide reactive state sharing
export const player = new AudioPlayer();
