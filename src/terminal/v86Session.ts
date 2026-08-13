import type { TerminalDisplay } from './remoteSession'
import { loadFallbackWasm, type V86Buffers } from './v86Assets'

export type V86Attach = {
  /** Resolves once the guest prompt is seen, or after a boot timeout. */
  ready: Promise<void>
  goLive: () => void
  dispose: () => void
}

export type V86AttachOptions = {
  display: TerminalDisplay
  assets: V86Buffers
  onDisconnected: (reason: string) => void
}

const PROMPT_WAIT_MS = 22_000
const PROMPT_RE = /(?:~% |[%$#] )$/

/** copy.sh public ethernet relay — real TCP/DNS/HTTPS for the guest. */
const RELAY_URL =
  (import.meta.env.VITE_V86_RELAY_URL as string | undefined) ||
  'wss://relay.widgetry.org/'

const SETUP = [
  'ifconfig lo up 2>/dev/null',
  'ifconfig eth0 up 2>/dev/null',
  'udhcpc -q -n -t 3 -T 1 -i eth0 2>/dev/null || udhcpc -q -n -t 3 -T 1 2>/dev/null || :',
  "export PS1='kyle@home:\\w$ '",
].join('; ') + '\n'

function isPrompt(acc: string): boolean {
  return PROMPT_RE.test(acc) || acc.endsWith('~% ')
}

/** Boot the in-browser Linux and bridge serial0 ↔ xterm. */
export async function attachV86(opts: V86AttachOptions): Promise<V86Attach> {
  const { display, assets } = opts
  const { V86 } = await import('v86')

  const emulator = new V86({
    wasm_fn: async (imports: WebAssembly.Imports) => {
      try {
        const { instance } = await WebAssembly.instantiate(assets.wasm, imports)
        return instance.exports
      } catch {
        const fallback = await loadFallbackWasm()
        const { instance } = await WebAssembly.instantiate(fallback, imports)
        return instance.exports
      }
    },
    memory_size: 64 * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    bios: { buffer: assets.bios },
    vga_bios: { buffer: assets.vga },
    bzimage: { buffer: assets.linux },
    cmdline:
      'console=ttyS0,115200 tsc=reliable mitigations=off random.trust_cpu=on',
    filesystem: {},
    net_device: {
      type: 'virtio',
      relay_url: RELAY_URL,
    },
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
    acpi: false,
  })

  const buffer: string[] = []
  let live = false
  let disposed = false
  let acc = ''
  let setupSent = false
  let dataDisp: { dispose: () => void } | null = null

  let resolveReady!: () => void
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })

  const promptTimer = setTimeout(resolveReady, PROMPT_WAIT_MS)

  const onByte = (byte: number) => {
    const ch = String.fromCharCode(byte)
    if (ch !== '\r') {
      acc = (acc + ch).slice(-48)
      if (isPrompt(acc)) {
        if (!setupSent) {
          setupSent = true
          acc = ''
          emulator.serial0_send(SETUP)
        } else {
          clearTimeout(promptTimer)
          resolveReady()
        }
      }
    }
    if (live) display.write(ch)
    else buffer.push(ch)
  }

  emulator.add_listener('serial0-output-byte', onByte)

  emulator.add_listener('emulator-stopped', () => {
    if (!disposed && live) opts.onDisconnected('guest halted')
  })

  const goLive = () => {
    if (live || disposed) return
    live = true
    buffer.length = 0

    display.term.options.disableStdin = false
    display.term.options.cursorBlink = true

    dataDisp = display.term.onData((data) => {
      if (!disposed) emulator.serial0_send(data)
    })

    emulator.serial0_send('\n')
    display.focus()
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    clearTimeout(promptTimer)
    resolveReady()
    dataDisp?.dispose()
    try {
      emulator.remove_listener('serial0-output-byte', onByte)
    } catch {
      /* ignore */
    }
    void emulator.stop().then(() => emulator.destroy())
  }

  return { ready, goLive, dispose }
}
