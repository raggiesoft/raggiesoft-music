/**
 * @license MIT
 * ============================================================================
 * playlists.svelte.js
 * ============================================================================
 * Canonical Story Playlists Registry & Custom User Playlist Manager for
 * The Listening Room by Engine Room Records (music.raggiesoft.com).
 *
 * Architectural Responsibilities:
 * 1. Official Curated Story Playlists (`curatedPlaylists`):
 *    - Defines multi-album narrative arcs and thematic suites curated by the
 *      artists of Engine Room Records.
 *    - Flagship Story Playlist: "Before the Distance: The Story of John & Erin"
 *      (`/playlists/john-and-erin`), which unifies the five-song twin narrative
 *      across The Stardust Engine's `2004-progress-street` and `2007-lost-sounds`
 *      and links directly to both the Ocean View Archives novel (`books.raggiesoft.com/erin`
 *      and `raggiesoft.com/raggiesoft-books/books/erin`) and the official Stardust
 *      Engine lore page (`raggiesoft.com/engine-room/artists/stardust-engine/story/john-and-erin`).
 * 2. Track Resolution Engine (`resolvePlaylistQueue`):
 *    - Resolves lightweight `(artistSlug, albumSlug, trackId)` references against
 *      `allAlbums` / `formatAlbumQueue` so every playlist track inherits full
 *      128kbps CDN audio URLs, synchronized WebVTT lyrics, ISRC codes, DSP links,
 *      and Fourthwall storefront links—plus playlist-specific narrative chapter notes.
 * 3. Reactive User Playlist Store (`playlistManager`):
 *    - Built with Svelte 5 Runes (`$state`) and persisted in `localStorage`
 *      under `engine_room_user_playlists`.
 *    - Allows listeners to create custom playlists, add tracks from any album
 *      page or the `/playlists` catalog browser, reorder tracks, delete playlists,
 *      and share custom playlists via encoded URL query parameters.
 * ============================================================================
 */

import {
	allAlbums,
	formatAlbumQueue,
	parseDurationToSeconds
} from '#lib/data/musicData.js';

const STORAGE_KEY = 'engine_room_user_playlists_v1';

/**
 * @typedef {Object} PlaylistTrackSpec
 * @property {string} artistSlug - Canonical artist slug (e.g., `'the-stardust-engine'`).
 * @property {string} albumSlug - Canonical album slug (e.g., `'2004-progress-street'`).
 * @property {string} trackId - Track identifier within the album (e.g., `'1-03'`).
 * @property {string} [actLabel] - Narrative act or chapter badge (e.g., `'Act I • Chapter 1, Scene 1'`).
 * @property {string} [chapterTitle] - Corresponding book chapter/scene title.
 * @property {string} [chapterUrl] - Direct deep link to the corresponding book chapter on `books.raggiesoft.com`.
 * @property {string} [storySummary] - Narrative context explaining what happens in this song within the playlist arc.
 * @property {string} [pov] - Point-of-view character(s) for this track in the story.
 */

/**
 * @typedef {Object} CuratedPlaylist
 * @property {string} slug - URL-safe route identifier for `/playlists/[slug]`.
 * @property {string} title - Display title of the playlist.
 * @property {string} [ogTitle] - Concise OpenGraph/SEO title (<= 60 characters).
 * @property {string} [ogDescription] - Concise OpenGraph/SEO description (<= 155 characters).
 * @property {string} subtitle - Secondary tagline or narrative subtitle.
 * @property {string} curator - Band or in-universe author who published the playlist.
 * @property {string} artistSlug - Primary artist slug for navigation.
 * @property {string} year - In-universe publication / timeline coverage.
 * @property {string} badge - Category badge label.
 * @property {string} artwork - 1:1 square cover image URL on `assets.raggiesoft.com`.
 * @property {string} socialPreview - 16:9 OpenGraph banner image URL on `assets.raggiesoft.com`.
 * @property {string} description - Short summary for cards and OpenGraph tags.
 * @property {string[]} storyParagraphs - Detailed narrative overview paragraphs.
 * @property {string} loreUrl - Direct link to the official lore page on `raggiesoft.com`.
 * @property {string} bookUrl - Direct link to the standalone novel on `books.raggiesoft.com`.
 * @property {string} hubBookUrl - Direct link to the novel reader on `raggiesoft.com/raggiesoft-books`.
 * @property {Array<{ label: string, title: string, description: string, url: string }>} [crossUniverseLinks] - Cross-references to other RaggieSoft narratives that reference this playlist.
 * @property {PlaylistTrackSpec[]} trackSpecs - Ordered sequence of tracks in the playlist.
 */

/**
 * Official curated narrative and thematic playlists published by Engine Room Records.
 * @type {CuratedPlaylist[]}
 */
