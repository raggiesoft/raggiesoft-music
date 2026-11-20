/**
 * @license MIT
 * ============================================================================
 * src/hooks.server.js — SvelteKit Server Request Interceptor ("Middleware")
 * ============================================================================
 * Plain-English Overview (100-Level JavaScript Guide):
 *   What is `hooks.server.js` in SvelteKit?
 *     Whenever a browser requests a page during local development (`vite dev`),
 *     preview (`vite preview`), or static prerendering, SvelteKit runs the
 *     exported `handle({ event, resolve })` function FIRST—before rendering
 *     any `.svelte` page component. Think of it like a receptionist at the
 *     front desk checking every incoming URL and either redirecting the visitor
 *     or passing them along (`resolve(event)`) to the requested room.
 *
 *   Architectural Purpose in The Listening Room (`music.raggiesoft.com`):
 *     Earlier versions of the site used URLs starting with `/artists/...`
 *     (for example, `/artists/the-stardust-engine`). Today, canonical artist
 *     and album URLs live directly at the root (`/the-stardust-engine`).
 *     In production, our Nginx web server (`nginx-config/music.raggiesoft.com.conf`)
 *     sends an HTTP `301 Moved Permanently` redirect. This hook mirrors that
 *     exact `301` redirect in SvelteKit so links behave identically everywhere
 *     without needing client-side JavaScript.
 *
 *   Inputs & Outputs:
 *     - Input `event`: Object containing `event.url` (a standard JavaScript
 *       `URL` instance with `.pathname` and `.search`).
 *     - Input `resolve`: Function that continues normal SvelteKit page rendering.
 *     - Output: Returns a standard Web Fetch API `Response` object (either a
 *       `301` redirect response or the rendered page from `resolve(event)`).
 * ============================================================================
 */

/**
 * Intercepts every incoming server/dev HTTP request before route matching.
 *
 * @param {{ event: { url: URL }, resolve: (event: any) => Promise<Response> }} input
 * @returns {Promise<Response>}
 */
export async function handle({ event, resolve }) {
	// Extract the URL path (e.g., "/artists/the-stardust-engine"), defaulting to "/"
	const pathname = event.url.pathname || '/';

	// Case 1: Bare `/artists` or `/artists/` (case-insensitive `/i` regex)
	// Redirects permanently (HTTP 301) to `/discography`, preserving any `?query=...` string
	if (/^\/artists\/?$/i.test(pathname)) {
		const target = `/discography${event.url.search || ''}`;
		return new Response(null, {
			status: 301,
			headers: { Location: target }
		});
	}

	// Case 2: Deep legacy `/artists/<anything>` URL (e.g., `/artists/the-stardust-engine/1997-hard-reset`)
	// Strips the leading `/artists` prefix and any trailing slashes (`trailingSlash = 'never'`),
	// then returns an HTTP 301 redirect pointing to the clean root-level canonical URL.
	if (/^\/artists\/.+/i.test(pathname)) {
		const cleanPath = pathname.replace(/^\/artists\//i, '/').replace(/\/+$/, '') || '/';
		const target = `${cleanPath}${event.url.search || ''}`;
		return new Response(null, {
			status: 301,
			headers: { Location: target }
		});
	}

	// Case 3: All canonical URLs pass straight through to SvelteKit's normal page renderer
	return resolve(event);
}
