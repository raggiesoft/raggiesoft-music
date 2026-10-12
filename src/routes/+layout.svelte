<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +layout.svelte
	 * ============================================================================
	 * Root application layout for Engine Room Records (music.raggiesoft.com).
	 * Renders global navigation header, dynamic route content, and the persistent
	 * WCAG AA accessible audio player.
	 * ============================================================================
	 */
	import '../app.css';
	import Player from '#lib/components/Player.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-36 selection:bg-blue-600 selection:text-white">
	<!-- Primary Global Header -->
	<header class="bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-800 px-4 py-3">
		<div class="max-w-7xl mx-auto flex items-center justify-between">
			<a
				href="/"
				class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
			>
				<div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
					<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
					</svg>
				</div>
				<div>
					<span class="font-extrabold text-base tracking-tight text-white block leading-tight">Engine Room Records</span>
					<span class="text-xs text-blue-400 font-medium tracking-wider uppercase">Official Audio Platform</span>
				</div>
			</a>

			<nav class="flex items-center gap-2 sm:gap-4 text-sm font-medium">
				<a
					href="/"
					class="text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					Discography
				</a>
				<a
					href="https://books.raggiesoft.com"
					target="_blank"
					rel="noopener noreferrer"
					class="text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1.5"
				>
					Book Library
					<svg class="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
			</nav>
		</div>
	</header>

	<!-- Main Page Slot (Routes render here) -->
	<main class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>

<!-- Persistent Global Audio Player -->
<Player />
