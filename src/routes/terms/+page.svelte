<script>
	/**
	 * @license MIT
	 * ============================================================================
	 * +page.svelte (Terms of Service & Licensing — /terms)
	 * ============================================================================
	 * Architectural Overview:
	 * Renders the legally binding Terms of Service and Hybrid Licensing Matrix
	 * for The Listening Room (music.raggiesoft.com), Engine Room Records, and
	 * RaggieSoft Media.
	 *
	 * Licensing Structure Enforced:
	 * 1. Source Code & Web Architecture: MIT License (Michael P. Ragsdale / RaggieSoft Media).
	 * 2. Creative Content, Lyrics, Lore & Web Streams:
	 *    - Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0), OR
	 *    - Applicable Digital Service Provider (DSP) License when streamed on
	 *      Spotify, Apple Music, Amazon Music, or YouTube Music, OR
	 *    - Commercial Synchronization / IP License cleared directly by
	 *      RaggieSoft Media (Michael Ragsdale) at:
	 *      https://raggiesoft.com/raggiesoft-media/licensing/commercial
	 * ============================================================================
	 */
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Terms of Service &amp; Licensing | The Listening Room — Engine Room Records</title>
	<meta
		name="description"
		content="Terms of Service and Licensing for The Listening Room (music.raggiesoft.com). Code is licensed under MIT; creative content is licensed under CC BY-SA 4.0, DSP license, or commercial clearance via RaggieSoft Media."
	/>
	<link rel="canonical" href="https://music.raggiesoft.com/terms" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="The Listening Room — Engine Room Records" />
	<meta property="og:url" content="https://music.raggiesoft.com/terms" />
	<meta
		property="og:title"
		content="Terms of Service & Licensing | The Listening Room — Engine Room Records"
	/>
	<meta
		property="og:description"
		content="Code: MIT License. Creative Content & Music: CC BY-SA 4.0, DSP License, or Commercial Clearance via RaggieSoft Media."
	/>
	<meta property="og:image" content="https://music.raggiesoft.com/og-image.jpg" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-10">
		<span
			class="inline-block rounded-full border border-blue-500/40 bg-blue-950/70 px-3 py-1 text-xs font-extrabold tracking-wider text-blue-300 uppercase"
		>
			Legal &bull; Hybrid Open &amp; Commercial Licensing
		</span>
		<h1 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
			Terms of Service &amp; Licensing
		</h1>
		<p class="mt-2 text-xs text-slate-400 sm:text-sm">
			Governing <strong class="text-slate-200">The Listening Room (music.raggiesoft.com)</strong>,
			<strong class="text-slate-200">Engine Room Records</strong>, and
			<strong class="text-slate-200">RaggieSoft Media</strong>
		</p>
	</section>

	<div class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
		<!-- 1. Acceptance -->
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">1. Acceptance of Terms</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				By accessing and using <strong class="text-white">The Listening Room</strong> (<code
					class="font-mono text-blue-300">music.raggiesoft.com</code
				>) or any property within the <strong class="text-white">RaggieSoft.com</strong> network, you
				agree to these Terms of Service and our hybrid licensing framework.
			</p>
		</section>

		<hr class="border-slate-800" />

		<!-- 2. Intellectual Property & Licensing -->
		<section class="space-y-5" aria-labelledby="licensing-heading">
			<div>
				<h2 id="licensing-heading" class="text-lg font-extrabold text-white sm:text-xl">
					2. Intellectual Property &amp; Hybrid Licensing
				</h2>
				<p class="mt-1 text-xs text-slate-400 sm:text-sm">
					RaggieSoft Media enforces open-source software and shared creative culture for community
					use, alongside direct commercial licensing for monetized and enterprise productions.
				</p>
			</div>

			<!-- A. Code: MIT License -->
			<div class="rounded-2xl border border-blue-500/40 bg-slate-950/80 p-5">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span
						class="rounded-full border border-blue-500/40 bg-blue-950/80 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue-300 uppercase"
					>
						Code License: MIT
					</span>
					<span class="font-mono text-xs text-slate-400">Software, Scripts &amp; Web Architecture</span>
				</div>
				<h3 class="mt-2.5 text-base font-extrabold text-white">
					Source Code: MIT License
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					All source code, SvelteKit components, catalog build scripts, and web architectures
					powering The Listening Room are released under the <strong class="text-white"
						>MIT License</strong
					>. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
					copies of the software, provided you include the original copyright notice (<code
						class="font-mono text-slate-200"
						>Copyright &copy; Michael P. Ragsdale / RaggieSoft Media</code
					>).
				</p>
			</div>

			<!-- B. Content: CC BY-SA 4.0 / DSP / RaggieSoft Media Commercial License -->
			<div class="rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-5">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span
						class="rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-300 uppercase"
					>
						Content License: CC BY-SA 4.0 &bull; DSP &bull; Commercial
					</span>
					<span class="font-mono text-xs text-slate-400">Music, Lyrics, Artwork &amp; Lore</span>
				</div>
				<h3 class="mt-2.5 text-base font-extrabold text-white">
					Creative Content: CC BY-SA 4.0 (or DSP License / RaggieSoft Media Commercial Clearance)
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
					All creative writing, lyrics, liner notes, album artwork, fictional universes (<em
						>The Stardust Engine, Static &amp; Silence, Runebreaker, Knox, Aethel</em
					>), and music hosted on this site are made available under one of three licensing paths:
				</p>
				<ul class="mt-3 space-y-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
					<li class="flex items-start gap-2">
						<span class="mt-0.5 font-bold text-emerald-400">1.</span>
						<span>
							<strong class="text-white"
								>Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0):</strong
							>
							You may share, remix, and adapt the work, provided you give appropriate credit to
							<strong class="text-white">Michael P. Ragsdale / RaggieSoft Media</strong> and distribute
							any derivative works under the same CC BY-SA 4.0 license.
							<a
								href="https://creativecommons.org/licenses/by-sa/4.0/"
								target="_blank"
								rel="noopener noreferrer"
								class="ml-1 text-emerald-400 underline hover:text-emerald-300"
								>View CC BY-SA 4.0 Deed ↗</a
							>
						</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 font-bold text-emerald-400">2.</span>
						<span>
							<strong class="text-white">Applicable DSP License:</strong> When you stream or purchase
							Engine Room Records releases on external Digital Service Providers (Spotify, Apple Music,
							Amazon Music, YouTube Music, or Fourthwall), your playback and usage rights are governed
							by that platform’s standard consumer license.
						</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 font-bold text-emerald-400">3.</span>
						<span>
							<strong class="text-white">Commercial License Cleared by RaggieSoft Media:</strong> If
							you wish to use Engine Room Records music, lyrics, or narrative IP in a commercial film,
							television broadcast, video game, advertisement, or monetized product without CC BY-SA
							4.0 ShareAlike restrictions, you may obtain a direct non-exclusive commercial license
							from <strong class="text-white">Michael Ragsdale</strong>.
						</span>
					</li>
				</ul>
			</div>

			<!-- C. Direct Link to Commercial Licensing Portal -->
			<div
				class="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 p-5"
			>
				<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
					<div class="space-y-1">
						<h4 class="text-sm font-extrabold text-amber-300 uppercase">
							Need a Commercial Synchronization or IP License from Michael Ragsdale?
						</h4>
						<p class="text-xs leading-relaxed text-slate-300">
							Visit the official <strong class="text-white">RaggieSoft Media Commercial Licensing Portal</strong>
							for details on flat-fee, non-exclusive synchronization clearances for Film &amp; TV, Interactive
							Media, and Broadcast Campaigns.
						</p>
					</div>
					<a
						href="https://raggiesoft.com/raggiesoft-media/licensing/commercial"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-amber-500/60 bg-amber-500/20 px-4 py-2.5 text-xs font-extrabold text-amber-200 shadow-md transition-all hover:bg-amber-500/30 hover:text-white"
					>
						<span>Commercial Licensing Portal</span>
						<span aria-hidden="true">↗</span>
					</a>
				</div>
			</div>
		</section>

		<hr class="border-slate-800" />

		<!-- 3. E-Commerce & Fourthwall -->
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				3. E-Commerce &amp; Digital Storefront (Fourthwall)
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				All physical merchandise and direct digital album downloads (High-Quality V0 MP3/OGG and
				Studio Master WAV/FLAC archives) purchased through <code class="font-mono text-slate-200"
					>store.raggiesoft.com</code
				>
				are facilitated by <strong class="text-white">Fourthwall</strong>, acting as the Merchant of
				Record. By placing an order on the store, you agree to Fourthwall’s terms, fulfillment
				policies, and return guidelines.
			</p>
			<div class="flex flex-wrap gap-2.5 pt-2">
				<a
					href="https://store.raggiesoft.com/pages/terms-of-service"
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
				>
					Store Terms of Service ↗
				</a>
				<a
					href="https://store.raggiesoft.com/pages/returns-faq"
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
				>
					Returns &amp; FAQ ↗
				</a>
				<a
					href="https://store.raggiesoft.com/contact"
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
				>
					Store Support ↗
				</a>
			</div>
		</section>

		<hr class="border-slate-800" />

		<!-- 4. Closed-System Roster Policy -->
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				4. Closed-System Label Policy (No Unsolicited Submissions)
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				Engine Room Records is an artistic closed system and fictional narrative label; every band
				and artist on the roster is an AI Persona directed by Michael P. Ragsdale. We do not sign
				external artists or review unsolicited demos. Any unsolicited submissions sent to our domain
				are automatically intercepted and permanently deleted unread at the mail transport rule
				level. See <a
					href={resolve('/behind-the-scenes')}
					class="text-blue-400 underline hover:text-blue-300">Behind the Scenes</a
				> for full details on our creative workflow.
			</p>
		</section>

		<hr class="border-slate-800" />

		<!-- 5. Work of Fiction & Fictitious Entities Disclaimer -->
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				5. Work of Fiction &amp; Fictitious Entities Disclaimer
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				All bands, characters, biographies, universities (including
				<strong class="text-white">Commonwealth Polytechnic Institute / CPI</strong>,
				<strong class="text-white">The Forgers</strong>,
				<strong class="text-white">The Ironheads</strong>,
				<strong class="text-white">The Crucible</strong>,
				<strong class="text-white">Virginia Dominion University / VDU</strong>,
				<strong class="text-white">Piedmont Virginia University / PVU</strong>, and
				<strong class="text-white">Monongahela State University / MSU</strong>), corporations
				(including <strong class="text-white">OmniCorp</strong>,
				<strong class="text-white">Apex Records</strong>,
				<strong class="text-white">Prairie Coachworks</strong>, and
				<strong class="text-white">Sainte-Claire</strong>), transit agencies (<strong
					class="text-white">Blue Ridge Transit</strong
				>), in-universe legal filings, trusts, and historical timelines presented on this website and
				across the RaggieSoft network are works of creative fiction. Any resemblance to actual
				persons, living or dead, real-world businesses, academic institutions, or events is purely
				coincidental.
			</p>
		</section>

		<hr class="border-slate-800" />

		<!-- 6. Disclaimer & Governing Law -->
		<section class="space-y-2">
			<h2 class="text-lg font-extrabold text-white sm:text-xl">
				6. Disclaimer of Warranty &amp; Governing Law
			</h2>
			<p class="text-xs leading-relaxed text-slate-300 sm:text-sm">
				This application and all content within are provided “as is” without warranty of any kind,
				express or implied. These Terms of Service are governed by the laws of the
				<strong class="text-white">Commonwealth of Virginia</strong> and the United States of America,
				with exclusive venue in the courts of Norfolk, Virginia.
			</p>
		</section>
	</div>
</div>