export const curatedPlaylists = [
	{
		slug: 'john-and-erin',
		title: 'Before the Distance: The Story of John & Erin',
		ogTitle: 'Before the Distance: The Story of John & Erin',
		ogDescription:
			"Stream the 5-song narrative playlist of fraternal twins John & Erin (Ryan & Cassidy O'Connell) by The Stardust Engine.",
		subtitle: 'A Five-Song Twin Narrative by The Stardust Engine',
		curator: "The Stardust Engine (Ryan & Cassidy O'Connell)",
		artistSlug: 'the-stardust-engine',
		year: '2004–2007 (Set at CPI, 2004–2005)',
		badge: 'Official Story Playlist & Book Soundtrack',
		artwork: 'https://assets.raggiesoft.com/engine-room-records/playlists/john-and-erin/cover.jpg',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/playlists/john-and-erin/social-preview.jpg',
		description:
			"Follow the complete five-song story of fraternal twins John and Erin (portrayed by Ryan and Cassidy O'Connell) across Commonwealth Polytechnic Institute's hilly Blacksburg campus—from a fatal CD track skip at a Kincaid Hall speed-dating event and an executive rescue in the chaotic bus lineup along Commonwealth Mall to finding sanctuary and completing the circle of sibling protection.",
		storyParagraphs: [
			"Originally published by Ryan and Cassidy O'Connell in the liner booklet of 2004's Progress Street and completed on 2007's archival compilation Lost Sounds, 'Before the Distance: The Story of John & Erin' is one of The Stardust Engine's most iconic pieces of in-universe fiction. Portrayed visually by Ryan and Cassidy themselves, fraternal twins John and Erin both use heavy-duty motorized power wheelchairs to navigate the steep, five-percent Ironstone grades of Commonwealth Polytechnic Institute (CPI) in Blacksburg, Virginia.",
			"The five-song arc traces how a simple accident—a student organizer fat-fingering the skip button at a campus speed-dating mixer in Kincaid Hall, bypassing the gentle three-minute ballad 'Seconds Into Forever' and blasting the 150-BPM warning anthem 'Thunder in the Rain'—leads quiet, analytical John into the orbit of a manipulative abuser named Valerie.",
			"When Erin meets a hollowed-out John in the freezing November 2004 rain along Commonwealth Mall beneath The Keystone Bridge—back before the CPI Transit Center was built, when every Blue Ridge Transit bus lined up bumper-to-bumper along the curb in a chaotic, diesel-choked gauntlet ('Before the Distance')—she refuses to let the steel bus doors close between them, reversing her power wheelchair straight down the wet aluminum front-door ramp to pull her brother aboard. After healing inside the locked perimeter of Erin's Progress Street apartment ('Sanctuary in the Storm'), John completes the circle the following spring ('Not Her'), recognizing a slick predator boxing Erin's wheelchair into a Kincaid Hall alcove and wedging his own chair between them."
		],
		loreUrl: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/john-and-erin',
		bookUrl: 'https://books.raggiesoft.com/erin',
		hubBookUrl: 'https://raggiesoft.com/raggiesoft-books/books',
		crossUniverseLinks: [
			{
				label: 'The Rachel Narrative • Nov 2006',
				title: "Jessica's Train Ride (Kent Station vs. Commonwealth Mall)",
				description:
					"When Jessica leaves her brother Michael on the platform at Kent Station and hears 'Before the Distance' on shuffle, she remembers reading The Stardust Engine's story of John and Erin—realizing in horror that unlike Erin along Commonwealth Mall, she let the steel doors close without pulling her brother aboard.",
				url: 'https://books.raggiesoft.com/rachel/book-17-a-few-small-repairs/chapter-5-the-weekend-shift/scene-6-the-pantry-algorithm'
			},
			{
				label: 'CPI Campus Lore • Freddie & Paige',
				title: 'Why Freddie & Paige Recognize "Thunder in the Rain"',
				description:
					"Having read the Progress Street liner notes as CPI freshmen after seeing The Stardust Engine at Kincaid Hall, Freddie and Paige wonder why they've heard 'Thunder in the Rain' before—until they connect the 150-BPM stadium anthem to John's speed-dating ambush.",
				url: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/crucible'
			}
		],
		trackSpecs: [
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2004-progress-street',
				trackId: 'the-stardust-engine-2004-progress-street-1-3',
				actLabel: 'Act I • Chapter 1, Scene 1',
				chapterTitle: 'The Three-Minute Bell',
				chapterUrl:
					'https://books.raggiesoft.com/erin/before-the-distance-the-story-of-john-erin/seconds-into-thunder/scene-1-the-three-minute-bell',
				pov: 'John (Ryan O\'Connell)',
				storySummary:
					'At the Kincaid Hall speed-dating mixer on CPI\'s hilly campus, Erin convinces her twin brother John to take a chance. The organizer cues up this 85-BPM romantic ballad ("It only takes three minutes to believe") to time the rotations—before a clumsy finger changes everything.'
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2004-progress-street',
				trackId: 'the-stardust-engine-2004-progress-street-1-4',
				actLabel: 'Act II • Chapter 1, Scene 2',
				chapterTitle: 'Table Four',
				chapterUrl:
					'https://books.raggiesoft.com/erin/before-the-distance-the-story-of-john-erin/seconds-into-thunder/scene-2-table-four',
				pov: 'John (Ryan O\'Connell)',
				storySummary:
					'Just as Valerie sits down at Table 4 across from John\'s power wheelchair in Kincaid Hall, the DJ accidentally skips Track 3 and blasts "Thunder in the Rain" at 150 BPM. Blinded by the adrenaline and Valerie\'s intense love-bombing, John doesn\'t realize he has just met his abuser—even as the chorus literally flashes "Danger" in red.'
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2004-progress-street',
				trackId: 'the-stardust-engine-2004-progress-street-1-8',
				actLabel: 'Act III • Chapter 2, Scenes 1–2',
				chapterTitle: 'The Frayed Mask / When the Steel Doors Close',
				chapterUrl:
					'https://books.raggiesoft.com/erin/before-the-distance-the-story-of-john-erin/before-the-distance/scene-1-the-frayed-mask',
				pov: 'Erin (Cassidy O\'Connell)',
				storySummary:
					'Two months later in the chaotic pre-Transit-Center curbside bus lineup along Commonwealth Mall beneath The Keystone Bridge, Erin sees the frayed mask on John\'s face while Valerie grips his sleeve. Refusing to let the steel doors close between them, Erin reverses her power wheelchair down the front boarding ramp of the Blue Ridge Transit bus, takes John\'s hand, and pulls him aboard with her.'
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2007-lost-sounds',
				trackId: 'the-stardust-engine-2007-lost-sounds-1-13',
				actLabel: 'Act IV • Chapter 3, Scene 1',
				chapterTitle: 'The Locked Perimeter',
				chapterUrl:
					'https://books.raggiesoft.com/erin/before-the-distance-the-story-of-john-erin/sanctuary-in-the-storm/scene-1-the-locked-perimeter',
				pov: 'John & Erin Duet',
				storySummary:
					'Twenty-four hours after their escape on the Blue Ridge Transit bus from Commonwealth Mall, with their two power wheelchairs charging side by side and the deadbolt locked against the November storm, John finds his safe harbor in his twin sister Erin\'s ground-floor apartment on Progress Street.'
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2007-lost-sounds',
				trackId: 'the-stardust-engine-2007-lost-sounds-1-14',
				actLabel: 'Act V • Chapter 4, Scene 1',
				chapterTitle: 'The Practiced Smile',
				chapterUrl:
					'https://books.raggiesoft.com/erin/before-the-distance-the-story-of-john-erin/not-her/scene-1-the-practiced-smile',
				pov: 'John & Erin Duet',
				storySummary:
					'The following spring, John spots a slick predator boxing Erin\'s power wheelchair into a recessed Ironstone alcove outside Kincaid Hall Auditorium. Recognizing the isolating script immediately, John shifts his chair into high gear, wedges his steel frame between them, and rescues his sister just as she rescued him.'
			}
		]
	},
	{
		slug: 'cosmic-tidal-lock-sound',
		title: 'The Cosmic Tidal Lock Sound™',
		ogTitle: 'The Cosmic Tidal Lock Sound™ — The Stardust Engine',
		ogDescription:
			"Stream the 20-track evolution of Cassidy O'Connell's Cosmic Tidal Lock Sound™, from Moon 1 and Escape Velocity to Starfield Calibration.",
		subtitle: "Cassidy O'Connell's Signature Space-Synth Architecture (1997–2011 • Thematic 1986 Origin)",
		curator: "Cassidy O'Connell (with her Safe Person, Ryan O'Connell)",
		artistSlug: 'the-stardust-engine',
		year: '1997–2011 (1997 Hard Reset • 2001 Midnight Drivers • 2011 Starfield Calibration)',
		badge: 'Official Sonic Architecture & Lore Playlist',
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/playlists/cosmic-tidal-lock-sound/cover.jpg',
		socialPreview:
			'https://assets.raggiesoft.com/engine-room-records/playlists/cosmic-tidal-lock-sound/social-preview.jpg',
		description:
			"Experience the 20-track evolution of Cassidy O'Connell's signature 'Cosmic Tidal Lock Sound™'—anchored by her brother and safe person Ryan O'Connell. Opening with 1997's catalyst track 'Moon 1 (Tidal Lock)', visiting 2001's retro-engineered 'Terminal Velvet' (created in 2001 to thematically represent a 1986 song Apex Records would have cut before Cassidy had a name for the style), ascending through the three-part 'Apoapsis Suite' and her 15-minute autobiographical resume masterpiece 'Escape Velocity (Ad Astra)', and culminating in all 14 tracks of 2011's 'Starfield Calibration'.",
		storyParagraphs: [
			"During The Stardust Engine's corporate era under Apex Records (1987–1992), keyboardist and Chief Audio Architect Cassidy O'Connell was forced to suppress her sprawling, zero-gravity analog synthesizer landscapes in favor of radio-friendly pop sheen. That corporate captivity ended abruptly in September 1992 with the 'Friction Catastrophe'—when rogue executive Julian Vance, unaware of Ryan's paralysis and falsely assuming Ryan and Cassidy were a married couple, demanded the explicit 'Shot 12' at a Los Angeles warehouse photo shoot. After Ryan's furious outcry ('SHE'S MY SISTER!'), younger sister Holly O'Connell used Vance's misconduct to force Apex Records to void their contract in 1992 and founded Engine Room Records.",
			"After purging the raw trauma of 1992 on 1995's The Warehouse Tapes, Cassidy built Disc 2 of 1997's Hard Reset ('The Engine Room') as a weightless orbital sanctuary for herself and her brother Ryan—whom Cassidy considers her safe person. It was while engineering 'Moon 1 (Tidal Lock)' in 1997 that Cassidy officially named her phase-locked, zero-gravity style 'The Cosmic Tidal Lock Sound™' (protected by Holly as an Engine Room Records trademark). Four years later, when the band recorded 2001's Midnight Drivers—a retro-engineered concept album built around the lone surviving 1987 title track to represent a 'lost' album Apex would have shelved—Cassidy composed 'Terminal Velvet' in 2001 as a fictional chronological paradox: a song written in 2001 using The Cosmic Tidal Lock Sound™, but thematically representing a 1986 cutting-room-floor track from before Cassidy had ever named the style.",
			"At the heart of this playlist sits the three-song 'Apoapsis Suite' ('Apoapsis', 'Second Apoapsis', and 'The Spectrum (True Color)') followed by the 15-minute-and-33-second magnum opus 'Escape Velocity (Ad Astra)'—Cassidy's most important piece of work and the #1 achievement she would list on her resume. It is her musical autobiography: she wrote the lyrics, she wrote the notes, and she directed the band (her family). The playlist concludes with all 14 tracks of 2011's Starfield Calibration, a silver-anniversary celebration of The Cosmic Tidal Lock Sound™."
		],
		loreUrl:
			'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
		bookUrl: '',
		hubBookUrl: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/ad-astra',
		crossUniverseLinks: [
			{
				label: 'The 1992 Emancipation • Friction Catastrophe',
				title: 'How the 1992 Warehouse Incident Ended Apex Records’ Control',
				description:
					"Read the archival dossier on the September 1992 'Shot 12' confrontation that ended the band's contract with Apex Records and led Holly O'Connell to found Engine Room Records.",
				url: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/friction'
			},
			{
				label: 'Audio Engineering Dossier • 1997–2011',
				title: 'What Is "The Cosmic Tidal Lock Sound™"?',
				description:
					"Explore how Cassidy O'Connell engineered her zero-gravity synthesizer sanctuary with her brother and safe person Ryan O'Connell.",
				url: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound'
			}
		],
		trackSpecs: [
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '1997-hard-reset',
				trackId: '2-04',
				actLabel: 'I. The Catalyst Track • Hard Reset (Disc 2, 1997)',
				chapterTitle: 'The First Song Created After Naming "The Cosmic Tidal Lock Sound™"',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell (Chief Audio Architect)",
				storySummary:
					"Five years after the 1992 Friction catastrophe freed the family from Apex Records, Cassidy created 'Moon 1 (Tidal Lock)' for Disc 2 of 1997's Hard Reset—the very first song she created after officially deciding that this zero-gravity style of music is called 'The Cosmic Tidal Lock Sound™.'"
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2001-midnight-drivers',
				trackId: '1-08',
				actLabel: 'II. The 2001 Retro-Engineered "1986" Paradox • Midnight Drivers (2001)',
				chapterTitle: 'Created in 2001 to Represent a 1986 Song Apex Would Have Cut',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell",
				storySummary:
					"Because only the title track of Midnight Drivers was actually recorded in 1987, Cassidy wrote and recorded 'Terminal Velvet' from scratch in 2001 (four years after 1997's Hard Reset) to build out the 'lost' album. Thematically, it was crafted to represent a 1986 song that Apex Records would have left on the cutting-room floor—meaning that within the story's thematic timeline, it represents the first song with this sound, before Cassidy had ever called it 'The Cosmic Tidal Lock Sound™.'"
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '1997-hard-reset',
				trackId: '2-01',
				actLabel: 'III. The Apoapsis Suite (Part 1 of 3) • Hard Reset (1997)',
				chapterTitle: 'Movement I: The Farthest Point of the Orbit',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/hard-reset',
				pov: "Cassidy O'Connell",
				storySummary:
					"Opening The Apoapsis Suite—the three-song suite that launches Disc 2 of Hard Reset ('The Engine Room')—'Apoapsis' captures the exact orbital moment where a spacecraft reaches its farthest distance from gravity's pull and hangs in silent, weightless equilibrium."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '1997-hard-reset',
				trackId: '2-02',
				actLabel: 'III. The Apoapsis Suite (Part 2 of 3) • Hard Reset (1997)',
				chapterTitle: 'Movement II: Stabilizing the Deep-Space Trajectory',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/hard-reset',
				pov: "Cassidy O'Connell",
				storySummary:
					"The second movement of The Apoapsis Suite deepens the harmonic lock. Instead of falling back toward the planet below, Cassidy's layered modular sequencers fire a secondary stabilization burn, locking the band into a permanent high-altitude orbit."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '1997-hard-reset',
				trackId: '2-03',
				actLabel: 'III. The Apoapsis Suite (Part 3 of 3) • Hard Reset (1997)',
				chapterTitle: 'Movement III: Reclaiming 1987’s "Electric Color" in Unfiltered Light',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/hard-reset',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"Concluding The Apoapsis Suite, 'The Spectrum (True Color)' directly answers the band's 1987 Apex Records album Electric Color. Free from corporate neon and studio tampering, Cassidy refracts the full analog frequency spectrum across the void."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '1997-hard-reset',
				trackId: '2-06',
				actLabel: 'IV. The Resume Masterpiece (15:33) • Hard Reset (1997)',
				chapterTitle: 'Cassidy’s Musical Autobiography: Writer, Composer & Band Director',
				chapterUrl: 'https://raggiesoft.com/engine-room/artists/stardust-engine/story/ad-astra',
				pov: "Cassidy O'Connell (Lyrics, Composition & Direction)",
				storySummary:
					"The 15-minute-and-33-second crown jewel of Cassidy O'Connell's career—her most important piece of work and the #1 composition she would list on her resume. 'Escape Velocity (Ad Astra)' is Cassidy's autobiography: she wrote the lyrics, she wrote every note of the score, and she directed the band (her family: brother Ryan and twin cousins Evan and Tyler) through its four sweeping movements."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-01',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 1)',
				chapterTitle: 'Written in 1986 When Evan & Tyler Joined • Released on 1987’s Electric Color',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"Like the rest of Electric Color, 'The Stardust Engine' was officially released in 1987 (buried by Apex Records at the end of the album as Track 13). However, it was the very first song Cassidy and Ryan O'Connell came up with in 1986 when their twin cousins Evan and Tyler Wright joined them at CPI. Too scared at the time to shop the song around, the four of them kept it to themselves and decided to use that first song to name their band. Launching 2011's Starfield Calibration, Cassidy re-engineers their 1986 origin anthem in The Cosmic Tidal Lock Sound™."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-02',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 2)',
				chapterTitle: '1987’s Title Track Refracted Through The Engine Room',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"Once symbol of Apex Records' 1987 commercial sheen, 'Electric Color' is reclaimed in a lush Cosmic Tidal Lock Mix where Cassidy's analog pads and Ryan's soaring guitar lines shimmer in synchronous orbit."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-03',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 3)',
				chapterTitle: 'Shattering the Artificial Dome',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell",
				storySummary:
					"Originally an indictment of corporate artifice, 'Plastic Sky' expands into a widescreen space-synth meditation as the artificial ceiling gives way to real starlight."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-04',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 4)',
				chapterTitle: 'Bridging the Orbital Distance',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"In this Cosmic Tidal Lock Mix, the emotional distance of 'Worlds Apart' becomes literal astrophysics—two bodies separated by vacuum yet bound together by unbreakable gravitational resonance."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-05',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 5)',
				chapterTitle: 'The Tether That Never Snaps',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Ryan & Cassidy O'Connell",
				storySummary:
					"Re-envisioned with deep sub-octave Moog pedals and crystalline bell arpeggios, 'My Anchor Holds' celebrates the family bond that kept Ryan and Cassidy grounded through every storm."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-06',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 6)',
				chapterTitle: 'Warm Vacuum Tubes in the Cold Void',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell",
				storySummary:
					"Cassidy strips away the 1980s gated snare and replaces it with a hypnotic, pulse-locked analog heartbeat, turning 'Neon Hearts' into an intimate nocturnal transmission."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-07',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 7)',
				chapterTitle: 'Looking Back at Earth from High Orbit',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Ryan & Cassidy O'Connell",
				storySummary:
					"Stretching past five and a half minutes, 'Rearview Mirror (Cosmic Tidal Lock Mix)' transforms a highway reflection into an orbital look back at the decades the family traveled together."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-08',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 8)',
				chapterTitle: 'Breathing Inside the Pressurized Sanctuary',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell",
				storySummary:
					"A showcase for Cassidy's custom filter-bank modulation, 'Atmosphere (Cosmic Tidal Lock Mix)' surrounds the listener in shimmering, headphone-calibrated harmonic air."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-09',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 9)',
				chapterTitle: 'Zero Corporate Strings Attached',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"Originally a defiant statement of independence on 1997's Hard Reset, 'No Hidden Gravity' returns in a celebratory Cosmic Tidal Lock Mix where every frequency moves in transparent, uncoerced freedom."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-10',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 10)',
				chapterTitle: 'Newton’s First Law in Pure Analog Motion',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Evan & Tyler Wright with Cassidy O'Connell",
				storySummary:
					"Twin cousins Evan and Tyler Wright lock their bass and drum pocket directly to Cassidy's master clock, proving that an object in motion stays in motion when no corporate friction slows it down."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-11',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 11)',
				chapterTitle: 'Replacing "If You Walked Away" • Safe in Ryan’s Tight Embrace',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy O'Connell (Grounded by Her Safe Person, Ryan)",
				storySummary:
					"Originally written for 1997's Hard Reset to permanently replace 1989's 'If You Walked Away'—the forced Apex Records abandonment ballad that left Cassidy in tears backstage after every show—'Echoes in the Wire' is the story of Cassidy finding comfort, quiet, and safety when her brother and safe person Ryan is hugging her tightly. In this Cosmic Tidal Lock Mix, Cassidy wraps that deep-pressure grounding embrace in warm, zero-gravity analog pads."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-12',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 12)',
				chapterTitle: 'The 1986–2001 Nocturnal Highway Meets Deep Space',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Ryan & Cassidy O'Connell",
				storySummary:
					"The title track of 2001's Midnight Drivers receives the full Cosmic Tidal Lock treatment—uniting the 1986 rejected-floor nocturnal synthwave aesthetic with the expansive starfield dome of 2011."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-13',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 13)',
				chapterTitle: 'Where the Blue Ridge Meets the Exosphere',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "Cassidy & Ryan O'Connell",
				storySummary:
					"As the calibration sequence approaches daybreak, 'The Horizon Line (Cosmic Tidal Lock Mix)' blends warm acoustic guitar textures with sweeping golden-amber synthesizer horizons."
			},
			{
				artistSlug: 'the-stardust-engine',
				albumSlug: '2011-starfield-calibration',
				trackId: '1-14',
				actLabel: 'V. The 2011 Celebration • Starfield Calibration (Track 14 • Finale)',
				chapterTitle: 'Sunrise Over the Orbital Observatory',
				chapterUrl:
					'https://raggiesoft.com/engine-room/artists/stardust-engine/story/cosmic-tidal-lock-sound',
				pov: "The Stardust Engine",
				storySummary:
					"Closing both Starfield Calibration and this 20-track journey through The Cosmic Tidal Lock Sound™, 'Fade to Dawn (Cosmic Tidal Lock Mix)' brings the orbital observatory gently into the light of a new morning."
			}
		]
	}
];

