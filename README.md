# The Listening Room & WebVTT Lyric Sync Studio (`music.raggiesoft.com`)

[![License: MIT](https://img.shields.io/badge/Code_License-MIT-0369a1.svg)](./LICENSE)
[![Framework: SvelteKit 2 + Svelte 5 Runes](https://img.shields.io/badge/Svelte_5-Runes_%2B_SvelteKit_2-ff3e00.svg)](https://svelte.dev)
[![Styling: Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4.svg)](https://tailwindcss.com)
[![Accessibility: WCAG 2.1 AA & Section 508 Web](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA_%2F_WebVTT-15803d.svg)](https://music.raggiesoft.com)

Production audio streaming Progressive Web App (PWA) and browser-based **WebVTT (`.vtt`) Lyric Caption Synchronizer** powering `https://music.raggiesoft.com` across 40+ albums and 500+ tracks.

---

## Architecture & Engineering Highlights

- **Svelte 5 Runes Reactivity (`$state`, `$derived`, `$effect`)**: Shared fine-grained reactive audio, playlist, theme, and DSP store-preference modules (`src/lib/*.svelte.js`) maintain uninterrupted gapless-style audio playback across SPA route transitions without legacy store boilerplate.
- **Hold-Spacebar WebVTT Caption Studio (`/studio`)**: Interactive in-browser caption timing tool engineered to align vocal phrasing and export W3C-compliant `WEBVTT` files (`NOTE SYNC_TYPE: HUMAN_VERIFIED`) for synchronized lyric/caption display.
- **OS MediaSession & Offline-Ready PWA**: Integrates native lock-screen, media-key, and Control Center metadata/artwork controls via the W3C `navigator.mediaSession` API alongside a Web App Manifest.
- **Build-Time Static Catalog & SEO Validator (`scripts/build-catalog.js` & `scripts/validate-seo.js`)**: Compiles structured album/track JSON manifests into `550+` static routes with verified OpenGraph tags, Twitter Cards, canonical URLs, and a unified `sitemap.xml`—requiring zero server-side SQL databases.
- **Code-Level WCAG 2.1 AA & Section 508 Web Accessibility**: Semantic HTML5 controls, full keyboard focus management across modals and tracklists, `autoplay: false` enforcement, and verified $\ge 4.5:1$ contrast across Light and Dark (`prefers-color-scheme`) themes.

---

## Local Development & Static Build

```bash
# Start Vite / SvelteKit local dev server
npm run dev

# Compile catalog manifests, build static export to ./build, and run SEO/route validation
npm run build
```

---

## Licensing & Fictitious Entities Disclaimer

- **Source Code:** Licensed under the **MIT License**.
- **Creative Audio & Lyric Catalogs:** Licensed under **CC BY-SA 4.0** (with commercial sync licensing documented at `https://corporate.raggiesoft.com`).
- **Fictitious Persons & Entities Disclaimer:** All narrative bands, artists, biographies, record labels (Engine Room Records, LLC, Apex Records), universities, and story events presented on `music.raggiesoft.com` are works of fiction created by Michael P. Ragsdale.
