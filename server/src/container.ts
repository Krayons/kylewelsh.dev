import { spawn as nodeSpawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { accessSync, constants } from 'node:fs'
import { delimiter } from 'node:path'
import pty from 'node-pty'
import type { IPty } from 'node-pty'
import { config } from './config.js'

/** Resolve container CLI to an absolute path so node-pty can spawn it reliably. */
function resolveContainerBin(bin: string): string {
  if (bin.includes('/')) return bin
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue
    const candidate = `${dir}/${bin}`
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      /* try next */
    }
  }
  // Common install location from Apple's pkg
  const fallback = `/usr/local/bin/${bin}`
  try {
    accessSync(fallback, constants.X_OK)
    return fallback
  } catch {
    return bin
  }
}

const containerBin = resolveContainerBin(config.containerBin)

export type ContainerHandle = {
  id: string
  name: string
  pty: IPty
  dispose: () => void
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/** Best-effort force-remove a container by name. */
export function forceRemoveContainer(name: string): void {
  const child = nodeSpawn(containerBin, ['delete', '--force', name], {
    stdio: 'ignore',
  })
  child.on('error', () => {
    /* binary missing or similar — ignore */
  })
}

/** Run `container system status` and return whether the API is up. */
export async function checkContainerRuntime(): Promise<{
  up: boolean
  detail: string
}> {
  return new Promise((resolve) => {
    const child = nodeSpawn(containerBin, ['system', 'status'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ up: false, detail: 'container system status timed out' })
    }, 4000)

    child.stdout?.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      err += d.toString()
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({
        up: false,
        detail: e.message.includes('ENOENT')
          ? `container binary not found (${containerBin})`
          : e.message,
      })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const text = (out + err).trim()
      if (code === 0 && /running/i.test(text)) {
        resolve({ up: true, detail: 'running' })
        return
      }
      resolve({
        up: false,
        detail: text || `container system status exited ${code ?? '?'}`,
      })
    })
  })
}

export function spawnBusyboxShell(opts: {
  cols: number
  rows: number
}): ContainerHandle {
  const id = randomUUID().slice(0, 8)
  const name = `web-${id}`

  const args = [
    'run',
    '--rm',
    '-i',
    '-t',
    '--progress',
    'none',
    '--cpus',
    config.cpus,
    '--memory',
    config.memory,
    '--name',
    name,
  ]

  if (config.network) {
    args.push('--network', config.network)
  }

  // Create non-root user `kyle`, own /home/kyle, then interactive shell as that user.
  // Prompt matches the faux terminal: kyle@home:~$
  // Newlines matter — do not join with "; " or `then`/`fi` break.
  const shellInit = `
set -e
if ! id kyle >/dev/null 2>&1; then
  adduser -D -u 1000 -h /home/kyle -s /bin/sh kyle
fi
mkdir -p /home/kyle
chown -R kyle:kyle /home/kyle
exec su -s /bin/sh kyle -c 'cd /home/kyle && export HOME=/home/kyle USER=kyle LOGNAME=kyle PS1="kyle@home:\\w\\$ " && exec sh -i'
`.trim()

  args.push(config.image, 'sh', '-c', shellInit)

  console.log(`[container] spawn ${containerBin} ${args.map(shellQuote).join(' ')}`)

  const term = pty.spawn(containerBin, args, {
    name: 'xterm-256color',
    cols: Math.max(20, opts.cols),
    rows: Math.max(5, opts.rows),
    env: process.env as Record<string, string>,
  })

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    try {
      term.kill()
    } catch {
      /* already dead */
    }
    // Safety net if --rm / kill didn't clean up
    setTimeout(() => forceRemoveContainer(name), 500)
  }

  return { id, name, pty: term, dispose }
}