/**
 * Helper predicate that matches a catalog track against a `PlaylistTrackSpec.trackId`
 * whether `trackId` is a full catalog ID (`'the-stardust-engine-2004-progress-street-1-3'`),
 * an unpadded disc-track pair (`'1-3'`), or a zero-padded disc-track pair (`'1-03'`).
 *
 * @param {any} track
 * @param {string} targetTrackId
 * @param {any} album
 * @returns {boolean}
 */
function matchesPlaylistTrackId(track, targetTrackId, album) {
	if (!track || !targetTrackId) return false;
	if (track.id === targetTrackId) return true;

	const discNum = track.disc || 1;
	const trackNum = Number(track.track);
	const paddedTrack = String(track.track).padStart(2, '0');

	if (`${discNum}-${trackNum}` === targetTrackId) return true;
	if (`${discNum}-${paddedTrack}` === targetTrackId) return true;
	if (`${album.artistSlug}-${album.slug}-${discNum}-${trackNum}` === targetTrackId) return true;
	if (`${album.artistSlug}-${album.slug}-${discNum}-${paddedTrack}` === targetTrackId) return true;

	return false;
}

/**
 * Resolves an array of `PlaylistTrackSpec` items into fully hydrated player queue
 * objects ready for `player.loadQueue(queue, index, true)`.
 *
 * @param {PlaylistTrackSpec[]} trackSpecs
 * @param {import('#lib/data/musicData.js').Album[]} [catalog=allAlbums]
 * @returns {Array<any>}
 */
