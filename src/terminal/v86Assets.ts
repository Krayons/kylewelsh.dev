export type AssetId = 'bios' | 'vga' | 'wasm' | 'linux'

export type AssetStatus = 'pending' | 'loading' | 'cached' | 'done' | 'error'

export type AssetProgress = {
  id: AssetId
  label: string
  loaded: number
  total: number
  status: AssetStatus
}

export type LoadProgress = {
  files: AssetProgress[]
  loaded: number
  total: number
}

export type V86Buffers = {
  bios: ArrayBuffer
  vga: ArrayBuffer
  wasm: ArrayBuffer
  linux: ArrayBuffer
}

const FILES: { id: AssetId; label: string; file: string }[] = [
  { id: 'bios', label: 'bios.rom', file: 'seabios.bin' },
  { id: 'vga', label: 'vga.rom', file: 'vgabios.bin' },
  { id: 'wasm', label: 'cpu.wasm', file: 'v86.wasm' },
  { id: 'linux', label: 'linux.img', file: 'buildroot-bzimage.bin' },
]

let memory: V86Buffers | null = null

function assetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}v86/${file}`
}

function snapshot(files: AssetProgress[]): LoadProgress {
  return {
    files: files.map((f) => ({ ...f })),
    loaded: files.reduce((n, f) => n + f.loaded, 0),
    total: files.reduce((n, f) => n + f.total, 0),
  }
}

export function cachedV86Assets(): V86Buffers | null {
  return memory
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

async function fetchBuffer(
  url: string,
  file: AssetProgress,
  files: AssetProgress[],
  onProgress: (p: LoadProgress) => void,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  file.status = 'loading'
  onProgress(snapshot(files))

  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`${file.label} ${res.status}`)
  }

  const total = Number(res.headers.get('content-length')) || 0
  if (total) file.total = total
  onProgress(snapshot(files))

  if (!res.body) {
    const buf = await res.arrayBuffer()
    file.loaded = buf.byteLength
    file.total = buf.byteLength
    file.status = 'done'
    onProgress(snapshot(files))
    return buf
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    file.loaded = loaded
    if (loaded > file.total) file.total = loaded
    onProgress(snapshot(files))
  }

  const out = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  file.loaded = loaded
  file.total = loaded
  file.status = 'done'
  onProgress(snapshot(files))
  return out.buffer
}

/** Fetch (or restore) the v86 wasm, BIOS, and Linux bzImage. */
export async function loadV86Assets(opts: {
  onProgress: (p: LoadProgress) => void
  signal?: AbortSignal
}): Promise<V86Buffers> {
  const files: AssetProgress[] = FILES.map((f) => ({
    id: f.id,
    label: f.label,
    loaded: 0,
    total: 0,
    status: 'pending',
  }))
  opts.onProgress(snapshot(files))

  if (memory) {
    for (const f of files) {
      const buf =
        f.id === 'bios'
          ? memory.bios
          : f.id === 'vga'
            ? memory.vga
            : f.id === 'wasm'
              ? memory.wasm
              : memory.linux
      f.loaded = buf.byteLength
      f.total = buf.byteLength
      f.status = 'cached'
    }
    opts.onProgress(snapshot(files))
    return memory
  }

  const byId = Object.fromEntries(files.map((f) => [f.id, f])) as Record<
    AssetId,
    AssetProgress
  >

  const load = (id: AssetId, file: string) =>
    fetchBuffer(assetUrl(file), byId[id], files, opts.onProgress, opts.signal)

  try {
    const [bios, vga, wasm, linux] = await Promise.all(
      FILES.map((f) => load(f.id, f.file)),
    )
    memory = { bios, vga, wasm, linux }
    return memory
  } catch (e) {
    if (opts.signal?.aborted) throw e
    const msg = e instanceof Error ? e.message : 'fetch failed'
    for (const f of files) {
      if (f.status === 'loading' || f.status === 'pending') f.status = 'error'
    }
    opts.onProgress(snapshot(files))
    throw new Error(msg)
  }
}

export async function loadFallbackWasm(signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(assetUrl('v86-fallback.wasm'), { signal })
  if (!res.ok) throw new Error(`cpu.wasm fallback ${res.status}`)
  return res.arrayBuffer()
}
