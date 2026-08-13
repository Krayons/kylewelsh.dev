function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function strEnv(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw === undefined || raw === '' ? fallback : raw
}

export const config = {
  port: intEnv('PORT', 8787),
  image: strEnv('IMAGE', 'busybox:latest'),
  containerBin: strEnv('CONTAINER_BIN', 'container'),
  maxSessions: intEnv('MAX_SESSIONS', 4),
  maxPerIp: intEnv('MAX_PER_IP', 2),
  idleMs: intEnv('IDLE_MS', 600_000),
  maxLifeMs: intEnv('MAX_LIFE_MS', 1_800_000),
  cpus: strEnv('CPUS', '1'),
  memory: strEnv('MEMORY', '256m'),
  /** Empty = default network. Set to "none" for no external networking. */
  network: strEnv('NETWORK', ''),
}