export function resolvePlaylistTracks(trackSpecs, catalog = allAlbums) {
	if (!Array.isArray(trackSpecs)) return [];

	/** @type {Array<any>} */
	const resolved = [];

	for (let i = 0; i < trackSpecs.length; i++) {
		const spec = trackSpecs[i];
		const album = catalog.find(
			(a) =>
				(spec.artistSlug ? a.artistSlug === spec.artistSlug : true) && a.slug === spec.albumSlug
		);
		if (!album) continue;

		const formattedAlbumTracks = formatAlbumQueue(album);
		const matchedTrack =
			formattedAlbumTracks.find((t) => matchesPlaylistTrackId(t, spec.trackId, album)) ||
			album.tracks.find((t) => matchesPlaylistTrackId(t, spec.trackId, album));

		if (!matchedTrack) continue;

		// Ensure album-level fields exist even if track wasn't in formatAlbumQueue
		const hydratedTrack = {
			...matchedTrack,
			album: album.title,
			albumSlug: album.slug,
			artist: album.artist,
			artistSlug: album.artistSlug,
			artistLogo: album.artistLogo || null,
			artistLoreUrl: album.artistLoreUrl || '',
			loreUrl: album.loreUrl || '',
			artwork: album.artwork,
			socialPreview: album.socialPreview,
			year: album.year,
			temporalCoverage: album.temporalCoverage,
			spotifyId: album.spotifyId || '',
			appleId: album.appleId || '',
			amazonId: album.amazonId || '',
			youtubeId: album.youtubeId || '',
			storeStandardUrl: album.storeStandardUrl || '',
			storeAudiophileUrl: album.storeAudiophileUrl || '',
			dspExempt: Boolean(album.dspExempt),
			dspNotice: album.dspNotice || '',
			// Attach playlist narrative metadata
			playlistIndex: i + 1,
			actLabel: spec.actLabel || `Track ${i + 1}`,
			chapterTitle: spec.chapterTitle || '',
			chapterUrl: spec.chapterUrl || '',
			storySummary: spec.storySummary || '',
			pov: spec.pov || ''
		};

		resolved.push(hydratedTrack);
	}

	return resolved;
}

