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
	let mobileMenuOpen = $state(false);

	// Track active route path for nav highlighting
	let currentPath = $derived(page.url?.pathname || '/');

	// Context-aware metadata for the Global Dual Timelines & DSP Verification Disclaimer
	let activeAlbum = $derived(/** @type {any} */ (page.data)?.album || null);
	let activeArtist = $derived(/** @type {any} */ (page.data)?.artist || null);
	let activeArtistSlug = $derived(
		page.params?.artist || activeAlbum?.artistSlug || activeArtist?.slug || ''
	);
	let activeArtistName = $derived(activeAlbum?.artist || activeArtist?.name || '');
	let activeAlbumSlug = $derived(page.params?.album || activeAlbum?.slug || '');
	let activeAlbumTitle = $derived(activeAlbum?.title || '');
	let activeLoreDate = $derived(activeAlbum?.temporalCoverage || activeAlbum?.year || '');
	let activeRealDate = $derived(activeAlbum?.datePublished || '2026');
	let activeTrackSlug = $state('');

	$effect(() => {
		if (typeof window === 'undefined' || !page.url) {
			activeTrackSlug = '';
			return;
		}
		activeTrackSlug =
			page.url.searchParams.get('track') ||
			page.url.searchParams.get('play') ||
			page.url.searchParams.get('song') ||
			'';
	});

	let dspVerificationUrl = $derived.by(() => {
		const baseUrl = 'https://engineroom.raggiesoft.com/dsp-verification/';
		if (!activeArtistSlug) return baseUrl;
		const params = new URLSearchParams();
		params.set('artist', activeArtistSlug);
		if (activeAlbumSlug) {
			params.set('album', activeAlbumSlug);
		}
		if (activeTrackSlug) {
			params.set('track', activeTrackSlug);
		}
		return `${baseUrl}?${params.toString()}`;
	});

	let dspVerificationLabel = $derived.by(() => {
		if (activeArtistName && activeAlbumTitle) {
			return `DSP Verification (${activeArtistName} — ${activeAlbumTitle}) ↗`;
		}
		if (activeArtistName) {
			return `DSP Verification (${activeArtistName}) ↗`;
		}
		return 'DSP Verification & Master ISRC Ledger ↗';
	});

	onMount(() => {
		// Initialize adaptive theme manager & prefers-color-scheme listener
		themeManager.init();
		dspManager.init();
		playlistManager.init();

		// Ensure the site-wide RaggieSoft Network menu dropdown & mobile drawer are bound after Svelte hydration
		if (typeof window !== 'undefined' && typeof (/** @type {any} */ (window)).initRaggieSoftNetworkMenu === 'function') {
			(/** @type {any} */ (window)).initRaggieSoftNetworkMenu();
		}

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
	class="flex min-h-screen max-w-full flex-col overflow-x-clip bg-slate-950 pb-36 text-slate-100 selection:bg-blue-600 selection:text-white"
>
	<!-- Omnidirectional RaggieSoft Ecosystem Network Bar (Hidden on mobile < 768px via raggiesoft-network.css?v=20261017j) -->
	<nav class="rs-network-bar" aria-label="RaggieSoft Ecosystem Network">
		<div class="rs-network-bar-inner">
			<span class="rs-network-label">✦ RaggieSoft Network:</span>
			<ul class="rs-network-links">
				<li><a href="https://raggiesoft.com">🌐 Hub</a></li>
				<li><a href="https://nebulae.raggiesoft.com">🌌 Nebulae</a></li>
				<li><a href="https://books.raggiesoft.com">📚 Books</a></li>
				<li class="rs-network-dropdown">
					<button
						type="button"
						class="rs-network-dropdown-toggle is-active"
						aria-expanded="false"
						aria-haspopup="true"
					>
						<span aria-hidden="true">⚙️</span>
						<span>Engine Room</span>
						<span class="rs-network-caret" aria-hidden="true">▾</span>
					</button>
					<ul class="rs-network-dropdown-menu" role="menu" aria-label="Engine Room Records & Band Roster">
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com"><span aria-hidden="true">⚙️</span><span>Engine Room Records Hub</span></a></li>
						<li role="none"><a role="menuitem" href="https://music.raggiesoft.com" aria-current="page" class="is-active"><span aria-hidden="true">🎧</span><span>The Listening Room</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists"><span aria-hidden="true">🎸</span><span>All Artists Directory (7)</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/isrc"><span aria-hidden="true">🏷️</span><span>Official ISRC Registry (QTAHP)</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/dsp-verification"><span aria-hidden="true">🔍</span><span>DSP Verification Ledger</span></a></li>
						<li class="rs-network-dropdown-divider" role="separator"></li>
						<li class="rs-network-dropdown-header" role="presentation">✦ Band Roster (A–Z)</li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/crimson-node"><span aria-hidden="true">🔴</span><span>Crimson Node</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/firelight"><span aria-hidden="true">🔥</span><span>Firelight</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/fractured-prisms"><span aria-hidden="true">💎</span><span>Fractured Prisms</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/mana-canvas"><span aria-hidden="true">🎨</span><span>Mana Canvas</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/the-arctic-symphony-project"><span aria-hidden="true">❄️</span><span>The Arctic Symphony Project</span></a></li>
						<li role="none"><a role="menuitem" href="https://engineroom.raggiesoft.com/artists/the-paper-wall"><span aria-hidden="true">🧱</span><span>The Paper Wall</span></a></li>
						<li role="none"><a role="menuitem" href="https://stardust.raggiesoft.com"><span aria-hidden="true">🚀</span><span>The Stardust Engine</span></a></li>
					</ul>
				</li>
				<li><a href="https://corporate.raggiesoft.com">🏢 Corporate</a></li>
				<li><a href="https://storetrainer.raggiesoft.com">💾 StoreTrainer</a></li>
				<li><a href="https://michaelpragsdale.com">👔 Michael P. Ragsdale</a></li>
			</ul>
		</div>
	</nav>

	<!-- Primary Global Header -->
	<header
		class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/85 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-2">
			<!-- Brand Logo & Home Link (Serves as the primary Home link across all viewports) -->
			<a
				href={resolve('/')}
				onclick={() => (mobileMenuOpen = false)}
				title="Return to The Listening Room Home (music.raggiesoft.com)"
				aria-label="The Listening Room by Engine Room Records — Home"
				class="group flex min-w-0 items-center gap-2.5 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:gap-3"
			>
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-md transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
				>
					<!-- Light Mode Logo: Pure Black on Transparent Background -->
					<img
						src="https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo.png"
						alt="Engine Room Records Logo"
						class="er-logo-light h-full w-full object-contain"
					/>
					<!-- Dark Mode Logo: Pure White on Transparent Background -->
					<img
						src="https://assets.raggiesoft.com/engine-room-records/images/logos/engine-room-records-logo-white.png"
						alt="Engine Room Records Logo"
						class="er-logo-dark h-full w-full object-contain"
					/>
				</div>
				<div class="min-w-0">
					<span class="block truncate text-sm leading-tight font-extrabold tracking-tight text-white sm:text-base"
						>The Listening Room</span
					>
					<span class="block truncate text-[10px] font-semibold tracking-wider text-blue-400 uppercase sm:text-[11px]"
						>by Engine Room Records</span
					>
				</div>
			</a>

			<!-- Trimmed Global Navigation Links & Action Controls -->
			<div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
				<nav class="hidden md:flex items-center gap-1 text-xs font-semibold lg:gap-2 lg:text-sm" aria-label="Global Navigation">
					{#if canInstall}
						<button
							type="button"
							onclick={installApp}
							class="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 xl:flex"
							aria-label="Install Engine Room Records as an App"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
						href={resolve('/discography')}
						class="rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:px-3 {currentPath !==
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
						class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:px-3 {currentPath.startsWith(
							'/playlists'
						)
							? 'bg-blue-600 text-white shadow-sm'
							: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
					>
						<span>Playlists</span>
					</a>

					<a
						href={resolve('/radio')}
						class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:px-3 {currentPath.startsWith(
							'/radio'
						)
							? 'bg-blue-600 text-white shadow-sm'
							: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
						<span>Radio</span>
					</a>

					<a
						href={resolve('/settings')}
						class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:px-3 {currentPath.startsWith(
							'/settings'
						)
							? 'bg-blue-600 text-white shadow-sm'
							: 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
						aria-label="Theme and Preferences Settings"
						title="Themes & Settings"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
						<span class="hidden lg:inline">Settings</span>
					</a>
				</nav>

				<!-- Global Search & Filter Menu Button -->
				<button
					type="button"
					onclick={() => (showGlobalSearch = true)}
					class="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3"
					aria-label="Open Search and Filter Menu"
					title="Search & Filter Catalog"
				>
					<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<span class="hidden sm:inline">Search</span>
				</button>

				<!-- Single Mobile Hamburger Menu Toggle (< 768px) -->
				<button
					type="button"
					id="mobile-menu-toggle"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					aria-expanded={mobileMenuOpen}
					aria-controls="music-mobile-navigation"
					aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
					class="flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-blue-500/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						{#if mobileMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Unified Mobile Hamburger Menu Panel (Local Links + Auto-Injected RaggieSoft Network Grid) -->
		<div
			id="music-mobile-navigation"
			class="{mobileMenuOpen ? 'block' : 'hidden'} md:hidden mx-auto max-w-7xl border-t border-slate-800 pt-3 mt-3"
		>
			<nav class="grid grid-cols-2 gap-2 text-xs font-bold" aria-label="Mobile Listening Room Navigation">
				<a
					href={resolve('/')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath === '/' ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					🏠 Home
				</a>
				<a
					href={resolve('/discography')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath.startsWith('/discography') ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					💿 Discography
				</a>
				<a
					href={resolve('/playlists')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath.startsWith('/playlists') ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					🎶 Playlists
				</a>
				<a
					href={resolve('/radio')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath.startsWith('/radio') ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					📻 Radio
				</a>
				<a
					href={resolve('/behind-the-scenes')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath.startsWith('/behind-the-scenes') ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					🎚️ Studio Workflow
				</a>
				<a
					href={resolve('/settings')}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-lg px-3 py-2.5 border {currentPath.startsWith('/settings') ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-slate-800 bg-slate-900/90 text-slate-200'}"
				>
					⚙️ Themes &amp; Settings
				</a>
			</nav>
		</div>
	</header>

	<!-- Main Page Slot (Routes render here) -->
	<main class="mx-auto w-full max-w-7xl flex-grow overflow-x-clip px-4 py-8 sm:px-6 lg:px-8">
		<!-- Global Dual Timelines & DSP Verification Disclaimer (Displayed at the top of EVERY page) -->
		<aside
			class="mb-6 rounded-2xl border border-amber-500/40 bg-amber-950/35 px-4 py-3 text-xs leading-relaxed text-amber-100 shadow-md sm:px-5 sm:py-3.5"
			aria-label="Dual Timelines and DSP Copyright Verification Disclaimer"
		>
			<div class="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
				<p class="font-extrabold tracking-wide text-amber-300 uppercase">
					⏱️ Dual Timelines Disclaimer (In-Universe Lore Era vs. 2026 Real-World Release)
				</p>
				<div class="flex flex-wrap items-center gap-3 text-[11px] font-bold">
					<a
						href={dspVerificationUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-amber-300 underline hover:text-white"
					>
						{dspVerificationLabel}
					</a>
					{#if activeArtistSlug}
						<span class="text-amber-500/60" aria-hidden="true">&bull;</span>
						<a
							href="https://engineroom.raggiesoft.com/dsp-verification/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-amber-300 underline hover:text-white"
						>
							Full Master ISRC Ledger ↗
						</a>
					{/if}
					<span class="text-amber-500/60" aria-hidden="true">&bull;</span>
					<a
						href={resolve('/behind-the-scenes')}
						class="text-amber-300 underline hover:text-white"
					>
						Behind the Scenes &rarr;
					</a>
				</div>
			</div>
			<p class="mt-1 text-amber-100/95">
				{#if activeArtistName && activeAlbumTitle}
					<strong>{activeArtistName}</strong> and the historical release date for <em>{activeAlbumTitle}</em> (<code>{activeLoreDate}</code>) represent <strong>in-universe narrative lore dates (<code>temporalCoverage</code>)</strong> within the fictional RaggieSoft literary universe. In the real world, <strong>100% of all sound recordings, lyrics, and arrangements on this release are original 2026 studio creations (<code>datePublished: {activeRealDate}</code>)</strong> written, produced, and owned by <strong>Michael P. Ragsdale</strong> under his real-world creative imprint <strong>Engine Room Records</strong> (<a href="https://engineroom-records.com/" class="text-amber-300 underline hover:text-white">engineroom-records.com</a> &bull; DSP Operations Contact: <code>dsp.operations@engineroom-records.com</code>).
				{:else if activeArtistName}
					<strong>{activeArtistName}</strong> and all historical release dates across their discography represent <strong>in-universe narrative lore dates (<code>temporalCoverage</code>)</strong> within the fictional RaggieSoft literary universe. In the real world, <strong>100% of all sound recordings, lyrics, and arrangements are original 2026 studio creations (<code>datePublished: 2026</code>)</strong> written, produced, and owned by <strong>Michael P. Ragsdale</strong> under his real-world creative imprint <strong>Engine Room Records</strong> (<a href="https://engineroom-records.com/" class="text-amber-300 underline hover:text-white">engineroom-records.com</a> &bull; DSP Operations Contact: <code>dsp.operations@engineroom-records.com</code>).
				{:else}
					All bands and historical release dates across this catalog (spanning <strong>1976–2016</strong>) represent <strong>in-universe narrative lore dates (<code>temporalCoverage</code>)</strong> within the fictional RaggieSoft literary universe. In the real world, <strong>100% of all sound recordings, lyrics, and arrangements are original 2026 studio creations (<code>datePublished: 2026</code>)</strong> written, produced, and owned by <strong>Michael P. Ragsdale</strong> under his real-world creative imprint <strong>Engine Room Records</strong> (<a href="https://engineroom-records.com/" class="text-amber-300 underline hover:text-white">engineroom-records.com</a> &bull; DSP Operations Contact: <code>dsp.operations@engineroom-records.com</code>).
				{/if}
			</p>
		</aside>

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
