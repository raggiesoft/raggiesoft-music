/**
 * @license MIT
 * ============================================================================
 * src/app.d.ts — Global TypeScript / JSDoc Ambient Type Declarations
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is a `.d.ts` ("Declaration") file?
 *     Even though The Listening Room is written in standard JavaScript (`.js`
 *     and `.svelte`) rather than TypeScript, SvelteKit and code editors read
 *     this `.d.ts` file behind the scenes to provide smart autocomplete and
 *     type checking (via JSDoc comments like `@type` and `@param`).
 *
 *   How this file connects to The Listening Room:
 *     - SvelteKit looks for `global.App` whenever pages load data, handle
 *       errors, or inspect request state (`event.locals`).
 *     - Because The Listening Room uses a Zero-Database Flat-File static
 *       architecture (where catalog data comes from `musicData.js`), we keep
 *       SvelteKit's default `App` namespace placeholders ready for future use.
 * ============================================================================
 */

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// Custom shape for SvelteKit error objects (`$page.error`), if customized
		// interface Error {}

		// Server-only per-request data attached in `src/hooks.server.js` (`event.locals`)
		// interface Locals {}

		// Shared data returned from root layout load functions to all pages
		// interface PageData {}

		// Ephemeral browser history state passed to `pushState` / `replaceState`
		// interface PageState {}

		// Hosting platform bindings (unused on static Nginx builds)
		// interface Platform {}
	}
}

// In TypeScript/ES Modules, an empty `export {}` marks this file as a module
// so `declare global` safely augments the global scope instead of replacing it.
export {};
