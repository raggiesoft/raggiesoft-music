<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +layout.svelte
	 * ============================================================================
	 * Root application layout for Engine Room Records (music.raggiesoft.com).
	 * Renders global navigation header, PWA install prompt, dynamic route content,
	 * and the persistent WCAG AA accessible audio player.
	 * ============================================================================
	 */
	import '../app.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Player from '#lib/components/Player.svelte';

	let { children } = $props();

	let deferredPrompt = $state(/** @type {any} */ (null));
	let canInstall = $state(false);

	onMount(() => {
		// Register Service Worker for PWA capabilities
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.warn('PWA service worker registration failed:', err);
			});
		}

		// Intercept browser install prompt to offer an in-app button
		const handleBeforeInstall = (/** @type {Event} */ e) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstall = true;
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);

		window.addEventListener('appinstalled', () => {
			canInstall = false;
			deferredPrompt = null;
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
		};
	});

	async function installApp() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			canInstall = false;
		}
		deferredPrompt = null;
	}
</script>

<div
	class="flex min-h-screen flex-col bg-slate-950 pb-36 text-slate-100 selection:bg-blue-600 selection:text-white"
>
	<!-- Primary Global Header -->
	<header
		class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<a
				href={resolve('/')}
				class="group flex items-center gap-3 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105"
				>
					<svg
						class="h-5 w-5 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
				</div>
				<div>
					<span class="block text-base leading-tight font-extrabold tracking-tight text-white"
						>Engine Room Records</span
					>
					<span class="text-xs font-medium tracking-wider text-blue-400 uppercase"
						>Official Audio Platform</span
					>
				</div>
			</a>

			<nav class="flex items-center gap-2 text-sm font-medium sm:gap-4">
				{#if canInstall}
					<button
						onclick={installApp}
						class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
						aria-label="Install Engine Room Records as an App"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
						Install App
					</button>
				{/if}

				<a
					href={resolve('/')}
					class="rounded-lg px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					Discography
				</a>
				<a
					href="https://books.raggiesoft.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					Book Library
					<svg class="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			</nav>
		</div>
	</header>

	<!-- Main Page Slot (Routes render here) -->
	<main class="mx-auto w-full max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>

<!-- Persistent Global Audio Player -->
<Player />
