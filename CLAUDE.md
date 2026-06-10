# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (runs on **port 5555**, not the default 5173)
- `npm run build` — type-check with `vue-tsc --noEmit`, then build to `dist/`. The build fails on any type error.
- `npm run preview` — serve the production build locally

Node version is pinned in `.node-version` (currently 24.x). There is no lint script and no test setup.

## Architecture

Single-page personal website styled as a phosphor-green CRT terminal. The entry point `src/main.ts` mounts `App.vue` into `#app` and imports global styles from `src/index.css`. Vue 3 `<script setup>` SFCs throughout. Tailwind v4 (CSS-first: tokens live in the `@theme` block in `src/index.css`; there is no `tailwind.config` file).

**Viewport contract:** the browser page never scrolls. `html`/`body` are `height: 100%; overflow: hidden` (`src/index.css`), `App.vue`'s `.room` is exactly `100dvh`, and the only scrollable element is `.screen` inside `Terminal.vue`. Anything that grows must grow inside `.screen`.

`App.vue` lays out the room: a fixed full-viewport `Backdrop.vue` behind everything, then a flex column `.stage` (z-indexed above) where the monitor takes all available height and a `.statusbar` sits below it (the tagline segment is hidden under 560px).

`Backdrop.vue` is a decorative, pointer-events-none Cape Town nightscape: hardcoded twinkling stars + the Southern Cross with pointers (small SVG, top right), an occasional meteor, the Table Mountain ridge (Devil's Peak / table / Lion's Head / Signal Hill) as a glowing SVG silhouette with a blurred drifting "tablecloth" cloud and amber City Bowl lights, a glowing horizon line, and a scrolling rotateX perspective grid floor below it. All animation is CSS-only and disabled under `prefers-reduced-motion`.

`Terminal.vue` is the whole show:

- **Chrome:** nested `#monitor` > `#bezel` > `.crt` > `.screen`. CRT effects (turn-on, scan band, scanlines/shadow-mask, flicker, vignette) are scoped CSS keyframes on `.crt` and overlay divs. All overlays are `pointer-events: none` and z-indexed above `.screen`.
- **Scripted sequence:** `powerOn()` (run on mount) reveals the boot lines, `whoami`, types `intro.txt` via the `typeit` library, then the social links and a hint. `bump()` auto-scrolls `.screen` to the bottom after every reveal and on each TypeIt step.
- **Interactive shell:** after the sequence, a live prompt accepts real input via a visually-hidden inline `<input class="ghost">`. Commands are handled in `runCommand()` (`help`, `whoami`, `links`, `date`, `echo`, `ls`, `clear`, `reboot`, plus easter eggs); output is rendered from the `history` array. ArrowUp/Down recalls history; Ctrl+C and Ctrl+L work. Clicking the screen focuses the input (skipped if text is selected, and never auto-focused on touch devices to avoid popping the keyboard). `reboot` resets all state and re-keys `.crt` (`powerCycles`) to replay the turn-on animation.
- `prefers-reduced-motion` skips the typing/flicker animations.

Theme tokens (`--color-phosphor*`, `--font-mono`, `--glow`) are defined in `src/index.css`; the body background is the dark "room" gradient + an SVG film-grain overlay. The IBM Plex Mono font is loaded from Google Fonts in `index.html`.
