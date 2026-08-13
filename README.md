# kylewelsh.dev

Personal site styled as a phosphor-green CRT terminal. After a scripted boot sequence, the page tries to attach a **real busybox shell** via [xterm.js](https://xtermjs.org/) and a Mac-side proxy that starts an ephemeral [Apple Container](https://github.com/apple/container). If the proxy is offline, it falls back to the local fake shell (`help`, `whoami`, `links`, …).

## Requirements

- **Node** 24.x (see `.node-version`)
- **Frontend only:** nothing else
- **Live busybox sessions:** Apple silicon Mac, macOS 26+, [`container` CLI](https://github.com/apple/container) installed and running

## Quick start (frontend)

```bash
npm install
npm run dev          # http://localhost:5555
```

Without the terminal proxy, the boot sequence still runs and the **local phosphor shell** handles commands.

## Live terminal (Mac host)

1. Start Apple’s container system and pre-pull busybox:

```bash
container system start
container image pull busybox:latest
```

2. Start the WebSocket proxy (port **8787**):

```bash
npm run dev:server
```

3. In another terminal, start the site (Vite proxies `/health` and `/ws` → the proxy):

```bash
npm run dev
```

Open http://localhost:5555 — after the intro you should see `attached: busybox:latest @ container web-…` and a real `sh` prompt.

### Production env

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_TERM_WS_URL` | frontend build | e.g. `wss://term.example.com/ws` |
| `VITE_TERM_HTTP_URL` | frontend build | e.g. `https://term.example.com` (health) |
| `PORT`, `IMAGE`, `MAX_SESSIONS`, … | server process | see `.env.example` |

Static hosts can keep serving the SPA without a backend; remote shell is skipped unless those `VITE_*` URLs are set (or you’re on localhost in dev).

### Server notes

- Each WebSocket starts `container run --rm -it --progress none … busybox sh` under a PTY (`node-pty`).
- Defaults: 1 CPU, 256 MiB RAM, max 4 sessions, 2 per IP, 10 min idle / 30 min max life.
- Set `NETWORK=none` for a stricter demo (no outbound net from the container).
- Put TLS + reverse proxy in front of the server if you expose it publicly.
- `npm install` runs `scripts/fix-node-pty.mjs` to `chmod +x` node-pty’s `spawn-helper` (required on macOS or you get `posix_spawnp failed`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite on port 5555 |
| `npm run dev:server` | Terminal proxy (tsx watch) |
| `npm run build` | Type-check + build SPA → `dist/` |
| `npm run build:server` | Compile server → `server/dist/` |
| `npm run start:server` | Run compiled server |
| `npm run preview` | Preview production SPA |

## Architecture

- **Vue 3 + Vite + Tailwind v4** — CRT chrome, Cape Town backdrop, boot sequence
- **`src/terminal/`** — boot copy, local shell, xterm remote session, phosphor theme
- **`server/`** — Node HTTP `/health` + WebSocket `/ws`, `node-pty` + `container` CLI
