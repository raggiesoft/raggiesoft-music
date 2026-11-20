/**
 * @license MIT
 * ============================================================================
 * FILE: src/routes/studio/+page.js
 * URL SERVED: music.raggiesoft.com/studio (and http://localhost:5173/studio)
 * ============================================================================
 * PLAIN-ENGLISH OVERVIEW:
 * Maps the `src/routes/studio/` folder to the `/studio` URL, which hosts the
 * Engine Room Records Studio IDE & DistroKid-Style Hold-Spacebar WebVTT (`.vtt`)
 * Lyric Synchronizer.
 *
 * HOW `+page.js` PAIRS WITH `+page.svelte`:
 * - `+page.js` (this file) enables static prerendering (`build/studio.html`)
 *   so `/studio` can also open in static browser-export mode (allowing `.vtt`
 *   file downloads even without the local Vite dev server).
 * - `studio/+page.svelte` implements the interactive audio transport deck,
 *   Spacebar keydown/keyup timestamp capture engine, live WebVTT generator,
 *   and album/track lore editor. When run locally via `./studio.sh` (`npm run dev`),
 *   it connects to `/__studio_api/*` endpoints to write `.vtt` and `.json`
 *   files directly to disk.
 * ============================================================================
 */

// Pre-build a static HTML entry point for `/studio` during `npm run build`.
export const prerender = true;