/**
 * Computes total formatted duration (e.g., `"21 min 14 sec"`) for a list of hydrated tracks.
 *
 * @param {Array<{ duration?: string }>} tracks
 * @returns {{ totalSeconds: number, formatted: string }}
 */
export function computePlaylistDuration(tracks) {
	const totalSeconds = (tracks || []).reduce(
		(acc, t) => acc + parseDurationToSeconds(t.duration),
		0
	);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return {
			totalSeconds,
			formatted: `${hours} hr ${minutes} min`
		};
	}
	return {
		totalSeconds,
		formatted: `${minutes} min ${seconds} sec`
	};
}

/**
 * Look up a curated playlist by its route slug and hydrate its track list.
 *
 * @param {string} slug
 * @param {import('#lib/data/musicData.js').Album[]} [catalog=allAlbums]
 */
export function getCuratedPlaylistBySlug(slug, catalog = allAlbums) {
	const found = curatedPlaylists.find((p) => p.slug === slug);
	if (!found) return null;

	const tracks = resolvePlaylistTracks(found.trackSpecs, catalog);
	const durationInfo = computePlaylistDuration(tracks);

	return {
		...found,
		tracks,
		totalDurationSeconds: durationInfo.totalSeconds,
		formattedDuration: durationInfo.formatted
	};
}

