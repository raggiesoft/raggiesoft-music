<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * ShareSection.svelte
	 * ============================================================================
	 * Book-Reader-Style Social Share & OpenGraph Preview Component for
	 * Engine Room Records (music.raggiesoft.com).
	 *
	 * Modeled directly after `raggiesoft-book-library/sophia/landing.php` and
	 * `oliver.php` so listeners have an identical, reliable sharing experience
	 * across both the Book Library and the Audio Platform.
	 *
	 * Features:
	 * 1. OpenGraph Social Card Preview: Displays the 1200x630 `socialPreview`
	 *    image alongside the canonical share URL and metadata summary.
	 * 2. Direct Social Intents:
	 *    - Facebook Share (`https://www.facebook.com/sharer/sharer.php?u=...`)
	 *    - Bluesky Compose (`https://bsky.app/intent/compose?text=...`)
	 * 3. One-Tap Copy Link: Copies the canonical URL via `navigator.clipboard.writeText`
	 *    with visual button state confirmation ("Copied!").
	 * 4. Native OS Share Sheet: Invokes `navigator.share` when supported on
	 *    iOS, Android, and macOS Safari/Chrome.
	 * ============================================================================
	 */

	let {
		title = 'Engine Room Records',
		subtitle = 'Official Audio Platform',
		description = '',
		url = 'https://music.raggiesoft.com/',
		socialPreview = 'https://music.raggiesoft.com/og-image.jpg',
		sharePrompt = 'Share this release with friends and fellow listeners.'
	} = $props();

	let copied = $state(false);
	/** @type {any} */
	let copyTimer = null;

	// Derived encoded URLs for Facebook & Bluesky social intents
	let facebookShareUrl = $derived(
		`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
	);

	let blueskyShareUrl = $derived(
		`https://bsky.app/intent/compose?text=${encodeURIComponent(`Listening to "${title}" (${subtitle}) on Engine Room Records! 🎶 ${url}`)}`
	);

	/**
	 * Copies the canonical link to the user's clipboard and triggers confirmation state.
	 */
	async function copyShareLink() {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(url);
				copied = true;
				if (copyTimer) clearTimeout(copyTimer);
				copyTimer = setTimeout(() => {
					copied = false;
				}, 2500);
			} catch (err) {
				console.warn('Clipboard copy failed:', err);
			}
		}
	}

	/**
	 * Invokes the native device share sheet if available, falling back to clipboard copy.
	 */
	async function triggerNativeShare() {
		const shareData = {
			title: `${title} | ${subtitle}`,
			text: description || `Listen to ${title} on Engine Room Records`,
			url
		};

		if (
			typeof navigator !== 'undefined' &&
			navigator.share &&
			(!navigator.canShare || navigator.canShare(shareData))
		) {
			try {
				await navigator.share(shareData);
				return;
			} catch {
				// User cancelled native share sheet; do nothing
				return;
			}
		}

		await copyShareLink();
	}
</script>

<section
	class="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md sm:p-8"
	aria-label="Share this page"
>
	<div class="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
		<!-- Left Column: Share Controls & Direct Links (7 cols on lg) -->
		<div class="space-y-4 lg:col-span-7">
			<div class="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-blue-400 uppercase">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
					/>
				</svg>
				Spread the Word
			</div>

			<h2 class="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
				Share "{title}"
			</h2>

			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				{sharePrompt} Every page on Engine Room Records includes a custom OpenGraph social preview card so your link looks great on Facebook, Bluesky, Discord, and iMessage.
			</p>

			<!-- Direct URL Display Box -->
			<div class="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-2.5">
				<span class="truncate px-2 font-mono text-xs text-slate-300 select-all">
					{url}
				</span>
				<button
					type="button"
					onclick={copyShareLink}
					class="ml-auto shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 {copied
						? 'bg-emerald-600 text-white'
						: 'bg-blue-600 text-white hover:bg-blue-500'}"
				>
					{copied ? '✓ Copied!' : 'Copy URL'}
				</button>
			</div>

			<!-- Action Buttons (Facebook, Bluesky, Copy Link, Native Share) -->
			<div class="flex flex-wrap items-center gap-3 pt-2">
				<!-- Facebook Share Intent -->
				<a
					href={facebookShareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-blue-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
					aria-label="Share on Facebook (opens in new tab)"
				>
					<svg class="h-4 w-4 fill-current text-blue-400" viewBox="0 0 24 24">
						<path
							d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"
						/>
					</svg>
					Facebook
				</a>

				<!-- Bluesky Share Intent -->
				<a
					href={blueskyShareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-sky-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:text-sm"
					aria-label="Share on Bluesky (opens in new tab)"
				>
					<svg class="h-4 w-4 fill-current text-sky-400" viewBox="0 0 24 24">
						<path
							d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
						/>
					</svg>
					Bluesky
				</a>

				<!-- Copy Link Button -->
				<button
					type="button"
					onclick={copyShareLink}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
				>
					<svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						/>
					</svg>
					{copied ? 'Link Copied!' : 'Copy Link'}
				</button>

				<!-- Native Device Share Sheet -->
				<button
					type="button"
					onclick={triggerNativeShare}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
				>
					<svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
						/>
					</svg>
					More Options...
				</button>
			</div>
		</div>

		<!-- Right Column: Social Preview Card Visual (5 cols on lg) -->
		<div class="lg:col-span-5">
			<div class="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/90 shadow-2xl">
				<div class="relative aspect-[1200/630] w-full overflow-hidden bg-slate-900">
					<img
						src={socialPreview}
						alt="Social preview card for {title}"
						class="h-full w-full object-cover"
						loading="lazy"
					/>
					<span
						class="absolute top-2.5 right-2.5 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-200 uppercase backdrop-blur-md"
					>
						Social Preview
					</span>
				</div>
				<div class="border-t border-slate-800/80 p-3.5">
					<p class="font-mono text-[10px] tracking-wider text-slate-400 uppercase">
						music.raggiesoft.com
					</p>
					<h3 class="mt-0.5 truncate text-sm font-bold text-white">
						{title} — {subtitle}
					</h3>
					{#if description}
						<p class="mt-1 line-clamp-2 text-xs text-slate-400">
							{description}
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

