/**
 * @license MIT
 * ============================================================================
 * eslint.config.js — JavaScript & Svelte Code Quality ("Linter") Configuration
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is ESLint?
 *     ESLint is an automated proofreader ("linter") for JavaScript and Svelte
 *     files. Just like a spell-checker underlines typos in an essay before you
 *     turn it in, ESLint scans our source code for accidental bugs—such as
 *     using a variable that was never declared, leaving unused variables
 *     behind, or writing invalid Svelte component syntax.
 *
 *   How this file connects to The Listening Room:
 *     - Inputs: Reads `.gitignore` so ESLint skips generated/ignored folders,
 *       and loads official rulebooks for JavaScript (`@eslint/js`), Svelte 5
 *       (`eslint-plugin-svelte`), and Prettier (`eslint-config-prettier`).
 *     - Outputs: Exports a "Flat Config" array (via `defineConfig([...])`)
 *       consumed whenever `npm run lint` or your code editor's ESLint extension
 *       checks files in `music.raggiesoft.com`.
 * ============================================================================
 */

// Disable formatting rules in ESLint that would conflict with Prettier (our code formatter)
import prettier from 'eslint-config-prettier';
// Node.js built-in `node:path` module safely joins file paths across macOS, Linux, and Windows
import path from 'node:path';
// Official core JavaScript recommended lint rules from the ESLint team
import js from '@eslint/js';
// Svelte-specific lint rules that understand `.svelte` templates and `.svelte.js` runes
import svelte from 'eslint-plugin-svelte';
// Helper functions to build a modern ESLint v9+ "Flat Configuration" and import `.gitignore`
import { defineConfig, includeIgnoreFile } from 'eslint/config';
// Dictionary of built-in global variables in browsers (`window`, `document`) and Node (`process`)
import globals from 'globals';

// `import.meta.dirname` gives the absolute folder path where `eslint.config.js` lives.
// `path.resolve(...)` points directly to `.gitignore` in the same folder.
const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

// Export an ordered list of configuration objects. Later objects in this array
// can customize or override rules defined by earlier objects.
export default defineConfig([
	// 1. Automatically ignore every path listed in `.gitignore` (like `node_modules/`)
	includeIgnoreFile(gitignorePath),

	// 2. Also ignore compiled output (`build/`), SvelteKit's auto-generated cache
	//    (`.svelte-kit/`), and raw static files (`static/` like `sw.js` or icons)
	{
		ignores: ['build/**', '.svelte-kit/**', 'static/**']
	},

	// 3. Turn on standard JavaScript best-practice rules (catches typos, unreachable code, etc.)
	js.configs.recommended,

	// 4. Turn on Svelte 5 best-practice rules (validates `{#each}` keys, runes, etc.)
	svelte.configs.recommended,

	// 5. Turn off any stylistic ESLint rules (tabs vs. spaces, quotes) so Prettier handles formatting alone
	prettier,
	svelte.configs.prettier,

	// 6. Tell ESLint that our codebase runs in both Web Browsers (`window`, `localStorage`, `Audio`)
	//    and Node.js (`process`, `Buffer` during build scripts / SSR), so neither triggers "undefined variable" errors
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},

	// 7. Apply the Svelte parser to both `.svelte` UI components AND `.svelte.js` universal rune modules
	//    so Svelte 5 runes like `$state()` and `$derived()` parse cleanly
	{
		files: ['**/*.svelte', '**/*.svelte.js'],
		languageOptions: { parserOptions: {} }
	},

	// 8. Project-specific rule customization:
	//    SvelteKit's `resolve()` helper ensures programmatic `goto(resolve('/discography'))` calls
	//    always use valid route paths. Setting `ignoreLinks: true` lets `<a href={externalUrl}>`
	//    tags point freely to external streaming apps (Spotify, Apple Music) or CDN files without false errors.
	{
		// Enforce resolve() on programmatic navigation while allowing external dynamic href={...} links
		rules: {
			'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true }]
		}
	}
]);
