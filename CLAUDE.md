# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (runs on **port 5555**, not the default 5173)
- `npm run build` — type-check with `vue-tsc --noEmit`, then build to `dist/`. The build fails on any type error.
- `npm run preview` — serve the production build locally

Node version is pinned to `16.13.1` (`.node-version`). There is no lint script and no test setup.

## Architecture

Single-page personal website. The entry point `src/main.ts` mounts `App.vue` into `#app` and imports global styles from `src/index.css`. Vue 3 `<script setup>` SFCs throughout.

`App.vue` is the whole page (title, terminal, footer) styled almost entirely with Tailwind utility classes. The one interactive piece is `Terminal.vue`, rendered as `<terminal>`: it draws a faux CRT monitor (nested `#monitor` > `#bezel` > `#crt` > `.terminal` divs) whose effects — scanline, flicker, chromatic text-shadow — are scoped CSS keyframe animations. On mount it uses the `typeit` library to type a scripted sequence of strings into `.terminal`. The displayed text lives in the `strings` array inside `Terminal.vue`'s `onMounted`, not in any prop (the `msg` prop is declared but unused).

`HelloWorld.vue` is leftover Vite scaffold: imported in `App.vue` but not rendered. Safe to remove.

Tailwind is configured with `darkMode: 'class'` and scans `index.html` + `src/**`. The page background (`bg-slate-800`) is set on `<body>` in `index.html`.
