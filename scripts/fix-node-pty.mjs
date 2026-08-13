#!/usr/bin/env node
/**
 * node-pty's darwin prebuild ships spawn-helper without +x after some npm
 * installs. Without it, every pty.spawn throws "posix_spawnp failed".
 */
import { chmodSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

function packageRoot() {
  try {
    return dirname(require.resolve('node-pty/package.json'))
  } catch {
    return null
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name === 'spawn-helper') out.push(p)
  }
  return out
}

const root = packageRoot()
if (!root) {
  console.warn('[fix-node-pty] node-pty not installed; skip')
  process.exit(0)
}

const helpers = walk(join(root, 'prebuilds'))
for (const helper of helpers) {
  try {
    chmodSync(helper, 0o755)
    console.log(`[fix-node-pty] chmod +x ${helper}`)
  } catch (e) {
    console.warn(`[fix-node-pty] could not chmod ${helper}:`, e.message)
  }
}

if (!helpers.length) {
  console.warn('[fix-node-pty] no spawn-helper found under prebuilds/')
}
