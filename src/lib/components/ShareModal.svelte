<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * ShareModal.svelte
	 * ============================================================================
	 * Interactive Modal Dialog for sharing any Album or Artist from anywhere in
	 * the Engine Room Records library.
	 *
	 * Replicates the RaggieSoft Book Library share experience (OpenGraph preview
	 * card, Facebook Share, Bluesky Compose, Copy Link, and Native Share) inside
	 * an accessible modal dialog.
	 * ============================================================================
	 */
	import ShareSection from './ShareSection.svelte';

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
	 * Closes modal on Escape key press.
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (isOpen && e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Share {title}"
	>
		<!-- Backdrop click area -->
		<button
			type="button"
			onclick={() => onClose()}
			class="fixed inset-0 h-full w-full cursor-default"
			aria-label="Close share dialog"
			tabindex="-1"
		></button>

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

			<ShareSection {title} {subtitle} {description} {url} {socialPreview} />
		</div>
	</div>
{/if}
