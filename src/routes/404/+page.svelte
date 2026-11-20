<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * FILE: src/routes/404/+page.svelte
	 * URL SERVED: music.raggiesoft.com/404 (and Nginx `error_page 404 /404.html`)
	 * ============================================================================
	 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
	 * When we build a static website (`prerender = true` in `+layout.js`), there is
	 * no Node.js server running in production—only fast static `.html` files served
	 * by Nginx! When a visitor or search engine bot requests an unknown URL directly
	 * (like `music.raggiesoft.com/non-existent-song`), Nginx needs a real,
	 * pre-built `404.html` file on disk to send back alongside a genuine HTTP `404`
	 * status header.
	 *
	 * Placing this component at `src/routes/404/+page.svelte` causes SvelteKit's
	 * static build step to emit `build/404.html` automatically (wrapped in our
	 * global `+layout.svelte` header, footer, and audio player).
	 *
	 * Prerendered static 404 document (`build/404.html`) served directly by Nginx
	 * (`error_page 404 /404.html;`) with genuine HTTP 404 status when an unknown
	 * catalog path is requested. Marked `noindex,follow` and excluded from sitemaps.
	 * ============================================================================
	 */

	// `resolve` safely constructs internal route links (such as `/` or `/[artist]`).
	import { resolve } from '$app/paths';

	// `allArtists` provides the array of all 7 Engine Room Records bands for quick recovery links.
	import { allArtists } from '#lib/data/musicData.js';
</script>

<!--
	Inject `<title>`, `<meta name="description">`, and `noindex,follow` into `<head>`
	so search engines never index the 404 page itself, while still following its
	outbound links back into the real music catalog.
-->
<svelte:head>
	<title>Page Not Found (404) | The Listening Room</title>
	<meta
		name="description"
		content="The requested song, album, or artist page could not be found in The Listening Room catalog."
	/>
	<meta name="robots" content="noindex,follow" />
</svelte:head>

<!-- Centered 404 recovery container -->
<section
	class="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/75 p-8 text-center shadow-2xl sm:p-12"
>
	<!-- Monospace 404 status eyebrow -->
	<p class="font-mono text-xs font-extrabold tracking-widest text-amber-400 uppercase">
		Catalog Notice &bull; 404
	</p>

	<!-- Primary page heading (`<h1>`) -->
	<h1 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
		Recording or Page Not Found
	</h1>

	<!-- Friendly consumer guidance without technical server jargon -->
	<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
		We could not find that song, album, or page in The Listening Room catalog. Choose a destination
		below to explore Engine Room Records releases, lyrics, and story lore.
	</p>

	<!-- Main navigation buttons back to Home, Discography, Playlists, and Radio -->
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
		<a
			href={resolve('/radio')}
			class="rounded-xl border border-slate-700 bg-slate-800/90 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
		>
			Engine Room Radio
		</a>
	</div>

	<!-- Loop through `allArtists` to render a clickable pill link for every band -->
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
