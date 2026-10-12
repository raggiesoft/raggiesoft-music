/**
 * @license MIT
 * ============================================================================
 * musicData.js
 * ============================================================================
 * Central catalog and canonical metadata registry for Engine Room Records
 * (music.raggiesoft.com).
 *
 * Architecture & Design Decisions:
 * 1. Data Integrity: All tracks are strictly normalized to match their corresponding
 *    canonical `tracks.json`, `album.json`, and narrative lore documentation in
 *    `raggiesoft-assets/engine-room-records/artists/`.
 * 2. High-Fidelity Streaming: Web audio streams are served via high-performance CDN
 *    edge points at `https://assets.raggiesoft.com/` using progressive web MP3s.
 * 3. Lore Integration: Every track is enriched with narrative world-building,
 *    historical context (e.g., the 1981 Shap Fell disaster, the Safe Harbor flute
 *    leitmotif, the 1987 Apex Records Cold War), and real musical analysis.
 * 4. Extensibility: Cleanly exposes `featuredAlbums` for reactive Svelte 5 routing
 *    and `formatAlbumQueue()` for persistent player queue generation.
 * ============================================================================
 */

/**
 * @typedef {Object} Track
 * @property {string} id
 * @property {number} disc
 * @property {number} track
 * @property {string} title
 * @property {string} duration
 * @property {string} [isrc]
 * @property {string} [legacyTier]
 * @property {string} [loreNote]
 * @property {string} audioUrl
 */

/**
 * @typedef {Object} Album
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} artist
 * @property {string} artistSlug
 * @property {string} year
 * @property {string} genre
 * @property {boolean} isRockOpera
 * @property {string} artwork
 * @property {string} description
 * @property {Track[]} tracks
 */

/**
 * Flagship discography releases featured on the main portal.
 * @type {Album[]}
 */
