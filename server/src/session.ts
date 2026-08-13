import type { WebSocket } from 'ws'
import { config } from './config.js'
import { spawnBusyboxShell, type ContainerHandle } from './container.js'

export type SessionManager = {
  count: () => number
  countForIp: (ip: string) => number
  tryAccept: (ws: WebSocket, ip: string, cols: number, rows: number) => Session | null
}

export type Session = {
  id: string
  name: string
  dispose: () => void
}

type Active = {
  ip: string
  handle: ContainerHandle
  idleTimer: ReturnType<typeof setTimeout> | null
  lifeTimer: ReturnType<typeof setTimeout> | null
  disposed: boolean
}

function clientIp(reqHeaders: { [key: string]: string | string[] | undefined }, remote?: string): string {
  const xff = reqHeaders['x-forwarded-for']
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0]!.trim()
  }
  return remote || 'unknown'
}

export function createSessionManager(): SessionManager {
  const active = new Map<string, Active>()

  const count = () => active.size
  const countForIp = (ip: string) =>
    [...active.values()].filter((s) => s.ip === ip).length

  function tryAccept(
    ws: WebSocket,
    ip: string,
    cols: number,
    rows: number,
  ): Session | null {
    if (active.size >= config.maxSessions) {
      return null
    }
    if (countForIp(ip) >= config.maxPerIp) {
      return null
    }

    let handle: ContainerHandle
    try {
      handle = spawnBusyboxShell({ cols, rows })
    } catch (e) {
      console.error('[session] spawn failed', e)
      return null
    }

    const entry: Active = {
      ip,
      handle,
      idleTimer: null,
      lifeTimer: null,
      disposed: false,
    }
    active.set(handle.id, entry)

    const touchIdle = () => {
      if (entry.disposed) return
      if (entry.idleTimer) clearTimeout(entry.idleTimer)
      entry.idleTimer = setTimeout(() => {
        console.log(`[session] idle timeout ${handle.name}`)
        dispose('idle')
      }, config.idleMs)
    }

    const dispose = (reason: string) => {
      if (entry.disposed) return
      entry.disposed = true
      if (entry.idleTimer) clearTimeout(entry.idleTimer)
      if (entry.lifeTimer) clearTimeout(entry.lifeTimer)
      active.delete(handle.id)
      console.log(`[session] end ${handle.name} reason=${reason} ip=${ip}`)
      handle.dispose()
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        try {
          ws.close(1000, reason)
        } catch {
          /* ignore */
        }
      }
    }

    entry.lifeTimer = setTimeout(() => {
      console.log(`[session] max life ${handle.name}`)
      dispose('max-life')
    }, config.maxLifeMs)

    // No client banner — frontend plays a continuous intro; PTY output continues it.

    handle.pty.onData((data) => {
      touchIdle()
      if (ws.readyState === ws.OPEN) {
        ws.send(data)
      }
    })

    handle.pty.onExit(({ exitCode, signal }) => {
      console.log(
        `[session] pty exit ${handle.name} code=${exitCode} signal=${signal ?? ''}`,
      )
      dispose('pty-exit')
    })

    ws.on('message', (raw, isBinary) => {
      touchIdle()
      if (entry.disposed) return

      // Control frames are JSON text: { type: "resize", cols, rows }
      if (!isBinary) {
        const text = typeof raw === 'string' ? raw : raw.toString('utf8')
        if (text.startsWith('{')) {
          try {
            const msg = JSON.parse(text) as {
              type?: string
              cols?: number
              rows?: number
            }
            if (
              msg.type === 'resize' &&
              typeof msg.cols === 'number' &&
              typeof msg.rows === 'number'
            ) {
              handle.pty.resize(
                Math.max(20, Math.floor(msg.cols)),
                Math.max(5, Math.floor(msg.rows)),
              )
              return
            }
          } catch {
            // fall through as stdin
          }
        }
        handle.pty.write(text)
        return
      }

      const buf = Buffer.isBuffer(raw)
        ? raw
        : Buffer.from(raw as ArrayBuffer)
      handle.pty.write(buf.toString('utf8'))
    })

    ws.on('close', () => dispose('ws-close'))
    ws.on('error', () => dispose('ws-error'))

    touchIdle()
    console.log(
      `[session] start ${handle.name} ip=${ip} sessions=${active.size}`,
    )

    return {
      id: handle.id,
      name: handle.name,
      dispose: () => dispose('manual'),
    }
  }

  return { count, countForIp, tryAccept }
}

export { clientIp }
