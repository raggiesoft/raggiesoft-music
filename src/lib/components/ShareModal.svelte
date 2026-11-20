<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * src/lib/components/ShareModal.svelte — Pop-Up Social Share Dialog Wrapper
	 * ============================================================================
	 * Plain-English Overview (100-Level JavaScript & Svelte 5 Guide):
	 *   What does this component do, and how does it relate to `ShareSection.svelte`?
	 *     On full Artist and Album pages, `ShareSection.svelte` is rendered inline
	 *     near the bottom of the page. However, on grid cards (like `/discography`),
	 *     we also want a quick "Share" button that pops open that exact same UI
	 *     inside a centered modal overlay!
	 *
	 *     Rather than duplicating 200 lines of Facebook / Bluesky / Clipboard code,
	 *     `ShareModal.svelte` demonstrates **Component Composition**: it provides
	 *     the accessible modal backdrop, close button, and `Escape` key handler,
	 *     and renders `<ShareSection {title} {subtitle} ... />` right inside!
	 *
	 *   Svelte 5 `$props()` Concept:
	 *     In Svelte 5, child components receive inputs ("props") from their parent
	 *     by destructuring `$props()` with default fallback values (`isOpen = false`,
	 *     `onClose = () => {}`, etc.). Notice `{title}` in `<ShareSection {title} />`—
	 *     that is Svelte's shorthand for `title={title}`!
	 *
	 * Replicates the RaggieSoft Book Library share experience (OpenGraph preview
	 * card, Facebook Share, Bluesky Compose, Copy Link, and Native Share) inside
	 * an accessible modal dialog.
	 * ============================================================================
	 */
	import ShareSection from './ShareSection.svelte';

	// Receive modal state (`isOpen`, `onClose` callback) and OpenGraph card metadata from parent
	let {
		isOpen = false,
		onClose = () => {},
		title = '',
		subtitle = '',
		description = '',
		url = '',
		socialPreview = ''
	} = $props();

	/**
	 * Closes modal on Escape key press (`WCAG 2.1 AA` keyboard dismissal requirement).
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (isOpen && e.key === 'Escape') {
			onClose();
		}
	}
</script>

<!-- Listen globally for `Escape` key presses while this component is mounted -->
<svelte:window onkeydown={handleKeydown} />

<!-- Only render the modal overlay DOM when `isOpen` is `true` -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Share {title}"
	>
		<!-- Full-bleed backdrop click area (`tabindex="-1"` keeps keyboard Tab cycling focused on real controls inside the card) -->
		<button
			type="button"
			onclick={() => onClose()}
			class="fixed inset-0 h-full w-full cursor-default"
			aria-label="Close share dialog"
			tabindex="-1"
		></button>

		<!-- Scrollable modal container housing the close button and embedded `<ShareSection />` -->
		<div class="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl">
			<button
				type="button"
				onclick={() => onClose()}
				class="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 shadow-lg transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
				aria-label="Close share modal"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			<!-- Forward all metadata props to `ShareSection` using Svelte's `{propName}` attribute shorthand -->
			<ShareSection {title} {subtitle} {description} {url} {socialPreview} />
		</div>
	</div>
{/if}
