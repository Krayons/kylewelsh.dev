# kylewelsh.dev

Personal site styled as a phosphor-green CRT terminal. The monitor stays off until you hit the bezel power button. That starts a firmware-load screen (wasm + BIOS + Linux image), then a scripted boot sequence, then a **real busybox shell** running in the browser via [v86](https://copy.sh/v86/). If the guest fails, it falls back to the local fake shell (`help`, `whoami`, `links`, …).

## Requirements

- **Node** 24.x (see `.node-version`)
- Network once, to fetch v86 guest assets into `public/v86/` (`npm run fetch:v86`, also run by `predev` / `prebuild`)

## Quick start

```bash
npm install
npm run dev          # http://localhost:5555
```

The CRT stays in standby until you press **power** (bottom-left of the bezel). The first power-on downloads ~11 MB (cached afterwards by the browser).

Guest images are not committed; `predev` / `prebuild` pull them into `public/v86/`. An older Apple Container proxy still lives in `server/` but is not wired to power-on.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run fetch:v86` | Download v86 wasm / BIOS / Buildroot image → `public/v86/` |
| `npm run dev` | Vite on port 5555 (runs `fetch:v86` first) |
| `npm run dev:server` | Terminal proxy (tsx watch) |
| `npm run build` | Type-check + build SPA → `dist/` |
| `npm run build:server` | Compile server → `server/dist/` |
| `npm run start:server` | Run compiled server |
| `npm run preview` | Preview production SPA |

## Architecture

- **Vue 3 + Vite + Tailwind v4** — CRT chrome, Cape Town backdrop, boot sequence
- **`src/terminal/`** — boot copy, v86 guest session, local shell fallback, phosphor theme
- **`public/v86/`** — SeaBIOS, v86 wasm, Buildroot bzImage (gitignored; fetched by script)
- **`server/`** — optional Node HTTP `/health` + WebSocket `/ws`, `node-pty` + `container` CLI
