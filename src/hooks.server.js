/**
 * @license MIT
 * ============================================================================
 * src/hooks.server.js
 * ============================================================================
 * Server-side HTTP request hook for The Listening Room (`music.raggiesoft.com`).
 *
 * Architectural Purpose:
 * Mirrors the production Nginx `301` redirect rule (`nginx-config/music.raggiesoft.com.conf`)
 * during SvelteKit SSR, `vite dev`, and `vite preview` so legacy `/artists/*`
 * URLs immediately return a true HTTP `301` redirect to canonical `/*` paths
 * (and bare `/artists` redirects to `/discography`) without relying on
 * client-side JavaScript execution.
 * ============================================================================
 */

/**
 * @param {{ event: { url: URL }, resolve: (event: any) => Promise<Response> }} input
 * @returns {Promise<Response>}
 */
export async function handle({ event, resolve }) {
	const pathname = event.url.pathname || '/';

	if (/^\/artists\/?$/i.test(pathname)) {
		const target = `/discography${event.url.search || ''}`;
		return new Response(null, {
			status: 301,
			headers: { Location: target }
		});
	}

	if (/^\/artists\/.+/i.test(pathname)) {
		const cleanPath = pathname.replace(/^\/artists\//i, '/').replace(/\/+$/, '') || '/';
		const target = `${cleanPath}${event.url.search || ''}`;
		return new Response(null, {
			status: 301,
			headers: { Location: target }
		});
	}

	return resolve(event);
}
