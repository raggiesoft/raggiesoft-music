<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * FILE: src/routes/+error.svelte
	 * ROUTE SCOPE: Global Client-Side & Dynamic Error Boundary for The Listening
	 *              Room (`https://music.raggiesoft.com/*`)
	 * ============================================================================
	 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
	 * `+error.svelte` is a special reserved filename in SvelteKit. Whenever ANY
	 * `+page.js` `load()` function throws an error (such as `error(404, ...)` when
	 * a user navigates client-side to a mistyped song or album URL), SvelteKit
	 * automatically swaps out the broken page and renders this friendly recovery
	 * screen inside `+layout.svelte`—keeping the persistent audio player alive!
	 *
	 * WHY DO WE HAVE BOTH `+error.svelte` AND `404/+page.svelte`?
	 * - `+error.svelte` (this file) handles *in-app* SvelteKit router errors and
	 *   reads the live `page.status` and `page.error` state dynamically.
	 * - `src/routes/404/+page.svelte` compiles into a standalone static `404.html`
	 *   file on disk so our Nginx web server (`error_page 404 /404.html;`) can
	 *   return a genuine HTTP 404 response when a browser or search crawler
	 *   requests a non-existent URL directly from the server.
	 *
	 * WHAT THE USER SEES ON THIS SCREEN:
	 * A calm, accessible "Catalog Notice" card showing the HTTP status code, a
	 * plain-English explanation, recovery buttons to Home, Discography, and Story
	 * Playlists, plus direct links to all 7 Engine Room Records artists.
	 * ============================================================================
	 */

	// `resolve` builds safe internal href paths that respect SvelteKit's base path
	// configuration and validate route patterns at compile time.
	import { resolve } from '$app/paths';

	// `page` from `$app/state` is SvelteKit's reactive state object representing
	// the current browser URL, route params, HTTP status code, and error object.
	import { page } from '$app/state';

	// Import the full list of bands so a lost visitor can jump straight to any artist.
	import { allArtists } from '#lib/data/musicData.js';

	// SVELTE 5 RUNE — `$derived(...)`:
	// Think of `$derived` like an automatic spreadsheet formula: whenever `page.status`
	// changes, `statusCode` automatically recalculates! The `|| 404` fallback
	// provides `404` if `page.status` is somehow `0` or `undefined`.
	let statusCode = $derived(page.status || 404);

	// Optional chaining (`page.error?.message`) safely checks whether `page.error`
	// exists before reading `.message` (avoiding a `TypeError: Cannot read properties
	// of null`), falling back to a warm consumer-friendly message if absent.
	let errorMessage = $derived(
		page.error?.message ||
			'We could not find that song, album, or page in The Listening Room catalog.'
	);
</script>

<!--
	`<svelte:head>` lets any Svelte component inject tags directly into the HTML
	document's `<head>` element!
	Here we set the browser tab `<title>` and instruct search engines (`robots`)
	to `noindex,follow`—meaning "do NOT index this error page in search results,
	but DO follow the recovery links back to valid catalog pages."
-->
<svelte:head>
	<title>Page Not Found ({statusCode}) | The Listening Room</title>
	<meta name="robots" content="noindex,follow" />
</svelte:head>

<!-- Main centered error recovery card styled with Tailwind CSS utility classes -->
<section
	class="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/75 p-8 text-center shadow-2xl sm:p-12"
>
	<!-- Status badge (e.g., "CATALOG NOTICE • 404") -->
	<p class="font-mono text-xs font-extrabold tracking-widest text-amber-400 uppercase">
		Catalog Notice &bull; {statusCode}
	</p>

	<!--
		Primary `<h1>` heading: uses a JavaScript ternary expression
		(`condition ? valueIfTrue : valueIfFalse`) inside `{...}` curly braces to
		tailor the headline for 404 Not Found vs. other unexpected errors.
	-->
	<h1 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
		{statusCode === 404 ? 'Recording or Page Not Found' : 'Something Went Wrong'}
	</h1>

	<!-- Human-readable explanation of what went wrong -->
	<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
		{errorMessage}
	</p>

	<!-- Primary recovery navigation buttons back into The Listening Room -->
	<div class="mt-7 flex flex-wrap items-center justify-center gap-3">
		<a
			href={resolve('/')}
			class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
		>
			Return Home
		</a>
		<a
			href={resolve('/discography')}
			class="rounded-xl border border-slate-700 bg-slate-800/90 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
		>
			Browse Full Discography
		</a>
		<a
			href={resolve('/playlists')}
			class="rounded-xl border border-slate-700 bg-slate-800/90 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
		>
			Story Playlists
		</a>
	</div>

	<!--
		Crawlable Artist Roster Directory:
		`{#each allArtists as artist (artist.slug)}` loops through every band in
		`allArtists` and renders a clickable `<a>` pill. Putting `(artist.slug)`
		at the end gives Svelte a unique key for each item so DOM updates stay fast
		and predictable.
	-->
	<div class="mt-8 border-t border-slate-800 pt-6 text-left">
		<h2 class="text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
			Explore Engine Room Records Artists
		</h2>
		<div class="mt-3 flex flex-wrap justify-center gap-2">
			{#each allArtists as artist (artist.slug)}
				<a
					href={resolve('/[artist]', { artist: artist.slug })}
					class="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-blue-500/50 hover:text-blue-300"
				>
					{artist.name}
				</a>
			{/each}
		</div>
	</div>
</section>
