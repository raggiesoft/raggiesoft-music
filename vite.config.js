/**
 * @license MIT
 * ============================================================================
 * vite.config.js
 * ============================================================================
 * Vite 8 configuration for Engine Room Records (music.raggiesoft.com).
 * Configures Tailwind CSS v4 and a dedicated static PWA adapter that outputs
 * production-ready HTML/JS/CSS bundles for high-performance Nginx hosting.
 * ============================================================================
 */
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * Custom static PWA adapter that exports static HTML/JS/CSS to `build/`
 * for zero-overhead Nginx static file serving with fallback routing.
 * @param {{ pages?: string, fallback?: string }} [options]
 * @returns {import('@sveltejs/kit').Adapter}
 */
function staticPwaAdapter(options = {}) {
	const out = options?.pages || 'build';
	const fallback = options?.fallback || '200.html';

	return {
		name: 'engine-room-static-pwa-adapter',
		async adapt(builder) {
			builder.rimraf(out);
			builder.mkdirp(out);

			builder.writeClient(out);
			builder.writePrerendered(out);

			if (fallback) {
				builder.generateFallback(`${out}/${fallback}`);
			}
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: staticPwaAdapter({ pages: 'build', fallback: '200.html' }),
			compilerOptions: {
				runes: true
			}
		})
	]
});
