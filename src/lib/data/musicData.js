/**
 * @license MIT
 * ============================================================================
 * musicData.js
 * ============================================================================
 * Central catalog and metadata registry for Engine Room Records (music.raggiesoft.com).
 * Maps studio releases, live stadium bootlegs, and multi-disc rock operas with
 * CDN-backed high-resolution album artwork, audio streams, and canonical lore.
 * ============================================================================
 */

export const featuredAlbums = [
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
					'The energetic yet fragile opening to the rock opera, introducing Julian before the tragedy.',
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
					'A transition piece marking the abrupt shift from domestic suburban routine to the desperate flight westward.',
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
					'Examines the emotional defense mechanism of masking trauma with an artificial public persona.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-03-painted-smile.mp3'
			},
			{
				id: 'sns-1-04',
				disc: 1,
				track: 4,
				title: 'The Unspoken Word',
				duration: '4:15',
				isrc: 'QT6HJ2647717',
				loreNote:
					'The haunting climax of Book 1 where Julian acknowledges the secrets he was forced to carry.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-paper-wall/2001-static-and-silence-book-1/web-mp3/1-04-the-unspoken-word.mp3'
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
				loreNote:
					'The solid #2 hit that sat at the runner-up spot for six weeks on the national charts.',
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
				loreNote:
					"Ryan's first act of malicious compliance: anti-corporate lyrics hidden inside a studio-approved wrapper.",
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
				loreNote: 'A high-energy, polished synth single pushed aggressively by Apex executives.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/the-stardust-engine/1987-electric-color/web-mp3/1-04-dancing-in-the-neon.mp3'
			}
		]
	},
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
			"Born from tragedy, Rhys and Claire reconstructed the Manning Family Orchestra into Fractured Prisms, using synthesizers and salvaged instruments to build a 'fragile fortress' of sound.",
		tracks: [
			{
				id: 'cs-1-01',
				disc: 1,
				track: 1,
				title: 'The Hollow Square',
				duration: '4:15',
				isrc: 'QZWFJ2690386',
				loreNote:
					'The overture introducing the surviving duo amidst the empty echoes of their past bandmates.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-01-the-hollow-square.mp3'
			},
			{
				id: 'cs-1-02',
				disc: 1,
				track: 2,
				title: 'A Prophecy Unfolds',
				duration: '3:58',
				isrc: 'QZWFJ2690387',
				loreNote:
					'Sweeping analog strings depicting Claire’s visions of sanctuary in Williamsport.',
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-02-a-prophecy-unfolds.mp3'
			},
			{
				id: 'cs-1-04',
				disc: 1,
				track: 4,
				title: 'The Masquerade',
				duration: '3:45',
				isrc: 'QZWFJ2690389',
				loreNote:
					"Introduces the 'fragile fortress' concept: dressing up in stage clothes to mask their overwhelming loss.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-04-the-masquerade.mp3'
			},
			{
				id: 'cs-1-05',
				disc: 1,
				track: 5,
				title: 'Fractured Prisms',
				duration: '4:30',
				isrc: 'QZWFJ2690390',
				loreNote:
					"The emotional crux of the album, featuring Gwen's salvaged wooden flute playing the Safe Harbor leitmotif.",
				audioUrl:
					'https://assets.raggiesoft.com/engine-room-records/artists/fractured-prisms/1983-carnaby-street/web-mp3/1-05-fractured-prisms.mp3'
			}
		]
	}
];

/**
 * Transforms an album's track list into formatted player queue items.
 * @param {typeof featuredAlbums[0]} album
 * @returns {Array<any>}
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
