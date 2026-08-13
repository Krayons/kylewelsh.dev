import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { xtermBaseOptions } from './theme'

export type TerminalDisplay = {
  term: Terminal
  write: (data: string) => void
  writeln: (data?: string) => void
  focus: () => void
  dispose: () => void
  /** Current cols/rows after fit */
  size: () => { cols: number; rows: number }
}

export type PtyAttach = {
  /** True once the WebSocket is open (container may still be starting). */
  ready: Promise<void>
  /**
   * Begin forwarding PTY output to the terminal and keyboard to the PTY.
   * Any output buffered while the intro ran is flushed first.
   */
  goLive: () => void
  dispose: () => void
}

export type MountOptions = {
  host: HTMLElement
  autoFocus?: boolean
}

export type AttachOptions = {
  display: TerminalDisplay
  onDisconnected: (reason: string) => void
}

function healthUrl(): string {
  const base = import.meta.env.VITE_TERM_HTTP_URL as string | undefined
  if (base) return `${base.replace(/\/$/, '')}/health`
  return '/health'
}

function wsUrl(cols: number, rows: number): string {
  const configured = import.meta.env.VITE_TERM_WS_URL as string | undefined
  if (configured) {
    const u = new URL(configured)
    u.searchParams.set('cols', String(cols))
    u.searchParams.set('rows', String(rows))
    return u.toString()
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws?cols=${cols}&rows=${rows}`
}

function waitForLayout(el: HTMLElement, timeoutMs = 2000): Promise<void> {
  if (el.clientWidth > 20 && el.clientHeight > 20) return Promise.resolve()

  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      ro.disconnect()
      clearTimeout(timer)
      resolve()
    }
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 20 && el.clientHeight > 20) done()
    })
    ro.observe(el)
    const timer = setTimeout(done, timeoutMs)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (el.clientWidth > 20 && el.clientHeight > 20) done()
      }),
    )
  })
}

/** Probe the terminal proxy. Returns false on any failure. */
export async function probeTerminalBackend(
  timeoutMs = 4000,
): Promise<{ ok: boolean; detail?: string }> {
  const configured =
    (import.meta.env.VITE_TERM_WS_URL as string | undefined) ||
    (import.meta.env.VITE_TERM_HTTP_URL as string | undefined)
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]'

  if (!configured && !isLocal && !import.meta.env.DEV) {
    return { ok: false, detail: 'no terminal backend configured' }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(healthUrl(), {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        detail?: string
      } | null
      return { ok: false, detail: body?.detail || `health ${res.status}` }
    }
    const data = (await res.json()) as { ok?: boolean; detail?: string }
    return { ok: Boolean(data.ok), detail: data.detail }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unreachable'
    return { ok: false, detail: msg }
  } finally {
    clearTimeout(timer)
  }
}

/** Mount a phosphor-themed xterm into the CRT screen host (no network yet). */
export async function mountTerminal(
  opts: MountOptions,
): Promise<TerminalDisplay> {
  await waitForLayout(opts.host)

  const width = Math.max(opts.host.clientWidth, 320)
  const term = new Terminal({
    ...xtermBaseOptions,
    fontSize: Math.round(Math.min(16, Math.max(13, width / 58))),
    // Hide the block caret until the real shell is live — intro writes look scripted.
    cursorBlink: false,
    disableStdin: true,
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())
  term.open(opts.host)

  try {
    fit.fit()
  } catch {
    /* ignore */
  }

  const ro = new ResizeObserver(() => {
    try {
      fit.fit()
    } catch {
      /* ignore */
    }
  })
  ro.observe(opts.host)

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    ro.disconnect()
    term.dispose()
  }

  if (opts.autoFocus) term.focus()

  return {
    term,
    write: (data) => term.write(data),
    writeln: (data = '') => term.writeln(data),
    focus: () => term.focus(),
    dispose,
    size: () => ({
      cols: Math.max(term.cols || 80, 40),
      rows: Math.max(term.rows || 24, 12),
    }),
  }
}

/**
 * Open the PTY WebSocket while the intro still plays.
 * Output is buffered until `goLive()` so the shell prompt appears as a
 * natural continuation of the scripted sequence.
 */
export function attachPty(opts: AttachOptions): PtyAttach {
  const { display } = opts
  const { cols, rows } = display.size()

  let ws: WebSocket
  try {
    ws = new WebSocket(wsUrl(cols, rows))
  } catch (e) {
    return {
      ready: Promise.reject(e),
      goLive: () => {},
      dispose: () => {},
    }
  }
  ws.binaryType = 'arraybuffer'

  const buffer: string[] = []
  let live = false
  let disposed = false
  let intentionalClose = false
  let dataDisp: { dispose: () => void } | null = null
  let opened = false

  let resolveReady!: () => void
  let rejectReady!: (e: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const openTimer = setTimeout(() => {
    if (!opened) {
      rejectReady(new Error('websocket connect timeout'))
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
  }, 20_000)

  const pushOut = (chunk: string) => {
    if (live) display.write(chunk)
    else buffer.push(chunk)
  }

  const sendResize = () => {
    if (ws.readyState !== WebSocket.OPEN) return
    const s = display.size()
    ws.send(
      JSON.stringify({
        type: 'resize',
        cols: s.cols,
        rows: s.rows,
      }),
    )
  }

  const ro = new ResizeObserver(() => {
    if (disposed || !live) return
    sendResize()
  })
  // Observe the xterm element’s parent host via term element
  const host = display.term.element?.parentElement
  if (host) ro.observe(host)

  ws.onopen = () => {
    opened = true
    clearTimeout(openTimer)
    sendResize()
    resolveReady()
  }

  ws.onmessage = (ev) => {
    if (typeof ev.data === 'string') {
      pushOut(ev.data)
      return
    }
    if (ev.data instanceof ArrayBuffer) {
      pushOut(new TextDecoder().decode(ev.data))
      return
    }
    if (ev.data instanceof Blob) {
      void ev.data.text().then(pushOut)
    }
  }

  ws.onerror = () => {
    if (!opened) {
      clearTimeout(openTimer)
      rejectReady(new Error('websocket error'))
    }
  }

  ws.onclose = (ev) => {
    clearTimeout(openTimer)
    if (!opened) {
      rejectReady(new Error(ev.reason || 'websocket closed'))
      return
    }
    if (!intentionalClose && !disposed) {
      opts.onDisconnected(ev.reason || 'disconnected')
    }
  }

  const goLive = () => {
    if (live || disposed) return
    live = true

    // Enable interactive caret + keyboard for the real shell.
    display.term.options.disableStdin = false
    display.term.options.cursorBlink = true

    for (const chunk of buffer) display.write(chunk)
    buffer.length = 0

    dataDisp = display.term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    })

    sendResize()
    display.focus()
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    intentionalClose = true
    clearTimeout(openTimer)
    ro.disconnect()
    dataDisp?.dispose()
    try {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close()
      }
    } catch {
      /* ignore */
    }
  }

  return { ready, goLive, dispose }
}
