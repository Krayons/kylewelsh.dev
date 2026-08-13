# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (runs on **port 5555**, not the default 5173). Proxies `/health` and `/ws` to the terminal backend on **8787**.
- `npm run dev:server` — start the Apple Container terminal proxy (`server/`, port 8787)
- `npm run build` — type-check with `vue-tsc --noEmit`, then build the SPA to `dist/`. The build fails on any type error.
- `npm run build:server` — compile the proxy with `tsc` → `server/dist/`
- `npm run preview` — serve the production SPA build locally
- `npm run start:server` — run the compiled proxy

Node version is pinned in `.node-version` (currently 24.x). There is no lint script and no test setup. `postinstall` runs `scripts/fix-node-pty.mjs` so node-pty’s macOS `spawn-helper` is executable.

## Architecture

Single-page personal website styled as a phosphor-green CRT terminal, with an optional **real busybox shell** when a Mac-side proxy is available.

The entry point `src/main.ts` mounts `App.vue` into `#app` and imports global styles from `src/index.css`. Vue 3 `<script setup>` SFCs throughout. Tailwind v4 (CSS-first: tokens live in the `@theme` block in `src/index.css`; there is no `tailwind.config` file).

**Viewport contract:** the browser page never scrolls. `html`/`body` are `height: 100%; overflow: hidden` (`src/index.css`), `App.vue`'s `.room` is exactly `100dvh`, and the only scrollable element is `.screen` inside `Terminal.vue` (in **remote** mode `.screen` is `overflow: hidden` and xterm’s viewport scrolls instead). Anything that grows must grow inside `.screen`.

`App.vue` lays out the room: a fixed full-viewport `Backdrop.vue` behind everything, then a flex column `.stage` (z-indexed above) where the monitor takes all available height and a `.statusbar` sits below it (the tagline segment is hidden under 560px).

`Backdrop.vue` is a decorative, pointer-events-none Cape Town nightscape: hardcoded twinkling stars + the Southern Cross with pointers (small SVG, top right), an occasional meteor, the Table Mountain ridge (Devil's Peak / table / Lion's Head / Signal Hill) as a glowing SVG silhouette with a blurred drifting "tablecloth" cloud and amber City Bowl lights, a glowing horizon line, and a scrolling rotateX perspective grid floor below it. All animation is CSS-only and disabled under `prefers-reduced-motion`.

### Terminal (CRT + hybrid shell)

`Terminal.vue` orchestrates chrome + boot + shell mode:

- **Chrome:** nested `#monitor` > `#bezel` > `.crt` > `.screen`. CRT effects (turn-on, scan band, scanlines/shadow-mask, flicker, vignette) are scoped CSS keyframes on `.crt` and overlay divs. All overlays are `pointer-events: none` and z-indexed above `.screen`.
- **Scripted sequence:** `powerOn()` reveals boot lines, `whoami`, types `intro.txt` via TypeIt, then social links.
- **After intro:** probes `GET /health`, then either:
  - **remote** — mounts xterm.js in `.xterm-host`, WebSocket to `/ws`, real busybox via the Mac proxy (`src/terminal/remoteSession.ts`), or
  - **local** — offline phosphor shell (`src/terminal/localShell.ts`: `help`, `whoami`, `links`, `date`, `echo`, `ls`, `clear`, `reboot`, easter eggs).
- **Modules:** `src/terminal/boot.ts` (copy/constants), `localShell.ts`, `remoteSession.ts`, `theme.ts` (phosphor xterm theme).
- **reboot** disposes the remote session, resets state, re-keys `.crt` (`powerCycles`), and replays the turn-on sequence.
- `prefers-reduced-motion` skips typing/flicker animations; remote connect still attempted.

### Terminal proxy (`server/`)

Node HTTP + `ws` + `node-pty`. On each WebSocket connection:

```
container run --rm -it --progress none --cpus … --memory … --name web-<id> busybox:latest sh
```

Bridges PTY ↔ WebSocket (resize via JSON `{ type: "resize", cols, rows }`). Session limits, idle/max lifetime, and optional `NETWORK=none` are env-driven (see `.env.example`). Requires Apple Container CLI (`container system start`) on Apple silicon / macOS 26+.

Static SPA deploys work without the proxy; remote shell is only attempted when `VITE_TERM_WS_URL` / `VITE_TERM_HTTP_URL` are set, or when running on localhost/dev with the Vite proxy.

Theme tokens (`--color-phosphor*`, `--font-mono`, `--glow`) are defined in `src/index.css`; the body background is the dark "room" gradient + an SVG film-grain overlay. The IBM Plex Mono font is loaded from Google Fonts in `index.html`.