/**
 * Returns all curated playlists with hydrated tracks and duration summaries.
 *
 * @param {import('#lib/data/musicData.js').Album[]} [catalog=allAlbums]
 */
export function getAllCuratedPlaylists(catalog = allAlbums) {
	return curatedPlaylists.map((p) => {
		const tracks = resolvePlaylistTracks(p.trackSpecs, catalog);
		const durationInfo = computePlaylistDuration(tracks);
		return {
			...p,
			tracks,
			totalDurationSeconds: durationInfo.totalSeconds,
			formattedDuration: durationInfo.formatted
		};
	});
}

/**
 * ============================================================================
 * REACTIVE USER CUSTOM PLAYLIST MANAGER (Svelte 5 Runes + localStorage)
 * ============================================================================
 * Allows listeners to create, edit, reorder, play, and share their own custom
 * playlists across all 344 tracks in the Engine Room Records catalog.
 */
class UserPlaylistManager {
	/**
	 * @type {Array<{
	 *   id: string,
	 *   name: string,
	 *   description: string,
	 *   createdAt: string,
	 *   updatedAt: string,
	 *   trackSpecs: Array<{ artistSlug: string, albumSlug: string, trackId: string }>
	 * }>}
	 */
	playlists = $state([]);
	initialized = $state(false);

