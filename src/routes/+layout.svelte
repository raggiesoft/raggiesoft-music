<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +layout.svelte
	 * ============================================================================
	 * Root application layout for Engine Room Records (music.raggiesoft.com).
	 *
	 * Architectural Responsibilities:
	 * 1. Adaptive Theme & OS Color Scheme Initialization:
	 *    - Invokes `themeManager.init()` on mount to bind the OS
	 *      `window.matchMedia('(prefers-color-scheme: dark)')` listener and sync
	 *      with `localStorage` (`engine_room_settings`).
	 * 2. Dual Logo Rendering (Light vs. Dark Mode):
	 *    - Renders both `/logos/engine-room-records-logo.png` (pure black on
	 *      transparent background for light mode, `.er-logo-light`) and
	 *      `/logos/engine-room-records-logo-white.png` (pure white on transparent
	 *      background for dark mode, `.er-logo-dark`). CSS rules in `app.css`
	 *      toggle their visibility instantaneously with zero layout shift or FOUC.
	 * 3. Global Navigation & Collapsible Search Menu:
	 *    - Provides direct SEO links to Home (`/`), Discography (`/discography`),
	 *      Settings (`/settings`), and Book Library, plus a global Search & Filter
	 *      Menu trigger.
	 * ============================================================================
	 */
	import '../app.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { themeManager } from '#lib/theme.svelte.js';
	import { dspManager } from '#lib/dspPreference.svelte.js';
	import { playlistManager } from '#lib/playlists.svelte.js';
	import Player from '#lib/components/Player.svelte';
	import SearchFilterModal from '#lib/components/SearchFilterModal.svelte';
	import AddToPlaylistModal from '#lib/components/AddToPlaylistModal.svelte';

	let { children } = $props();

	let deferredPrompt = $state(/** @type {any} */ (null));
	let canInstall = $state(false);
	let showGlobalSearch = $state(false);

	// Track active route path for nav highlighting
	let currentPath = $derived(page.url?.pathname || '/');

	onMount(() => {
		// Initialize adaptive theme manager & prefers-color-scheme listener
		themeManager.init();
		dspManager.init();
		playlistManager.init();

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
		class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/85 px-4 py-3 backdrop-blur-md"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-2">
			<!-- Brand Logo & Home Link -->
			<a
				href={resolve('/')}
				class="group flex items-center gap-3 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-md transition-transform group-hover:scale-105"
				>
					<!-- Light Mode Logo: Pure Black on Transparent Background -->
					<img
						src="/logos/engine-room-records-logo.png"
						alt="Engine Room Records Logo"
						class="er-logo-light h-full w-full object-contain"
					/>
					<!-- Dark Mode Logo: Pure White on Transparent Background -->
					<img
						src="/logos/engine-room-records-logo-white.png"
						alt="Engine Room Records Logo"
						class="er-logo-dark h-full w-full object-contain"
					/>
				</div>
				<div class="hidden xs:block sm:block">
					<span class="block text-base leading-tight font-extrabold tracking-tight text-white"
						>The Listening Room</span
					>
					<span class="text-[11px] font-semibold tracking-wider text-blue-400 uppercase"
						>by Engine Room Records</span
					>
				</div>
			</a>

			<!-- Global Navigation Links & Action Controls -->
			<nav class="flex items-center gap-1.5 text-xs font-semibold sm:gap-2.5 sm:text-sm" aria-label="Global Navigation">
				{#if canInstall}
					<button
						type="button"
						onclick={installApp}
						class="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:flex"
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
					class="rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 {currentPath ===
					'/'
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
				>
					Home
				</a>

				<a
					href={resolve('/discography')}
					class="rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 {currentPath !==
						'/' &&
					!currentPath.startsWith('/playlists') &&
					!currentPath.startsWith('/settings') &&
					!currentPath.startsWith('/radio') &&
					!currentPath.startsWith('/behind-the-scenes') &&
					!currentPath.startsWith('/privacy') &&
					!currentPath.startsWith('/terms')
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
				>
					Discography
				</a>

				<a
					href={resolve('/playlists')}
					class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 {currentPath.startsWith(
						'/playlists'
					)
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
				>
					<span>Playlists</span>
				</a>

				<a
					href={resolve('/radio')}
					class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 {currentPath.startsWith(
						'/radio'
					)
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
					<span>Radio</span>
				</a>

				<a
					href={resolve('/behind-the-scenes')}
					class="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 md:flex {currentPath.startsWith(
						'/behind-the-scenes'
					)
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
					title="Behind the Scenes: AI & The Creative Process"
				>
					<span>Behind the Scenes</span>
				</a>

				<!-- Global Search & Filter Menu Button -->
				<button
					type="button"
					onclick={() => (showGlobalSearch = true)}
					class="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3"
					aria-label="Open Search and Filter Menu"
					title="Search & Filter Catalog"
				>
					<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<span class="hidden sm:inline">Search</span>
				</button>

				<!-- Settings / Theme Picker Link -->
				<a
					href={resolve('/settings')}
					class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 {currentPath.startsWith(
						'/settings'
					)
						? 'bg-blue-600 text-white shadow-sm'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
					aria-label="Theme and Preferences Settings"
					title="Themes & Settings"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<span class="hidden md:inline">Settings</span>
				</a>

				<a
					href="https://books.raggiesoft.com"
					target="_blank"
					rel="noopener noreferrer"
					class="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:flex"
				>
					<span>Books</span>
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

	<!-- ===================================================================== -->
	<!-- GLOBAL FOOTER: BEHIND THE SCENES, LEGAL, & HYBRID LICENSING           -->
	<!-- ===================================================================== -->
	<footer class="mt-12 border-t border-slate-800/80 bg-slate-900/60 px-4 py-8 text-xs text-slate-400 sm:px-6 lg:px-8">
		<div class="mx-auto flex max-w-7xl flex-col justify-between gap-6 lg:flex-row lg:items-center">
			<div class="space-y-1.5">
				<div class="flex flex-wrap items-center gap-2 font-bold text-slate-200">
					<span>The Listening Room</span>
					<span class="text-slate-600">&bull;</span>
					<span class="text-blue-400">Engine Room Records</span>
					<span class="text-slate-600">&bull;</span>
					<span>A Division of RaggieSoft Media</span>
				</div>
				<p class="leading-relaxed text-slate-400">
					<strong>Code:</strong> <a href={resolve('/terms')} class="text-slate-300 underline hover:text-white">MIT License</a> &bull;
					<strong>Creative Content &amp; Music:</strong>
					<a
						href="https://creativecommons.org/licenses/by-sa/4.0/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-slate-300 underline hover:text-white">CC BY-SA 4.0</a
					>
					(or applicable DSP License, or
					<a
						href="https://raggiesoft.com/raggiesoft-media/licensing/commercial"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-400 underline hover:text-blue-300"
						>Commercial License cleared by Michael Ragsdale / RaggieSoft Media ↗</a
					>)
				</p>
				<p class="leading-relaxed text-slate-400">
					<strong class="text-slate-300">Fictitious Disclaimer:</strong> All bands, characters,
					universities (including Commonwealth Polytechnic Institute / CPI, The Forgers, The
					Ironheads, The Crucible, Virginia Dominion University / VDU, Piedmont Virginia University /
					PVU, and Monongahela State University / MSU), corporations (including OmniCorp, Apex
					Records, Prairie Coachworks, and Sainte-Claire), transit agencies (Blue Ridge Transit),
					legal contracts, and historical events depicted on this site are works of fiction. Any
					resemblance to actual persons, living or dead, businesses, institutions, or events is
					purely coincidental.
				</p>
			</div>

			<nav class="flex flex-wrap items-center gap-x-5 gap-y-2 font-semibold text-slate-300" aria-label="Footer Legal and Behind the Scenes Links">
				<a href={resolve('/behind-the-scenes')} class="transition-colors hover:text-blue-400">
					Behind the Scenes (AI &amp; Process)
				</a>
				<a href={resolve('/terms')} class="transition-colors hover:text-blue-400">
					Terms &amp; Licensing
				</a>
				<a href={resolve('/privacy')} class="transition-colors hover:text-blue-400">
					Privacy Policy
				</a>
				<a
					href="https://raggiesoft.com/raggiesoft-media/licensing/commercial"
					target="_blank"
					rel="noopener noreferrer"
					class="text-amber-300 transition-colors hover:text-amber-200"
				>
					Commercial Licensing ↗
				</a>
			</nav>
		</div>
	</footer>
</div>

<!-- Global Search & Filter Modal -->
<SearchFilterModal
	isOpen={showGlobalSearch}
	onClose={() => (showGlobalSearch = false)}
	isStandaloneGlobal={true}
/>

<!-- Global Add-to-Playlist Modal -->
<AddToPlaylistModal />

<!-- Persistent Global Audio Player -->
<Player />
