/**
 * @license MIT
 * ============================================================================
 * prettier.config.js — Automated Code Formatter Configuration
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is Prettier?
 *     While ESLint checks code for logic bugs, Prettier is an automatic
 *     "code beautifier." Whenever you save a file or run `npm run format`,
 *     Prettier standardizes indentation, quotes, line widths, and Tailwind CSS
 *     class order so every file in The Listening Room looks clean and uniform.
 *
 *   How this file connects to The Listening Room:
 *     - Inputs: Reads `./src/app.css` so the Tailwind CSS plugin knows our
 *       Tailwind v4 theme tokens when sorting `class="..."` attributes.
 *     - Outputs: Exports the formatting settings object used by Prettier CLI
 *       and code editor "Format on Save" integrations.
 * ============================================================================
 */

// JSDoc `@type` comment gives VS Code / editors autocomplete for Prettier options
// even in a plain `.js` file without needing TypeScript compilation!
/** @type {import("prettier").Config} */
const config = {
	// Indent nested blocks using tab characters (accessible: developers can set their own visual tab width)
	useTabs: true,

	// Prefer single quotes ('hello') over double quotes ("hello") in JavaScript strings
	singleQuote: true,

	// Omit trailing commas after the last item in arrays `[a, b]` and objects `{ a: 1, b: 2 }`
	trailingComma: 'none',

	// Wrap long lines of code onto multiple lines once they exceed ~100 characters
	printWidth: 100,

	// Load plugins so Prettier understands `.svelte` component syntax AND automatically
	// sorts Tailwind CSS utility classes into a predictable layout-to-color order
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],

	// Explicitly instruct Prettier to parse any `*.svelte` file using the Svelte parser
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],

	// Point `prettier-plugin-tailwindcss` to our Tailwind CSS v4 entry stylesheet
	tailwindStylesheet: './src/app.css'
};

// ES Module default export so Prettier can import this configuration object
export default config;
