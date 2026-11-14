<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * src/routes/+error.svelte
	 * ============================================================================
	 * Accessible, consumer-friendly error & 404 boundary for The Listening Room
	 * (`https://music.raggiesoft.com`). Marks error states `noindex,follow` and
	 * offers crawlable recovery pathways back to the catalog.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { allArtists } from '#lib/data/musicData.js';

	let statusCode = $derived(page.status || 404);
	let errorMessage = $derived(
		page.error?.message ||
			'We could not find that song, album, or page in The Listening Room catalog.'
	);
</script>

<svelte:head>
	<title>Page Not Found ({statusCode}) | The Listening Room</title>
	<meta name="robots" content="noindex,follow" />
</svelte:head>

<section
	class="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/75 p-8 text-center shadow-2xl sm:p-12"
>
	<p class="font-mono text-xs font-extrabold tracking-widest text-amber-400 uppercase">
		Catalog Notice &bull; {statusCode}
	</p>
	<h1 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
		{statusCode === 404 ? 'Recording or Page Not Found' : 'Something Went Wrong'}
	</h1>
	<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
		{errorMessage}
	</p>

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