export const featuredAlbums = [
	{
		id: 'carnaby-street',
		slug: '1983-carnaby-street',
		title: 'Carnaby Street',
		artist: 'Fractured Prisms',
		artistSlug: 'fractured-prisms',
		year: '1983',
		genre: 'Theatrical British Pop / New Wave',
		isRockOpera: false,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/album-art.jpg',
		description:
			"Born from tragedy, Rhys and Claire reconstructed the Manning Family Orchestra into Fractured Prisms following the 1981 Shap Fell disaster, using analog synthesizers, drum machines, and salvaged woodwinds to build a 'fragile fortress' of sound.",
		tracks: [
			{
				id: 'cs-1-01',
				disc: 1,
				track: 1,
				title: 'The Hollow Square',
				duration: '4:49',
				isrc: 'QZWFJ2690386',
				legacyTier: 'Chart Smash',
				loreNote:
					"The opening track and thesis statement of Carnaby Street. The 'square' represents the four missing members of the Manning Family Orchestra lost in the 1981 Shap Fell disaster, as Rhys and Claire fled to Maryland and reconstructed the band using analog synthesizers.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-01-the-hollow-square.mp3'
			},
			{
				id: 'cs-1-02',
				disc: 1,
				track: 2,
				title: 'A Prophecy Unfolds',
				duration: '4:34',
				isrc: 'QZWFJ2690387',
				legacyTier: 'Fan Anthem',
				loreNote:
					"Showcases Rhys Manning's mechanical resurrection of percussion via rolling tribal toms, reflecting the black ice white-out of the 1981 Shap Fell disaster where 'just two remain against the tide.'",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-02-a-prophecy-unfolds.mp3'
			},
			{
				id: 'cs-1-03',
				disc: 1,
				track: 3,
				title: 'Strangers in the Stream',
				duration: '4:25',
				isrc: 'QZWFJ2690388',
				legacyTier: 'Deep Cut',
				loreNote:
					"Captures the transatlantic culture shock and surreal isolation Rhys and Claire felt arriving in Williamsport, Maryland, driven by synthetic fretless bass replicating late cousin Julian Hayes' low-end warmth.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-03-strangers-in-the-stream.mp3'
			},
			{
				id: 'cs-1-04',
				disc: 1,
				track: 4,
				title: 'The Masquerade',
				duration: '4:08',
				isrc: 'QZWFJ2690389',
				legacyTier: 'Fan Anthem',
				loreNote:
					"Introduces the 'fragile fortress' concept: dressing up in stage clothes to mask their overwhelming loss, orchestrating a theatrical masquerade with sequencers and salvaged instruments.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-04-the-masquerade.mp3'
			},
			{
				id: 'cs-1-05',
				disc: 1,
				track: 5,
				title: 'Fractured Prisms',
				duration: '3:54',
				isrc: 'QZWFJ2690390',
				legacyTier: 'Fan Anthem',
				loreNote:
					"The emotional crux of the album, mourning the Manning Family Orchestra ('There was a time we had a name') and featuring Gwen's salvaged wooden flute playing the Safe Harbor leitmotif before a thundering stadium-rock climax.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-05-fractured-prisms.mp3'
			},
			{
				id: 'cs-1-06',
				disc: 1,
				track: 6,
				title: 'Mirrors of Yesterday',
				duration: '4:29',
				isrc: 'QZWFJ2690391',
				legacyTier: 'Deep Cut',
				loreNote:
					"A major emotional breakthrough for Claire as she finds the strength to play Gwen's salvaged wooden flute across an entire song, featuring a sweeping virtuoso flute solo in place of a traditional rock guitar solo.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-06-mirrors-of-yesterday.mp3'
			},
			{
				id: 'cs-1-07',
				disc: 1,
				track: 7,
				title: 'The Fading Spark',
				duration: '3:27',
				isrc: 'QZWFJ2690392',
				legacyTier: 'Deep Cut',
				loreNote:
					"Captures the frantic, paranoid anxiety of maintaining the 'fragile fortress' engineered to protect Claire's sensory processing, with staccato synth pulses and an urgent, echoing flute solo resembling a bird trapped in a machine.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-07-the-fading-spark.mp3'
			},
			{
				id: 'cs-1-08',
				disc: 1,
				track: 8,
				title: 'Kaleidoscope Sun',
				duration: '5:08',
				isrc: 'QZWFJ2690393',
				legacyTier: 'Fan Anthem',
				loreNote:
					"Written in the safety of Williamsport as a call to come home. Features Claire's poignant flute melody from 1:45 to 2:00 (which Luna famously uses as a lifeline signal for Leo: 'We hear you, and we're getting you out now') and a soaring virtuoso flute solo from 4:00 to 4:32.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-08-kaleidoscope-sun.mp3'
			},
			{
				id: 'cs-1-09',
				disc: 1,
				track: 9,
				title: 'The Silent Storm',
				duration: '4:59',
				isrc: 'QZWFJ2690394',
				legacyTier: 'Deep Cut',
				loreNote:
					'The cinematic, deeply peaceful closer. Stripping away the driving drum machines down to an echoing grand piano, warm analog pads, and gentle flute, laying the ghosts of the Manning Family Orchestra to rest.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-09-the-silent-storm.mp3'
			}
		]
	},
	{
		id: 'our-own-frequency',
		slug: '2008-our-own-frequency',
		title: 'Our Own Frequency',
		artist: 'The Stardust Engine',
		artistSlug: 'the-stardust-engine',
		year: '2008',
		genre: 'Singer / Songwriter / Acoustic',
		isRockOpera: false,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/album-art.jpg',
		description:
			"An intimate exploration of the deep bond between Ryan and Cassidy as they peel back their rock-star personas. Ryan is Cassidy's safe person, and this album strips away the noise to find their own frequency.",
		tracks: [
			{
				id: 'oof-1-01',
				disc: 1,
				track: 1,
				title: 'Our Own Frequency',
				duration: '3:24',
				isrc: 'QTA7V2642609',
				loreNote:
					"The title track encapsulates Ryan and Cassidy's quiet, intimate musical language outside the stadium spotlights.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-01-our-own-frequency.mp3'
			},
			{
				id: 'oof-1-02',
				disc: 1,
				track: 2,
				title: 'The Noise Outside',
				duration: '3:33',
				isrc: 'QTA7V2642610',
				loreNote:
					'Written after a chaotic stadium tour, capturing the sensory overload of fame and the sanctuary found in isolation.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-02-the-noise-outside.mp3'
			},
			{
				id: 'oof-1-03',
				disc: 1,
				track: 3,
				title: 'Safe Person',
				duration: '3:07',
				isrc: 'QTA7V2642611',
				loreNote:
					'Cassidy wrote this song directly for Ryan, honoring him as the one person who never expected her to perform or mask.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-03-safe-person.mp3'
			},
			{
				id: 'oof-1-04',
				disc: 1,
				track: 4,
				title: 'Unplugged',
				duration: '3:16',
				isrc: 'QTA7V2642612',
				loreNote: 'A gentle, reflective acoustic piece stripping away synthesizers and distortion.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-04-unplugged.mp3'
			},
			{
				id: 'oof-1-05',
				disc: 1,
				track: 5,
				title: "Brother's Keeper",
				duration: '4:29',
				isrc: 'QTA7V2642613',
				loreNote:
					'A heartfelt promise between siblings that neither will ever be left behind, regardless of physical or emotional hurdles.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-05-brother-s-keeper.mp3'
			},
			{
				id: 'oof-1-06',
				disc: 1,
				track: 6,
				title: 'Through the Static',
				duration: '3:45',
				isrc: 'QTA7V2642614',
				loreNote:
					'A song about communicating through grief, sensory shutdowns, and the silent understanding between best friends.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-06-through-the-static.mp3'
			},
			{
				id: 'oof-1-07',
				disc: 1,
				track: 7,
				title: 'The Weight We Carry',
				duration: '4:11',
				isrc: 'QTA7V2642615',
				loreNote:
					'Reflecting on past trauma and chronic physical burdens, concluding that love lightens every load.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-07-the-weight-we-carry.mp3'
			},
			{
				id: 'oof-1-08',
				disc: 1,
				track: 8,
				title: 'Just Us',
				duration: '3:50',
				isrc: 'QTA7V2642616',
				loreNote:
					'The closing duet: when the recording red light turns off, the studio goes dark, and only family remains.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2008-our-own-frequency/web-mp3/1-08-just-us.mp3'
			}
		]
	},
	{
		id: 'electric-color',
		slug: '1987-electric-color',
		title: 'Electric Color',
		artist: 'The Stardust Engine',
		artistSlug: 'the-stardust-engine',
		year: '1987',
		genre: '80s Synth-Rock / New Wave',
		isRockOpera: false,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/album-art.jpg',
		description:
			"The Stardust Engine's forced mainstream debut, masking their industrial rock roots under Apex Records' polished synth-pop veneer during the corporate Cold War.",
		tracks: [
			{
				id: 'ec-1-01',
				disc: 1,
				track: 1,
				title: 'Electric Color',
				duration: '3:09',
				isrc: 'QZTB52600719',
				legacyTier: 'Chart Smash',
				loreNote:
					'The solid #2 hit that sat at the runner-up spot for six weeks on the national charts, famously blocked from #1 by a novelty song.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-01-electric-color.mp3'
			},
			{
				id: 'ec-1-02',
				disc: 1,
				track: 2,
				title: 'Plastic Sky',
				duration: '3:04',
				isrc: 'QZTB52600720',
				legacyTier: 'Deep Cut',
				loreNote:
					"Ryan's first act of malicious compliance: anti-corporate lyrics hidden inside a polished, studio-approved pop-rock wrapper.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-02-plastic-sky.mp3'
			},
			{
				id: 'ec-1-03',
				disc: 1,
				track: 3,
				title: 'My Anchor Holds',
				duration: '4:24',
				isrc: 'QZTB52600721',
				legacyTier: 'Chart Smash',
				loreNote:
					'A power ballad marketed as romance, but actually written about the band’s unbreakable family bond.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-03-my-anchor-holds.mp3'
			},
			{
				id: 'ec-1-04',
				disc: 1,
				track: 4,
				title: 'Dancing in the Neon',
				duration: '2:24',
				isrc: 'QZTB52600722',
				legacyTier: 'Chart Smash',
				loreNote:
					'A safe, polished synth-pop single pushed heavily by Apex Records, prioritizing high energy over the band’s rock roots.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-04-dancing-in-the-neon.mp3'
			},
			{
				id: 'ec-1-05',
				disc: 1,
				track: 5,
				title: 'Running on the Edge',
				duration: '4:00',
				isrc: 'QZTB52600723',
				legacyTier: 'Deep Cut',
				loreNote:
					"A protest song featuring angsty, anti-corporate lyrics hidden inside a 'safe' pop-rock wrapper.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-05-running-on-the-edge.mp3'
			},
			{
				id: 'ec-1-06',
				disc: 1,
				track: 6,
				title: 'Just a Girl',
				duration: '3:01',
				isrc: 'QZTB52600724',
				legacyTier: 'Fan Anthem',
				loreNote:
					'Cassidy’s quiet rebellion. Dismissed by executives as filler, it became a massive grassroots anthem for female fans.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-06-just-a-girl.mp3'
			},
			{
				id: 'ec-1-07',
				disc: 1,
				track: 7,
				title: 'Light Up the Night',
				duration: '3:29',
				isrc: 'QZTB52600725',
				legacyTier: 'The Dud',
				loreNote:
					"The song Apex poured all their marketing money into. It was meant to be the 'Big One' but completely failed to connect.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-07-light-up-the-night.mp3'
			},
			{
				id: 'ec-1-08',
				disc: 1,
				track: 8,
				title: 'Break the Walls',
				duration: '4:08',
				isrc: 'QZTB52600726',
				legacyTier: 'Fan Anthem',
				loreNote:
					"The one 'pure rock' anthem Apex allowed on the album. It became an immediate fan-favorite for its raw energy.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-08-break-the-walls.mp3'
			},
			{
				id: 'ec-1-09',
				disc: 1,
				track: 9,
				title: 'Worlds Apart',
				duration: '4:12',
				isrc: 'QZTB52600727',
				legacyTier: 'Deep Cut',
				loreNote:
					"A soaring duet that served as meta-commentary on the studio's attempt to separate their 'Stardust' and 'Engine' personas.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-09-worlds-apart.mp3'
			},
			{
				id: 'ec-1-10',
				disc: 1,
				track: 10,
				title: 'Another Night',
				duration: '2:42',
				isrc: 'QZTB52600728',
				legacyTier: 'Studio Filler',
				loreNote:
					'A safe filler track demanded by Apex to pad the runtime. Ryan was explicitly banned from playing guitar on it.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-10-another-night.mp3'
			},
			{
				id: 'ec-1-11',
				disc: 1,
				track: 11,
				title: 'Out of Time',
				duration: '1:35',
				isrc: 'QZTB52600729',
				legacyTier: 'Deep Cut',
				loreNote:
					"Ryan's punk-inspired vent. Apex gleefully cut this raw track from the original vinyl release to save space.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-11-out-of-time.mp3'
			},
			{
				id: 'ec-1-12',
				disc: 1,
				track: 12,
				title: 'Rearview Mirror',
				duration: '4:04',
				isrc: 'QZTB52600730',
				legacyTier: 'Deep Cut',
				loreNote:
					"A moody synth-pop track Cassidy used to express her feeling of being a suppressed 'passenger' in her own career.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-12-rearview-mirror.mp3'
			},
			{
				id: 'ec-1-13',
				disc: 1,
				track: 13,
				title: 'The Stardust Engine',
				duration: '4:16',
				isrc: 'QZTB52600731',
				legacyTier: 'Fan Anthem',
				loreNote:
					"Buried at the album's end, this true anthem perfectly blended synth and rock. It could have spent 11 weeks at #1.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-13-the-stardust-engine.mp3'
			}
		]
	},
	{
		id: 'static-and-silence-1',
		slug: '2001-static-and-silence-book-1',
		title: 'Static & Silence, Book 1: The Long Road West',
		artist: 'The Paper Wall',
		artistSlug: 'the-paper-wall',
		year: '2001',
		genre: 'Rock Opera / Post-Grunge / Alternative',
		isRockOpera: true,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/album-art.jpg',
		description:
			"The defining post-grunge rock opera masterpiece. An autobiographical concept album detailing frontman Julian Croft's survival of abuse, cross-country escape, and return to the Safe Harbor.",
		tracks: [
			{
				id: 'sns-1-01',
				disc: 1,
				track: 1,
				title: 'Nineteen and Invincible',
				duration: '4:44',
				isrc: 'QT6HJ2647714',
				loreNote:
					"The 'before' picture opening with a heartfelt 80s ballad celebrating Leo's guiding stars (Stella, Luna, Olivia) before exploding into triumphant rock.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-01-nineteen-and-invincible.mp3'
			},
			{
				id: 'sns-1-02',
				disc: 1,
				track: 2,
				title: 'A New Light',
				duration: '5:06',
				isrc: 'QT6HJ2647715',
				loreNote:
					"Leo's naive excitement at meeting Delores, contrasted with Luna's desperate, worried flute melody warning of the dark shadow.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-02-a-new-light.mp3'
			},
			{
				id: 'sns-1-03',
				disc: 1,
				track: 3,
				title: 'Painted Smile',
				duration: '5:23',
				isrc: 'QT6HJ2647716',
				loreNote:
					'Musically depicts Leo’s primary survival mechanism—a hollow mask of endurance that shifts from gentle ballad into cold, dissociative industrial metal.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-03-painted-smile.mp3'
			},
			{
				id: 'sns-1-04',
				disc: 1,
				track: 4,
				title: 'The Unspoken Word',
				duration: '4:08',
				isrc: 'QT6HJ2647717',
				loreNote:
					"Luna's last desperate attempt to warn Leo before the bus departure, featuring her pleading Safe Harbor flute leitmotif.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-04-the-unspoken-word.mp3'
			},
			{
				id: 'sns-1-05',
				disc: 1,
				track: 5,
				title: 'Westward, Broken',
				duration: '2:34',
				isrc: 'QT6HJ2647718',
				loreNote:
					'An anxious, hypnotic industrial instrumental covering the initial exhausting bus leg from Norfolk through Richmond and Roanoke into Tennessee.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-05-westward-broken.mp3'
			},
			{
				id: 'sns-1-06',
				disc: 1,
				track: 6,
				title: 'Nashville',
				duration: '5:33',
				isrc: 'QT6HJ2647719',
				loreNote:
					'Ambient dread turns to conscious horror in Music City as Leo realizes he is trapped, surrounded by songs of dreams while drowning in fear.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-06-nashville.mp3'
			},
			{
				id: 'sns-1-07',
				disc: 1,
				track: 7,
				title: 'The Colby Turn',
				duration: '4:29',
				isrc: 'QT6HJ2647720',
				loreNote:
					'A bleak Great Plains instrumental capturing a truck stop in Colby, Kansas where Delores faces East in brief doubt before hardening her heart.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-07-the-colby-turn.mp3'
			},
			{
				id: 'sns-1-08',
				disc: 1,
				track: 8,
				title: 'Mile High',
				duration: '5:28',
				isrc: 'QT6HJ2647721',
				loreNote:
					'The physical toll strikes in Denver: thin mountain air gasping his lungs, silent hunger, and the first burning whispers of a pressure sore.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-08-mile-high.mp3'
			},
			{
				id: 'sns-1-09',
				disc: 1,
				track: 9,
				title: 'Pressure & Lies',
				duration: '5:02',
				isrc: 'QT6HJ2647722',
				loreNote:
					'Midnight in Salt Lake City after the high-altitude winds of Wyoming; a Stage I pressure sore burns as Delores silences him from taking needed breaks.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-09-pressure-and-lies.mp3'
			},
			{
				id: 'sns-1-10',
				disc: 1,
				track: 10,
				title: 'The Idaho Line',
				duration: '5:17',
				isrc: 'QT6HJ2647723',
				loreNote:
					'Crossing into the Northwest as Leo realizes Delores is not his lover but his guard in a rolling prison yard holding his wallet, AAC, and autonomy.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-10-the-idaho-line.mp3'
			},
			{
				id: 'sns-1-11',
				disc: 1,
				track: 11,
				title: 'The High Desert',
				duration: '4:05',
				isrc: 'QT6HJ2647724',
				loreNote:
					'A dragging 70 BPM funeral march across the desert, with a high, mournful synthesizer representing fading hope before the storm.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-11-the-high-desert.mp3'
			},
			{
				id: 'sns-1-12',
				disc: 1,
				track: 12,
				title: 'The Pasco Lock',
				duration: '3:58',
				isrc: 'QT6HJ2647725',
				loreNote:
					'A harrowing industrial rock track set in a locked family restroom in Pasco, Washington as Leo endures a furious verbal assault while helpless.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-12-the-pasco-lock.mp3'
			},
			{
				id: 'sns-1-13',
				disc: 1,
				track: 13,
				title: 'The Ellensburg Burn',
				duration: '3:03',
				isrc: 'QT6HJ2647726',
				loreNote:
					'A militaristic 120 BPM instrumental building on the highway toward Seattle as fear curdles into a cold, contained rage.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-13-the-ellensburg-burn.mp3'
			},
			{
				id: 'sns-1-14',
				disc: 1,
				track: 14,
				title: 'Stewart Street',
				duration: '5:17',
				isrc: 'QT6HJ2647727',
				loreNote:
					'Cold rain at 811 Stewart Street in Seattle; Leo overhears Delores on a payphone faking surprise to her aunt, revealing the entire journey was an uninvited ambush.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-14-stewart-street.mp3'
			},
			{
				id: 'sns-1-15',
				disc: 1,
				track: 15,
				title: 'A Night in Kent',
				duration: '1:19',
				isrc: 'QT6HJ2647728',
				loreNote:
					'A dark, beatless ambient drone in Kent, Washington, with an unsettling warped piano as Carol Mahone quietly notices Leo’s pain and fear.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-15-a-night-in-kent.mp3'
			},
			{
				id: 'sns-1-16',
				disc: 1,
				track: 16,
				title: 'Shattered Voice, Silent Explosion',
				duration: '3:59',
				isrc: 'QT6HJ2647729',
				loreNote:
					'The violent climax of Disc 1: Delores rips the AAC device from Leo’s hands and shatters it on the floor, ending with the locking deadbolt.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-16-shattered-voice-silent-explosion.mp3'
			}
		]
	},
	{
		id: 'runebreaker-ost',
		slug: '1992-runebreaker-ost',
		title: 'Runebreaker (Original Soundtrack)',
		artist: 'Mana Canvas',
		artistSlug: 'mana-canvas',
		year: '1992',
		genre: '16-bit Ambient / SPC-700 / Chiptune',
		isRockOpera: false,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/album-art.jpg',
		description:
			"An authentic SPC-700 16-bit ambient soundtrack composed by Mana Canvas, chronicling Ocea's legendary journey through crystal plains, glitch phantoms, and digital sanctuary realms.",
		tracks: [
			{
				id: 'rb-1-01',
				disc: 1,
				track: 1,
				title: 'Main Theme',
				duration: '3:19',
				isrc: 'QTA7V2622545',
				loreNote: 'The iconic title screen fanfare composed on the 16-bit SPC-700 sound chip.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-01-main-theme.mp3'
			},
			{
				id: 'rb-1-02',
				disc: 1,
				track: 2,
				title: 'Insert Coin',
				duration: '3:58',
				isrc: 'QTA7V2622546',
				loreNote:
					'The driving arcade attract mode welcoming the player to the cartridge adventure.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-02-insert-coin.mp3'
			},
			{
				id: 'rb-1-03',
				disc: 1,
				track: 3,
				title: 'Static and Pixels',
				duration: '3:41',
				isrc: 'QTA7V2622547',
				loreNote: 'Ambient chiptune evoking cathode-ray tube static and pixelated dreamscapes.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-03-static-and-pixels.mp3'
			},
			{
				id: 'rb-1-04',
				disc: 1,
				track: 4,
				title: "Ocea's Theme",
				duration: '2:37',
				isrc: 'QTA7V2622548',
				loreNote: 'The gentle, melancholic character theme representing Ocea’s digital awakening.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-04-oceas-theme.mp3'
			},
			{
				id: 'rb-1-05',
				disc: 1,
				track: 5,
				title: 'The Crystal Plains',
				duration: '2:38',
				isrc: 'QTA7V2622549',
				loreNote: 'Overworld theme for the sparkling crystal plains of the Dream Kingdom.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-05-the-crystal-plains.mp3'
			},
			{
				id: 'rb-1-06',
				disc: 1,
				track: 6,
				title: 'Sanctuary Village',
				duration: '2:54',
				isrc: 'QTA7V2622550',
				loreNote: 'Peaceful village music offering respite and protection from corrupted data.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-06-sanctuary-village.mp3'
			},
			{
				id: 'rb-1-07',
				disc: 1,
				track: 7,
				title: 'Sanctuary Inn',
				duration: '2:17',
				isrc: 'QTA7V2622551',
				loreNote: 'Warm acoustic-style synthesized chords accompanying a rest at the inn.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-07-sanctuary-inn.mp3'
			},
			{
				id: 'rb-1-08',
				disc: 1,
				track: 8,
				title: 'The Crystal Sage',
				duration: '3:03',
				isrc: 'QTA7V2622552',
				loreNote: 'Enigmatic, echoing arpeggios introducing the keeper of forgotten prophecies.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-08-the-crystal-sage.mp3'
			},
			{
				id: 'rb-1-09',
				disc: 1,
				track: 9,
				title: 'Half a Medallion',
				duration: '3:44',
				isrc: 'QTA7V2622553',
				loreNote: 'A searching motif scoring the quest to assemble the lost relic.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-09-half-a-medallion.mp3'
			},
			{
				id: 'rb-1-10',
				disc: 1,
				track: 10,
				title: 'Glitch Phantoms',
				duration: '2:32',
				isrc: 'QTA7V2622554',
				loreNote: 'Fast-paced, chromatic battle music confronting spectral anomalies.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-10-glitch-phantoms.mp3'
			},
			{
				id: 'rb-1-11',
				disc: 1,
				track: 11,
				title: 'The Iron Sentinels',
				duration: '2:45',
				isrc: 'QTA7V2622555',
				loreNote: 'Heavy mechanical percussion marching through the abandoned clockwork ruins.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-11-the-iron-sentinels.mp3'
			},
			{
				id: 'rb-1-12',
				disc: 1,
				track: 12,
				title: "Tay's Theme",
				duration: '2:52',
				isrc: 'QTA7V2622556',
				loreNote: 'A cheerful, loyal character melody celebrating companionship and bravery.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-12-tays-theme.mp3'
			},
			{
				id: 'rb-1-13',
				disc: 1,
				track: 13,
				title: 'The Grand Decree',
				duration: '5:04',
				isrc: 'QTA7V2622557',
				loreNote: 'Regal, soaring fanfare heralding the royal proclamation of the kingdom.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-13-the-grand-decree.mp3'
			},
			{
				id: 'rb-1-14',
				disc: 1,
				track: 14,
				title: 'Golden Data',
				duration: '2:09',
				isrc: 'QTA7V2622558',
				loreNote: 'Shimmering synth bells unlocked upon uncovering hidden memory sectors.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-14-golden-data.mp3'
			},
			{
				id: 'rb-1-15',
				disc: 1,
				track: 15,
				title: 'Dungeon Escape',
				duration: '2:42',
				isrc: 'QTA7V2622559',
				loreNote: 'A pulse-pounding rhythmic escape sequence dodging falling stone blocks.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-15-dungeon-escape.mp3'
			},
			{
				id: 'rb-1-16',
				disc: 1,
				track: 16,
				title: 'Guardian of the Gate',
				duration: '3:07',
				isrc: 'QTA7V2622560',
				loreNote: 'Epic boss fight theme against the monumental stone golem guarding the portal.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-16-guardian-of-the-gate.mp3'
			},
			{
				id: 'rb-1-17',
				disc: 1,
				track: 17,
				title: 'The Corrupted Ceremony',
				duration: '2:57',
				isrc: 'QTA7V2622561',
				loreNote: 'Dark choral samples signaling the disruption of the ancient royal coronation.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-17-the-corrupted-ceremony.mp3'
			},
			{
				id: 'rb-1-18',
				disc: 1,
				track: 18,
				title: "The Wizard's Ruin",
				duration: '3:28',
				isrc: 'QTA7V2622562',
				loreNote: 'Eerie, echoing halls of the shattered spire where arcane energy runs wild.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-18-the-wizards-ruin.mp3'
			},
			{
				id: 'rb-1-19',
				disc: 1,
				track: 19,
				title: "The Wizard's Lair",
				duration: '2:52',
				isrc: 'QTA7V2622564',
				loreNote: 'Tense anticipation preceding the final confrontation with Malakor.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-19-the-wizards-lair-phase-one.mp3'
			},
			{
				id: 'rb-1-20',
				disc: 1,
				track: 20,
				title: 'The True Form',
				duration: '2:58',
				isrc: 'QTA7V2622565',
				loreNote:
					'Climactic multi-channel final boss theme pushing the SPC-700 chip to its absolute limit.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-20-the-true-form.mp3'
			},
			{
				id: 'rb-1-21',
				disc: 1,
				track: 21,
				title: 'The Grand Decree (Reprise)',
				duration: '3:08',
				isrc: 'QTA7V2622566',
				loreNote: 'Triumphant orchestral synth finale celebrating peace restored across the land.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-21-the-grand-decree-reprise.mp3'
			},
			{
				id: 'rb-1-22',
				disc: 1,
				track: 22,
				title: 'Game Over',
				duration: '3:18',
				isrc: 'QTA7V2622567',
				loreNote: 'Melancholic continuation screen offering one more chance to save the realm.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-22-game-over.mp3'
			},
			{
				id: 'rb-1-23',
				disc: 1,
				track: 23,
				title: 'Save State',
				duration: '3:23',
				isrc: 'QTA7V2622568',
				loreNote:
					'The closing staff roll credits theme celebrating the creative legacy of Mana Canvas.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/mana-canvas/1992-runebreaker-ost/web-mp3/1-23-save-state-staff-roll.mp3'
			}
		]
	},
	{
		id: 'lost-sounds',
		slug: '2007-lost-sounds',
		title: 'Lost Sounds',
		artist: 'The Stardust Engine',
		artistSlug: 'the-stardust-engine',
		year: '2007',
		genre: 'Vault Rarities / Demos / Alternative',
		isRockOpera: false,
		artwork:
			'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/album-art.jpg',
		description:
			"An archival vault collection unlocking unreleased basement demos, corporate sabotage mixes, and raw outtakes rescued from Apex Records' Cold War lockboxes.",
		tracks: [
			{
				id: 'ls-1-01',
				disc: 1,
				track: 1,
				title: 'The Stardust Engine (The Rejected Mix)',
				duration: '4:14',
				isrc: 'QTA7V2642601',
				legacyTier: 'Vault Rarity',
				loreNote:
					"The unpolished, heavy rock cut Apex executives rejected for being 'too dangerous and abrasive for radio.'",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-01-the-stardust-engine-alternate.mp3'
			},
			{
				id: 'ls-1-02',
				disc: 1,
				track: 2,
				title: 'Midnight Drivers (Basement Demo)',
				duration: '3:10',
				isrc: 'QZWFW2601366',
				legacyTier: 'Vault Rarity',
				loreNote:
					'Recorded onto a four-track cassette recorder during a 2 AM rehearsal session in Ryan and Cassidy’s garage.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-02-midnight-drivers-demo.mp3'
			},
			{
				id: 'ls-1-03',
				disc: 1,
				track: 3,
				title: 'Radio Silence',
				duration: '4:29',
				isrc: 'QTA7V2642602',
				legacyTier: 'Deep Cut',
				loreNote:
					'A brooding studio cut exploring the silence between transmissions during the Apex Records contract freeze.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-03-radio-silence.mp3'
			},
			{
				id: 'ls-1-04',
				disc: 1,
				track: 4,
				title: 'Empty Arenas',
				duration: '4:57',
				isrc: 'QTA7V2642604',
				legacyTier: 'Vault Rarity',
				loreNote:
					'A poignant soundcheck reflection capturing the echo of cavernous arenas before the crowds flood the gates.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-04-empty-arenas.mp3'
			},
			{
				id: 'ls-1-05',
				disc: 1,
				track: 5,
				title: 'The Contract',
				duration: '3:18',
				isrc: 'QTA7V2642605',
				legacyTier: 'Deep Cut',
				loreNote:
					'A scathing acoustic-rock satire detailing the restrictive legal clauses imposed by predatory labels.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-05-the-contract.mp3'
			},
			{
				id: 'ls-1-06',
				disc: 1,
				track: 6,
				title: 'Neon Hearts (Acoustic Sketch)',
				duration: '3:22',
				isrc: 'QTA7V2642606',
				legacyTier: 'Vault Rarity',
				loreNote:
					'The original fingerpicked guitar sketch of what eventually became a massive 1989 synth anthem.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-06-neon-hearts-acoustic.mp3'
			},
			{
				id: 'ls-1-07',
				disc: 1,
				track: 7,
				title: 'Sanctuary: Zero G (Rough Mix)',
				duration: '5:18',
				isrc: 'QTA7V2642607',
				legacyTier: 'Vault Rarity',
				loreNote:
					'An extended space-rock outtake exploring weightless vocal harmonies and ambient synth delays.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-07-zero-g-sanctuary.mp3'
			},
			{
				id: 'ls-1-08',
				disc: 1,
				track: 8,
				title: 'Steel and Synthetics',
				duration: '4:36',
				isrc: 'QTA7V2642608',
				legacyTier: 'Deep Cut',
				loreNote:
					'A hybrid industrial piece showcasing Ryan’s experiments with analog modular synthesizers and distorted bass.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-08-steel-and-synthetics.mp3'
			},
			{
				id: 'ls-1-09',
				disc: 1,
				track: 9,
				title: 'Our Own Frequency',
				duration: '3:24',
				isrc: 'QTA7V2642609',
				legacyTier: 'Fan Anthem',
				loreNote:
					'The early studio outtake version that served as the philosophical blueprint for the 2008 acoustic record.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-09-our-own-frequency.mp3'
			},
			{
				id: 'ls-1-10',
				disc: 1,
				track: 10,
				title: 'The Promise (Corporate Demo)',
				duration: '3:48',
				isrc: 'QZTBA2678359',
				legacyTier: 'Vault Rarity',
				loreNote:
					'The radio-friendly demo recorded to appease label executives during the 1996 contract renegotiations.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-10-the-promise-corporate-demo.mp3'
			},
			{
				id: 'ls-1-11',
				disc: 1,
				track: 11,
				title: 'The Promise (Sabotage Demo)',
				duration: '3:38',
				isrc: 'QZTBA2678360',
				legacyTier: 'Vault Rarity',
				loreNote:
					"Ryan's infamous sabotage take intentionally submitted with dissonant guitars and subversive lyric alterations.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-11-the-promise-sabotage-demo.mp3'
			},
			{
				id: 'ls-1-12',
				disc: 1,
				track: 12,
				title: 'Atmosphere (Warehouse Demo)',
				duration: '5:01',
				isrc: 'QZTB62697618',
				legacyTier: 'Vault Rarity',
				loreNote:
					'Recorded live in the acoustics of an abandoned shipyard warehouse during the 1995 underground sessions.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-12-atmosphere-warehouse-demo.mp3'
			},
			{
				id: 'ls-1-13',
				disc: 1,
				track: 13,
				title: 'Sanctuary in the Storm',
				duration: '5:19',
				isrc: 'QTA7V2642610',
				legacyTier: 'Deep Cut',
				loreNote:
					'A sweeping orchestral-rock outtake exploring emotional refuge during times of personal upheaval.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-13-sanctuary-in-the-storm.mp3'
			},
			{
				id: 'ls-1-14',
				disc: 1,
				track: 14,
				title: 'Not Her',
				duration: '4:24',
				isrc: 'QTA7V2642611',
				legacyTier: 'Deep Cut',
				loreNote:
					"Cassidy's defiant response track confronting the media industry's attempts to commodify and replace authentic sisterhood.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/2007-lost-sounds/web-mp3/1-14-not-her.mp3'
			}
		]
	}
];

/**
 * Transforms an album's track list into formatted player queue items.
 * Maps album-level metadata down to every individual track object.
 *
 * @param {Album} album
 * @returns {Array<Track & { album: string; artist: string; artwork: string; year: string }>}
 */
export function formatAlbumQueue(album) {
	return album.tracks.map((t) => ({
		...t,
		album: album.title,
		artist: album.artist,
		artwork: album.artwork,
		year: album.year
	}));
}
