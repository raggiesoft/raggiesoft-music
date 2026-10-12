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

	// Active track entity
	currentTrack = $state({
		id: '',
		title: '',
		artist: '',
		album: '',
		artwork: '',
		audioUrl: '',
		vttUrl: '',
		loreNote: '',
		year: '',
		disc: 1,
		track: 1,
		duration: '',
		isrc: ''
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
	 * Loads an individual track and begins playback.
	 * @param {any} track
	 * @param {boolean} [autoPlay=true]
	 */
	loadTrack(track, autoPlay = true) {
		this.currentTrack = {
			id: track.id || '',
			title: track.title || 'Unknown Title',
			artist: track.artist || 'Unknown Artist',
			album: track.album || 'Unknown Album',
			artwork: track.artwork || '',
			audioUrl: track.audioUrl || '',
			vttUrl: track.vttUrl || '',
			loreNote: track.loreNote || '',
			year: track.year || '',
			disc: track.disc || 1,
			track: track.track || 1,
			duration: track.duration || '',
			isrc: track.isrc || ''
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
	 * Advances playback to the next track in the queue.
	 */
	next() {
		if (this.hasNext) {
			this.currentIndex += 1;
			this.loadTrack(this.queue[this.currentIndex], true);
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
	 * Flawlessly enables gapless/continuous playback for multi-part rock operas.
	 */
	onTrackEnded() {
		if (this.hasNext) {
			this.next();
		} else {
			this.isPlaying = false;
			this.currentTime = 0;
		}
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
		const timeRegex = /(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/;

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

