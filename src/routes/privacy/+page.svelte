<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Privacy Policy — /privacy)
	 * ============================================================================
	 * Architectural Overview:
	 * Renders the Privacy Policy for The Listening Room (music.raggiesoft.com)
	 * and the wider RaggieSoft network, operated by Michael P. Ragsdale (a
	 * natural person residing in the Commonwealth of Virginia operating under
	 * the unincorporated creative imprints RaggieSoft, RaggieSoft Media, and
	 * Engine Room Records).
	 *
	 * Key Disclosures:
	 * 1. Natural-Person Data Controller Identity & Zero-Database Architecture:
	 *    Explains that Michael P. Ragsdale operates The Listening Room as an
	 *    individual creator with zero user accounts, zero login walls, and zero
	 *    SQL/NoSQL backend databases.
	 * 2. Local-First Browser Storage (`localStorage` & Service Worker Cache):
	 *    - Playback position, preferred streaming service (`raggiesoft_preferred_dsp`),
	 *      theme settings (`engine_room_settings`), and dismissed UI notices are stored
	 *      exclusively on the listener's device and never sent to a remote server.
	 * 3. Server Logs ("Jessica" NYC1) & CDN Delivery (`assets.raggiesoft.com`).
	 * 4. Infrastructure & Edge Security (Cloudflare WAF/CDN).
	 * 5. Anonymous Aggregate Telemetry (Google Analytics 4 — `G-P9RG9JVYB6`).
	 * 6. Voluntary Scheduling & Email Correspondence (Microsoft Bookings / M365).
	 * 7. E-Commerce Merchant of Record (Fourthwall Inc. — `store.raggiesoft.com`).
	 * 8. VCDPA / CCPA / GDPR Rights, Children's Privacy & Revision Ledger.
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy Policy | The Listening Room</title>
	<meta
		name="description"
		content="Privacy Policy for The Listening Room (music.raggiesoft.com), operated by Michael P. Ragsdale. Zero user accounts, zero databases, local-first storage."
	/>
	<link rel="canonical" href="https://music.raggiesoft.com/privacy" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:url" content="https://music.raggiesoft.com/privacy" />
	<meta property="og:title" content="Privacy Policy | The Listening Room" />
	<meta
		property="og:description"
		content="Privacy Policy for The Listening Room (music.raggiesoft.com), operated by Michael P. Ragsdale. Zero user accounts, zero databases, local-first storage."
	/>
	<meta property="og:image" content="https://music.raggiesoft.com/og-image.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Privacy Policy | The Listening Room" />
	<meta
		name="twitter:description"
		content="Privacy Policy for The Listening Room (music.raggiesoft.com), operated by Michael P. Ragsdale. Zero user accounts, zero databases, local-first storage."
	/>
	<meta name="twitter:image" content="https://music.raggiesoft.com/og-image.jpg" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-10">
		<span
			class="inline-block rounded-full border border-blue-500/40 bg-blue-950/70 px-3 py-1 text-xs font-extrabold tracking-wider text-blue-300 uppercase"
		>
			Legal &bull; Privacy-First Zero-Database Architecture
		</span>
		<h1 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
		<p class="mt-2 font-mono text-xs text-slate-300 sm:text-sm">
			<strong>Effective Date:</strong> March 29, 2026 &bull; <strong>Last Updated:</strong> October 26,
			2026
		</p>
		<p class="mt-1 text-xs text-slate-400 sm:text-sm">
			Effective Across <strong class="text-slate-200">music.raggiesoft.com</strong> &amp; all
			<strong class="text-slate-200">*.raggiesoft.com</strong> Properties &bull; Operated by
			<strong class="text-slate-200">Michael P. Ragsdale</strong>
		</p>
	</section>

	<!-- Policy Sections -->
	<div class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				1. Data Controller Identity &amp; Zero-Database Architecture
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				Welcome to <strong class="text-white">The Listening Room</strong> (<code
					class="font-mono text-blue-300">music.raggiesoft.com</code
				>), part of the <strong class="text-white">RaggieSoft.com</strong> network. These web
				properties are owned and operated by <strong class="text-white">Michael P. Ragsdale</strong
				>, a natural person and individual creator residing in the
				<strong class="text-white">Commonwealth of Virginia</strong>, operating under the
				unincorporated creative imprints <strong class="text-white">RaggieSoft</strong>,
				<strong class="text-white">RaggieSoft Media</strong>,
				<strong class="text-white">Engine Room Records</strong> (music imprint), and
				<strong class="text-white">Ocean View Archives</strong> (literary/book publishing imprint)—each
				strictly without “LLC”, “Inc.”, or “Corp.” (any “LLC” or “Trust” names appearing in site lore
				are fictitious worldbuilding creations).
			</p>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				I have engineered The Listening Room and the entire RaggieSoft network using a strict
				<strong class="text-white">Zero-Database Architecture</strong>: there are no user accounts,
				no registration forms, no password databases, no comment sections, and no customer
				relationship databases hosted on our servers.
			</p>
		</section>

		<hr class="border-slate-800" />

		<section class="space-y-4">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				2. Information Processed &amp; Third-Party Infrastructure
			</h2>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
				<h3 class="text-sm font-bold text-blue-400">
					A. Local Browser Storage &amp; Service Worker Cache (100% On-Device)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					To provide a seamless listening experience without requiring an account, The Listening
					Room uses your browser’s local <code class="font-mono text-slate-200">localStorage</code>
					and Progressive Web App Service Worker cache to remember:
				</p>
				<ul class="mt-2.5 list-inside list-disc space-y-1 text-xs text-slate-300 sm:text-sm">
					<li>
						Your last played track, queue, and timestamp (<code class="font-mono text-slate-200"
							>raggiesoft_music_session_v1</code
						>) so you can resume where you left off.
					</li>
					<li>
						Your preferred default streaming service (<code class="font-mono text-slate-200"
							>raggiesoft_preferred_dsp</code
						> — Spotify, Apple Music, Amazon Music, or YouTube Music).
					</li>
					<li>
						Your visual theme, color mode, and accessibility settings (<code
							class="font-mono text-slate-200">engine_room_settings</code
						>).
					</li>
					<li>
						Dismissed notification banners so we don’t repeatedly interrupt your session.
					</li>
				</ul>
				<p class="mt-2 text-xs text-slate-400">
					This data stays strictly inside your own browser and is never transmitted to our servers.
					You can reset or clear it at any time from the <a
						href={resolve('/settings')}
						class="text-blue-400 underline hover:text-blue-300">Settings</a
					> page.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
				<h3 class="text-sm font-bold text-blue-400">
					B. Origin Server Logs (“Jessica” — DigitalOcean NYC1) &amp; Asset Delivery
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					Our origin web server (“Jessica,” hosted on <strong class="text-white">DigitalOcean</strong
					>
					in the NYC1 data center region) and our static media CDN (<code
						class="font-mono text-slate-200">assets.raggiesoft.com</code
					>
					on DigitalOcean Spaces) automatically record standard HTTP access log entries in
					<code class="font-mono text-slate-200">/var/log/nginx/access.log</code>. These entries
					include the requesting IP address, HTTP method, requested URI, response status code,
					referrer header, browser user-agent string, and timestamp. Server logs are used solely for
					system administration, bandwidth diagnostics, and security auditing, are rotated
					automatically, and are never sold or shared with data brokers.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
				<h3 class="text-sm font-bold text-blue-400">
					C. Infrastructure, Reverse-Proxy CDN &amp; Edge Security (Cloudflare)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					All traffic to <code class="font-mono text-slate-200">raggiesoft.com</code>,
					<code class="font-mono text-slate-200">*.raggiesoft.com</code>, and
					<code class="font-mono text-slate-200">michaelpragsdale.com</code> passes through
					<strong class="text-white">Cloudflare, Inc.</strong> acting as our DNS provider, Content
					Delivery Network (CDN), and Web Application Firewall (WAF). Cloudflare processes network
					metadata (including IP addresses and TLS/HTTP fingerprints) at the network edge to mitigate
					DDoS attacks and malicious automated scraping, and may set strictly necessary security
					cookies (such as <code class="font-mono text-slate-200">__cf_bm</code> or
					<code class="font-mono text-slate-200">cf_clearance</code>) to distinguish human visitors
					from automated bots.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
				<h3 class="text-sm font-bold text-blue-400">
					D. Anonymous Aggregate Traffic Telemetry (Google Analytics 4)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					Select pages across the RaggieSoft network use
					<strong class="text-white">Google Analytics 4</strong> (Measurement ID:
					<code class="font-mono text-slate-200">G-P9RG9JVYB6</code>) to measure aggregate page
					views, referral sources, and general device categories so we can understand which albums,
					books, and technical articles are most useful to readers. Google Analytics 4 does not log
					or store individual IP addresses and is configured with advertising personalization and
					cross-site remarketing features disabled. You may block Google Analytics at any time using
					browser content blockers, script blockers, or the official Google Analytics Opt-Out
					Browser Add-on without affecting any functionality on our websites.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
				<h3 class="text-sm font-bold text-blue-400">
					E. Voluntary Scheduling &amp; Direct Correspondence (Microsoft 365 &amp; Bookings)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					If you voluntarily send an email to an <code class="font-mono text-slate-200"
						>@raggiesoft.com</code
					>
					or <code class="font-mono text-slate-200">@engineroom-records.com</code> address, or if
					you book a consultation through our embedded
					<strong class="text-white">Microsoft Bookings</strong> page (hosted on
					<strong class="text-white">Microsoft 365</strong>), the contact details and message content
					you provide are processed via Microsoft Corporation’s enterprise cloud infrastructure
					solely to respond to your inquiry or conduct your scheduled meeting.
				</p>
			</div>

			<div class="rounded-2xl border border-blue-500/40 bg-blue-950/25 p-5">
				<h3 class="text-sm font-bold text-blue-300">
					F. E-Commerce &amp; Digital Album Storefront (Fourthwall Inc. — Merchant of Record)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					Our official digital download and merchandise store at
					<code class="font-mono text-blue-200">store.raggiesoft.com</code> is hosted and operated
					by <strong class="text-white">Fourthwall Inc.</strong>, which acts as the independent
					legal <strong class="text-white">Merchant of Record</strong>. When you purchase a
					High-Quality MP3/OGG archive, Studio Master WAV/FLAC archive, or physical merchandise, you
					transact directly with Fourthwall Inc.
				</p>
				<p class="mt-2 text-xs font-semibold text-white sm:text-sm">
					Michael P. Ragsdale never collects, processes, or stores your credit card number, billing
					address, or payment instrument details on RaggieSoft servers.
				</p>
				<div class="mt-3">
					<a
						href="https://store.raggiesoft.com/pages/privacy-policy"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/50 bg-blue-950/70 px-3.5 py-2 text-xs font-bold text-blue-200 transition-colors hover:bg-blue-900/80 hover:text-white"
					>
						<span>Read Fourthwall’s Privacy Policy</span>
						<span aria-hidden="true">↗</span>
					</a>
				</div>
			</div>
		</section>

		<hr class="border-slate-800" />

		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				3. External Streaming Services &amp; Third-Party Links
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				The Listening Room provides direct links to stream our catalog on external Digital Service
				Providers (Spotify, Apple Music, Amazon Music, and YouTube Music). Once you click an
				external streaming link and leave <code class="font-mono text-slate-200"
					>music.raggiesoft.com</code
				>, your activity on that platform is governed by the privacy policy of that respective
				streaming service.
			</p>
		</section>

		<hr class="border-slate-800" />

		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				4. No Sale of Personal Data &amp; Your Privacy Rights (VCDPA / CCPA / GDPR)
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				<strong class="text-white">We Do Not Sell or Share Personal Information:</strong> Michael P.
				Ragsdale does not sell, rent, lease, or trade personal information to third parties or data
				brokers, and does not engage in targeted cross-context behavioral advertising. Because we
				maintain no user account database on our servers, all browser preference state resides in
				your own browser’s <code class="font-mono text-slate-200">localStorage</code>, which you can
				inspect or delete at any time via the
				<a href={resolve('/settings')} class="text-blue-400 underline hover:text-blue-300"
					>Settings</a
				>
				page. If you have voluntarily corresponded with us via email or Microsoft Bookings and wish to
				request access to or deletion of that correspondence under applicable privacy laws (including
				the Virginia Consumer Data Protection Act, CCPA/CPRA, or GDPR), please contact us via the
				link below. The Services are intended for general audiences and are not directed to children
				under the age of 13.
			</p>
		</section>

		<hr class="border-slate-800" />

		<section class="space-y-3">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				5. Contact &amp; Public Revision Ledger
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				If you have questions regarding this Privacy Policy, please reach out to
				<strong class="text-white">Michael P. Ragsdale</strong> via the official channels listed at
				<a
					href="https://raggiesoft.com/contact"
					target="_blank"
					rel="noopener noreferrer"
					class="font-semibold text-blue-400 underline hover:text-blue-300"
					>raggiesoft.com/contact ↗</a
				>.
			</p>
			<div class="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-400">
				<h3 class="font-mono font-bold text-slate-200 uppercase">
					Public Revision Ledger (Git-Tracked)
				</h3>
				<ul class="mt-2 list-inside list-disc space-y-1">
					<li>
						<strong class="text-slate-200">October 26, 2026:</strong> Added explicit natural-person
						data controller disclosure (Michael P. Ragsdale vs. fictional in-universe LLCs),
						Zero-Database Architecture summary, disclosures for Google Analytics 4 (<code
							class="font-mono text-slate-200">G-P9RG9JVYB6</code
						>), Microsoft 365 / Microsoft Bookings, and VCDPA/CCPA/GDPR no-sale rights, and
						hardcoded effective/revision dates.
					</li>
					<li>
						<strong class="text-slate-200">March 29, 2026:</strong> Initial publication of the
						RaggieSoft &amp; Engine Room Records Privacy Policy covering on-device
						<code class="font-mono text-slate-200">localStorage</code>, DigitalOcean NYC1 server
						logs, Cloudflare WAF/CDN, and Fourthwall Merchant-of-Record separation.
					</li>
				</ul>
			</div>
		</section>
	</div>
</div>
