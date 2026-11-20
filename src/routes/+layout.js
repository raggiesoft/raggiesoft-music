/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/+layout.js
 * ROUTE SCOPE: Global Root Layout Configuration (Applies to EVERY URL on
 *              https://music.raggiesoft.com/*)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW FOR NEW WEB DEVELOPERS:
 * In SvelteKit, routes are created using folders and special "+" files inside
 * `src/routes/`. A `+layout.js` file placed at the very top of `src/routes/`
 * acts like a master switchboard for the entire website: every single page
 * (`+page.svelte`) inherits the settings exported from this file unless a
 * child folder overrides them.
 *
 * HOW SVELTEKIT PAIRS `+layout.js` WITH `+layout.svelte`:
 * - `+layout.js` (this file) defines *how* pages are built and served (static
 *   HTML generation, server-side rendering, and URL slash formatting).
 * - `+layout.svelte` (its partner file in the same folder) defines *what*
 *   visual frame wraps every page (the global navigation header, disclaimer
 *   banner, footer, modals, and persistent bottom audio player).
 *
 * WHAT THE USER EXPERIENCES BECAUSE OF THIS FILE:
 * Because we pre-build static HTML files (`prerender = true`) and render full
 * markup (`ssr = true`), pages load almost instantly, work offline when
 * installed as a Progressive Web App (PWA), and show rich preview cards when
 * shared on social media or indexed by search engines.
 * ============================================================================
 */

/**
 * `prerender = true` tells SvelteKit's build step (`npm run build` via
 * `@sveltejs/adapter-static`) to visit every route in the app ahead of time
 * and save a ready-made `.html` file into the `build/` folder. That way, our
 * web server (Nginx) can hand browsers finished HTML immediately with zero
 * database queries or server wait time.
 */
export const prerender = true;

/**
 * `ssr = true` enables Server-Side Rendering during that static build step.
 * Instead of shipping an empty `<div id="app"></div>` shell that requires
 * JavaScript before anything appears on screen, SvelteKit renders all album
 * titles, lyrics, lore notes, and `<meta>` SEO tags directly into the HTML.
 * Once the page arrives in the browser, Svelte "hydrates" it—attaching click
 * listeners and reactive audio controls seamlessly.
 */
export const ssr = true;

/**
 * `trailingSlash = 'never'` enforces clean, canonical URLs without a `/` at
 * the end (for example, `https://music.raggiesoft.com/discography` instead of
 * `https://music.raggiesoft.com/discography/`). Keeping one consistent URL
 * format prevents search engines from treating both versions as duplicate pages.
 */
export const trailingSlash = 'never';