	// Global modal state so any page (e.g., Album Tracklist) can open the "Add to Playlist" dialog
	addModalTrack = $state(
		/** @type {{ artistSlug: string, albumSlug: string, trackId: string, title: string, artist: string, album: string, artwork: string } | null} */ (
			null
		)
	);

	/**
	 * Hydrates custom user playlists from `localStorage`.
	 */
	init() {
		if (this.initialized || typeof window === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					this.playlists = parsed;
				}
			}
		} catch (err) {
			console.warn('Failed to read user playlists from localStorage:', err);
		}
		this.initialized = true;
	}

	/**
	 * Persists current user playlists to `localStorage`.
	 */
	save() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.playlists));
		} catch (err) {
			console.warn('Failed to persist user playlists to localStorage:', err);
		}
	}

	/**
	 * Creates a new custom user playlist and returns its generated ID.
	 *
	 * @param {string} name
	 * @param {string} [description='']
	 * @param {Array<{ artistSlug: string, albumSlug: string, trackId: string }>} [initialTracks=[]]
	 * @returns {string}
	 */
	createPlaylist(name, description = '', initialTracks = []) {
		this.init();
		const cleanName = (name || '').trim() || 'Untitled Playlist';
		const cleanDesc = (description || '').trim();
		const id = 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
		const now = new Date().toISOString();

		const newPlaylist = {
			id,
			name: cleanName,
			description: cleanDesc,
			createdAt: now,
			updatedAt: now,
			trackSpecs: [...initialTracks]
		};

		this.playlists = [newPlaylist, ...this.playlists];
		this.save();
		return id;
	}

	/**
	 * Updates a custom playlist's title and description.
	 *
	 * @param {string} id
	 * @param {{ name?: string, description?: string }} updates
	 */
	updatePlaylist(id, updates) {
		this.init();
		this.playlists = this.playlists.map((pl) => {
			if (pl.id !== id) return pl;
			return {
				...pl,
				name: updates.name !== undefined ? updates.name.trim() || pl.name : pl.name,
				description:
					updates.description !== undefined ? updates.description.trim() : pl.description,
				updatedAt: new Date().toISOString()
			};
		});
		this.save();
	}

	/**
	 * Deletes a custom user playlist by ID.
	 *
	 * @param {string} id
	 */
	deletePlaylist(id) {
		this.init();
		this.playlists = this.playlists.filter((pl) => pl.id !== id);
		this.save();
	}

	/**
	 * Appends a track reference to a custom user playlist.
	 *
	 * @param {string} playlistId
	 * @param {{ artistSlug: string, albumSlug: string, trackId: string }} trackSpec
	 */
	addTrack(playlistId, trackSpec) {
		this.init();
		this.playlists = this.playlists.map((pl) => {
			if (pl.id !== playlistId) return pl;
			return {
				...pl,
				updatedAt: new Date().toISOString(),
				trackSpecs: [
					...pl.trackSpecs,
					{
						artistSlug: trackSpec.artistSlug,
						albumSlug: trackSpec.albumSlug,
						trackId: trackSpec.trackId
					}
				]
			};
		});
		this.save();
	}

	/**
	 * Removes a track at a specific index from a custom user playlist.
	 *
	 * @param {string} playlistId
	 * @param {number} index
	 */
	removeTrackAt(playlistId, index) {
		this.init();
		this.playlists = this.playlists.map((pl) => {
			if (pl.id !== playlistId) return pl;
			const updated = pl.trackSpecs.filter((_, idx) => idx !== index);
			return {
				...pl,
				updatedAt: new Date().toISOString(),
				trackSpecs: updated
			};
		});
		this.save();
	}

	/**
	 * Moves a track up or down within a custom user playlist.
	 *
	 * @param {string} playlistId
	 * @param {number} fromIndex
	 * @param {number} toIndex
	 */
	moveTrack(playlistId, fromIndex, toIndex) {
		this.init();
		this.playlists = this.playlists.map((pl) => {
			if (pl.id !== playlistId) return pl;
			if (
				fromIndex < 0 ||
				toIndex < 0 ||
				fromIndex >= pl.trackSpecs.length ||
				toIndex >= pl.trackSpecs.length
			) {
				return pl;
			}
			const copy = [...pl.trackSpecs];
			const [moved] = copy.splice(fromIndex, 1);
			copy.splice(toIndex, 0, moved);
			return {
				...pl,
				updatedAt: new Date().toISOString(),
				trackSpecs: copy
			};
		});
		this.save();
	}

	/**
	 * Opens the global "Add to Playlist" modal for a track from any page.
	 *
	 * @param {{ artistSlug: string, albumSlug: string, trackId: string, title: string, artist: string, album: string, artwork: string }} trackInfo
	 */
	openAddModal(trackInfo) {
		this.init();
		this.addModalTrack = trackInfo;
	}

	/**
	 * Closes the global "Add to Playlist" modal.
	 */
	closeAddModal() {
		this.addModalTrack = null;
	}

	/**
	 * Generates a shareable URL encoding the custom playlist's name, description, and track specs.
	 *
	 * @param {{ name: string, description: string, trackSpecs: Array<{ artistSlug: string, albumSlug: string, trackId: string }> }} playlist
	 * @returns {string}
	 */
	buildShareUrl(playlist) {
		const payload = {
			n: playlist.name,
			d: playlist.description || '',
			t: playlist.trackSpecs.map((s) => `${s.artistSlug}/${s.albumSlug}/${s.trackId}`)
		};
		const encoded =
			typeof window !== 'undefined'
				? btoa(encodeURIComponent(JSON.stringify(payload)))
				: '';
		return `https://music.raggiesoft.com/playlists?import=${encodeURIComponent(encoded)}`;
	}

	/**
	 * Imports a shared custom playlist from the `?import=` query string parameter.
	 *
	 * @param {string} encodedParam
	 * @returns {string | null} Created playlist ID, or null if invalid.
	 */
	importFromEncoded(encodedParam) {
		this.init();
		try {
			const jsonStr = decodeURIComponent(atob(encodedParam));
			const parsed = JSON.parse(jsonStr);
			if (!parsed || typeof parsed.n !== 'string' || !Array.isArray(parsed.t)) return null;

			const specs = parsed.t
				.map((/** @type {string} */ item) => {
					const parts = String(item).split('/');
					if (parts.length !== 3) return null;
					return {
						artistSlug: parts[0],
						albumSlug: parts[1],
						trackId: parts[2]
					};
				})
				.filter(Boolean);

			return this.createPlaylist(
				parsed.n,
				parsed.d || 'Imported shared playlist',
				/** @type {any} */ (specs)
			);
		} catch (err) {
			console.warn('Failed to import shared playlist:', err);
			return null;
		}
	}
}

export const playlistManager = new UserPlaylistManager();

