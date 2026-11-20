/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/settings/+page.js
 * URL SERVED: https://music.raggiesoft.com/settings
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW:
 * In SvelteKit's file-based router, the folder `src/routes/settings/` maps
 * directly to the `/settings` URL on The Listening Room.
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `+page.js` (this file) tells SvelteKit to pre-build `/settings` into a
 *   static HTML file at compile time (`build/settings.html`).
 * - `+page.svelte` renders the interactive preferences dashboard where a
 *   listener chooses their default streaming app (Spotify, Apple Music,
 *   Amazon Music, YouTube Music), color mode (Auto/Light/Dark), adaptive
 *   theme palette, and local storage reset controls.
 *
 * All user settings live 100% privately inside the visitor's own browser
 * (`window.localStorage`), so no server-side database or `load()` fetch is
 * needed here.
 * ============================================================================
 */

// Pre-renders the `/settings` shell to static HTML during `npm run build` so
// the page works offline inside the installed Progressive Web App (PWA).
export const prerender = true;
