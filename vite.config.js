/**
 * @license MIT
 * ============================================================================
 * vite.config.js
 * ============================================================================
 * Vite 8 configuration for Engine Room Records (music.raggiesoft.com).
 * In SvelteKit 3, all SvelteKit options (adapter, compilerOptions, runes)
 * are configured directly via the `sveltekit({...})` plugin.
 * ============================================================================
 */
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: true
			}
		})
	]
});
