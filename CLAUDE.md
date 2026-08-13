# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — fetch v86 guest assets if missing, then start the Vite dev server (**port 5555**). Proxies `/health` and `/ws` to the optional terminal backend on **8787**.
- `npm run fetch:v86` — download wasm / BIOS / Buildroot bzImage into `public/v86/`
- `npm run dev:server` — start the Apple Container terminal proxy (`server/`, port 8787)
- `npm run build` — fetch v86 assets if missing, type-check with `vue-tsc --noEmit`, then build the SPA to `dist/`. The build fails on any type error.
- `npm run build:server` — compile the proxy with `tsc` → `server/dist/`
- `npm run preview` — serve the production SPA build locally
- `npm run start:server` — run the compiled proxy

Node version is pinned in `.node-version` (currently 24.x). There is no lint script and no test setup. `postinstall` runs `scripts/fix-node-pty.mjs` so node-pty’s macOS `spawn-helper` is executable.

## Architecture

Single-page personal website styled as a phosphor-green CRT terminal. After the bezel power button is pressed, it downloads a tiny Linux (v86) behind a firmware-load screen and attaches a **real busybox shell** in xterm. If the guest fails to boot, it falls back to the local fake phosphor shell.

The entry point `src/main.ts` mounts `App.vue` into `#app` and imports global styles from `src/index.css`. Vue 3 `<script setup>` SFCs throughout. Tailwind v4 (CSS-first: tokens live in the `@theme` block in `src/index.css`; there is no `tailwind.config` file).

**Viewport contract:** the browser page never scrolls. `html`/`body` are `height: 100%; overflow: hidden` (`src/index.css`), `App.vue`'s `.room` is exactly `100dvh`, and the only scrollable element is `.screen` inside `Terminal.vue` (in **remote** mode `.screen` is `overflow: hidden` and xterm’s viewport scrolls instead). Anything that grows must grow inside `.screen`.

`App.vue` lays out the room: a fixed full-viewport `Backdrop.vue` behind everything, then a flex column `.stage` (z-indexed above) where the monitor takes all available height and a `.statusbar` sits below it (the tagline segment is hidden under 560px).

`Backdrop.vue` is a decorative, pointer-events-none Cape Town nightscape: hardcoded twinkling stars + the Southern Cross with pointers (small SVG, top right), an occasional meteor, the Table Mountain ridge (Devil's Peak / table / Lion's Head / Signal Hill) as a glowing SVG silhouette with a blurred drifting "tablecloth" cloud and amber City Bowl lights, a glowing horizon line, and a scrolling rotateX perspective grid floor below it. All animation is CSS-only and disabled under `prefers-reduced-motion`.

### Terminal (CRT + in-browser Linux)

`Terminal.vue` orchestrates chrome + power + boot + shell:

- **Chrome:** nested `#monitor` > `#bezel` > `.crt` > `.screen`. CRT effects (turn-on, scan band, scanlines/shadow-mask, flicker, vignette) are scoped CSS keyframes on `.crt` and overlay divs. All overlays are `pointer-events: none` and z-indexed above `.screen`.
- **Standby:** CRT stays dark until the bezel power button is pressed. No guest assets are fetched until then.
- **Loading:** `LoadScreen.vue` shows phosphor progress for `seabios.bin`, `vgabios.bin`, `v86.wasm`, and the Buildroot bzImage (`public/v86/`, fetched by `scripts/fetch-v86-assets.mjs`).
- **Scripted sequence:** after the download, `powerOn()` plays boot lines, `whoami`, types `intro.txt`, then social links — while v86 boots in the background with serial output buffered.
- **After intro:** either:
  - **linux** — v86 i386 guest, serial0 bridged to xterm (`src/terminal/v86Session.ts`). Networking uses a virtio NIC via the copy.sh public ethernet relay (`wss://relay.widgetry.org/`, override with `VITE_V86_RELAY_URL`); DHCP is brought up with `udhcpc` after login.
  - **local** — offline phosphor shell (`src/terminal/localShell.ts`: `help`, `whoami`, `links`, `date`, `echo`, `ls`, `clear`, `reboot`, easter eggs).
- **Modules:** `src/terminal/boot.ts` (copy/constants), `v86Assets.ts`, `v86Session.ts`, `localShell.ts`, `remoteSession.ts` (xterm mount; unused Apple Container attach still present), `theme.ts` (phosphor xterm theme).
- **reboot** disposes the guest, resets state, re-keys `.crt` (`powerCycles`), and replays the turn-on sequence using cached assets.
- `prefers-reduced-motion` skips typing/flicker animations; the guest is still started.

Guest images are gitignored; `predev` / `prebuild` download them from copy.sh / GitHub. First visit after power-on transfers ~11 MB (wasm + Linux); later power cycles in the same tab reuse the in-memory buffers.

### Terminal proxy (`server/`)

Node HTTP + `ws` + `node-pty`. On each WebSocket connection:

```
container run --rm -it --progress none --cpus … --memory … --name web-<id> busybox:latest sh
```

Bridges PTY ↔ WebSocket (resize via JSON `{ type: "resize", cols, rows }`). Session limits, idle/max lifetime, and optional `NETWORK=none` are env-driven (see `.env.example`). Requires Apple Container CLI (`container system start`) on Apple silicon / macOS 26+.

Static SPA deploys include the v86 guest (after `npm run fetch:v86` / `prebuild`). The Apple Container proxy in `server/` is optional and unused by the default power-on path.

Theme tokens (`--color-phosphor*`, `--font-mono`, `--glow`) are defined in `src/index.css`; the body background is the dark "room" gradient + an SVG film-grain overlay. The IBM Plex Mono font is loaded from Google Fonts in `index.html`.
