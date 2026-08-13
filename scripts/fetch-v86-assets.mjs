#!/usr/bin/env node
/**
 * Pull the v86 wasm + BIOS + Buildroot bzImage into public/v86/.
 * Skips files that already exist unless --force is passed.
 *
 * Sources:
 *   wasm     — copy.sh / GitHub releases (matches the v86 npm build)
 *   BIOS     — copy/v86 SeaBIOS images
 *   bzImage  — copy.sh Buildroot Linux (busybox)
 */
import { createWriteStream } from 'node:fs'
import { mkdir, stat, rename, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const destDir = join(__dirname, '../public/v86')
const force = process.argv.includes('--force')

const ASSETS = [
  {
    dest: 'v86.wasm',
    urls: [
      'https://copy.sh/v86/build/v86.wasm',
      'https://github.com/copy/v86/releases/latest/download/v86.wasm',
    ],
  },
  {
    dest: 'v86-fallback.wasm',
    urls: [
      'https://copy.sh/v86/build/v86-fallback.wasm',
      'https://github.com/copy/v86/releases/latest/download/v86-fallback.wasm',
    ],
    optional: true,
  },
  {
    dest: 'seabios.bin',
    urls: [
      'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin',
      'https://copy.sh/v86/bios/seabios.bin',
    ],
  },
  {
    dest: 'vgabios.bin',
    urls: [
      'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin',
      'https://copy.sh/v86/bios/vgabios.bin',
    ],
  },
  {
    dest: 'buildroot-bzimage.bin',
    urls: [
      'https://i.copy.sh/buildroot-bzimage68.bin',
      'https://copy.sh/v86/images/buildroot-bzimage68.bin',
    ],
  },
]

function fmt(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

async function exists(path) {
  try {
    const st = await stat(path)
    return st.isFile() && st.size > 0
  } catch {
    return false
  }
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const tmp = `${dest}.tmp`
  try {
    await pipeline(res.body, createWriteStream(tmp))
    await rename(tmp, dest)
  } catch (e) {
    await unlink(tmp).catch(() => {})
    throw e
  }
}

async function fetchOne(asset) {
  const dest = join(destDir, asset.dest)
  if (!force && (await exists(dest))) {
    const st = await stat(dest)
    console.log(`[v86] skip ${asset.dest} (${fmt(st.size)})`)
    return true
  }

  let lastErr = null
  for (const url of asset.urls) {
    try {
      process.stdout.write(`[v86] fetch ${asset.dest} ← ${url}\n`)
      await download(url, dest)
      const st = await stat(dest)
      console.log(`[v86] wrote ${asset.dest} (${fmt(st.size)})`)
      return true
    } catch (e) {
      lastErr = e
      console.warn(`[v86] ${url} failed: ${e.message}`)
    }
  }

  if (asset.optional) {
    console.warn(`[v86] optional ${asset.dest} missing — continuing`)
    return true
  }
  console.error(`[v86] failed ${asset.dest}: ${lastErr?.message || 'unknown'}`)
  return false
}

await mkdir(destDir, { recursive: true })
const results = await Promise.all(ASSETS.map(fetchOne))
if (results.some((ok) => !ok)) {
  process.exit(1)
}
console.log('[v86] assets ready')
