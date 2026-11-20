/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/discography/+page.js
 * URL SERVED: https://music.raggiesoft.com/discography
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW:
 * In SvelteKit's file-based router, creating a folder named `discography`
 * inside `src/routes/` automatically creates the `/discography` web address!
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `src/routes/discography/+page.js` (this file) configures how SvelteKit
 *   builds the `/discography` route.
 * - `src/routes/discography/+page.svelte` contains the actual HTML template
 *   and interactive JavaScript that renders the searchable, filterable
 *   Engine Room Records catalog archive.
 *
 * Notice this `+page.js` does not need a `load()` function because
 * `discography/+page.svelte` imports the pre-compiled `allAlbums` and
 * `allArtists` arrays directly from `#lib/data/musicData.js`.
 * ============================================================================
 */

// Instructs SvelteKit to generate a static `build/discography.html` file at
// build time so visitors and search crawlers receive instant HTML markup.
export const prerender = true;
