<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * src/lib/components/AddToPlaylistModal.svelte — Global "Add to Playlist" Dialog
	 * ============================================================================
	 * Plain-English Overview (100-Level JavaScript & Svelte 5 Guide):
	 *   What does this component do?
	 *     Whenever a listener clicks the "+ Playlist" button next to any song on
	 *     an Album page or `/playlists`, `playlistManager.openAddModal(trackInfo)`
	 *     stores that song inside `playlistManager.addModalTrack`. Because this
	 *     modal is mounted once globally inside `+layout.svelte` and watches
	 *     `let track = $derived(playlistManager.addModalTrack)`, it pops open
	 *     automatically from anywhere on the site!
	 *
	 *   Key Svelte 5 & Web Accessibility Concepts Shown Here:
	 *     - `$state('')`: Local reactive variables for the "Create New Playlist"
	 *       text inputs (`newPlaylistName`, `newPlaylistDesc`) and green toast
	 *       confirmation banner (`confirmationMsg`).
	 *     - `bind:value={newPlaylistName}`: Two-way form input binding—typing in
	 *       the `<input>` updates `newPlaylistName`, and resetting `newPlaylistName = ''`
	 *       clears the `<input>` automatically!
	 *     - `<svelte:window onkeydown={handleKeydown} />`: Listens for the `Escape`
	 *       key anywhere in the browser window so keyboard & screen-reader users
	 *       can dismiss the modal effortlessly (`WCAG 2.1 AA` dialog pattern).
	 *     - `{#each playlistManager.playlists as pl (pl.id)}`: Keyed loop where
	 *       `(pl.id)` gives Svelte a unique ID for each row when playlists are
	 *       added or reordered.
	 *
	 * Architectural Responsibilities:
	 * 1. Reactive State Binding:
	 *    - Driven by `playlistManager.addModalTrack` so any route (`/[artist]/[album]`,
	 *      `/playlists`, etc.) can trigger it via `playlistManager.openAddModal(trackInfo)`.
	 * 2. Instant One-Tap Addition & Inline Creation:
	 *    - Lists the user's existing custom playlists with track counts and instant
	 *      "Add" confirmation feedback.
	 *    - Provides an inline "Create New Playlist & Add Track" form.
	 * 3. Accessibility (WCAG 2.1 AA):
	 *    - Supports Escape key dismissal, backdrop click dismissal, and ARIA dialog
	 *      semantics.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
	import { playlistManager } from '#lib/playlists.svelte.js';

	// Local reactive form fields (`$state`) scoped solely to this modal dialog
	let newPlaylistName = $state('');
	let newPlaylistDesc = $state('');
	let confirmationMsg = $state('');

	// `$derived(...)` mirrors `playlistManager.addModalTrack`:
	// - When `null`, the `{#if track}` block below renders nothing at all.
	// - When populated with a track object, the modal opens immediately.
	let track = $derived(playlistManager.addModalTrack);

	// Resets form inputs and clears `playlistManager.addModalTrack` to close the dialog
	function handleClose() {
		newPlaylistName = '';
		newPlaylistDesc = '';
		confirmationMsg = '';
		playlistManager.closeAddModal();
	}

	/**
	 * Appends the active track to an existing custom playlist in `localStorage`,
	 * shows a confirmation message for 900 milliseconds (`setTimeout`), and closes.
	 * @param {string} playlistId
	 * @param {string} playlistName
	 */
	function handleAddToExisting(playlistId, playlistName) {
		if (!track) return;
		playlistManager.addTrack(playlistId, {
			artistSlug: track.artistSlug,
			albumSlug: track.albumSlug,
			trackId: track.trackId
		});
		confirmationMsg = `Added "${track.title}" to "${playlistName}"!`;
		setTimeout(() => {
			handleClose();
		}, 900);
	}

	/**
	 * Creates a brand-new custom playlist pre-populated with the active track.
	 * Calls `e.preventDefault()` so submitting the HTML `<form>` doesn't reload the browser page!
	 * @param {SubmitEvent} e
	 */
	function handleCreateAndAdd(e) {
		e.preventDefault();
		if (!track) return;
		const title = newPlaylistName.trim() || `${track.title} Mix`;
		playlistManager.createPlaylist(title, newPlaylistDesc.trim(), [
			{
				artistSlug: track.artistSlug,
				albumSlug: track.albumSlug,
				trackId: track.trackId
			}
		]);
		confirmationMsg = `Created playlist "${title}" with "${track.title}"!`;
		setTimeout(() => {
			handleClose();
		}, 900);
	}

	/**
	 * Keyboard accessibility handler: closes the modal when the user presses `Escape`.
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (e.key === 'Escape' && track) {
			handleClose();
		}
	}
</script>

<!-- Attach a global keyboard listener to `window` that Svelte automatically cleans up on unmount -->
<svelte:window onkeydown={handleKeydown} />

<!-- Svelte conditional block: only mounts the modal DOM when `track` is non-null -->
{#if track}
	<!--
		Accessible Modal Overlay (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="..."`):
		Tells screen readers that background content is inert while this dialog is open,
		and links the dialog's accessible name to the `<h2 id="add-to-playlist-title">` heading.
	-->
	<div
		class="er-safe-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-to-playlist-title"
	>
		<!-- Full-screen invisible `<button>` behind the modal card (`z-10`) so clicking the dimmed backdrop closes the modal -->
		<button
			type="button"
			class="fixed inset-0 h-full w-full cursor-default"
			aria-label="Close modal"
			onclick={handleClose}
		></button>

		<!-- Foreground Modal Card (`relative z-10` sits above the backdrop button) -->
		<div
			class="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4"
			>
				<div class="flex items-center gap-2.5">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
					</span>
					<h2 id="add-to-playlist-title" class="text-base font-bold text-white">
						Add to Custom Playlist
					</h2>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
					aria-label="Close Add to Playlist modal"
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
			</div>

			<div class="max-h-[80vh] space-y-5 overflow-y-auto p-6">
				<!-- Selected Track Summary Card -->
				<div
					class="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
				>
					{#if track.artwork}
						<img
							src={track.artwork}
							alt="{track.album} cover artwork"
							width="48"
							height="48"
							loading="lazy"
							decoding="async"
							class="h-12 w-12 shrink-0 rounded-lg object-cover shadow"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-bold text-white">{track.title}</p>
						<p class="truncate text-xs text-slate-400">
							{track.artist} &bull; <span class="text-slate-300">{track.album}</span>
						</p>
					</div>
				</div>

				<!-- Show green `role="status"` live confirmation banner right after adding, or show the picker + form -->
				{#if confirmationMsg}
					<div
						class="rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-center text-sm font-semibold text-emerald-300"
						role="status"
					>
						✓ {confirmationMsg}
					</div>
				{:else}
					<!-- Existing User Playlists (rendered only if the user already has >= 1 custom playlist in localStorage) -->
					{#if playlistManager.playlists.length > 0}
						<div class="space-y-2">
							<h3 class="text-xs font-bold tracking-wider text-slate-400 uppercase">
								Your Custom Playlists
							</h3>
							<div class="max-h-44 space-y-1.5 overflow-y-auto pr-1">
								<!-- Keyed `{#each}` loop over `playlistManager.playlists` using `(pl.id)` as unique row key -->
								{#each playlistManager.playlists as pl (pl.id)}
									<button
										type="button"
										onclick={() => handleAddToExisting(pl.id, pl.name)}
										class="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 px-4 py-2.5 text-left transition-all hover:border-blue-500/50 hover:bg-slate-800"
									>
										<div class="min-w-0 pr-3">
											<p class="truncate text-sm font-semibold text-white">{pl.name}</p>
											<p class="text-xs text-slate-400">
												{pl.trackSpecs.length}
												{pl.trackSpecs.length === 1 ? 'track' : 'tracks'}
											</p>
										</div>
										<span
											class="shrink-0 rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-bold text-blue-300"
										>
											+ Add
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Create New Playlist & Add Form (`bind:value` keeps inputs synced with `$state` variables) -->
					<form onsubmit={handleCreateAndAdd} class="space-y-3 border-t border-slate-800 pt-4">
						<h3 class="text-xs font-bold tracking-wider text-slate-400 uppercase">
							Create New Custom Playlist
						</h3>
						<div>
							<label for="new-pl-name" class="mb-1 block text-xs font-medium text-slate-300">
								Playlist Name
							</label>
							<input
								id="new-pl-name"
								type="text"
								bind:value={newPlaylistName}
								placeholder="e.g., CPI Late Night Study Mix"
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label for="new-pl-desc" class="mb-1 block text-xs font-medium text-slate-300">
								Notes / Description (Optional)
							</label>
							<input
								id="new-pl-desc"
								type="text"
								bind:value={newPlaylistDesc}
								placeholder="Personal notes or story theme..."
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<div class="flex items-center justify-between gap-3 pt-1">
							<a
								href={resolve('/playlists')}
								onclick={handleClose}
								class="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
							>
								Manage all playlists &rarr;
							</a>
							<button
								type="submit"
								class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-colors hover:bg-blue-500"
							>
								Create &amp; Add Track
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}
