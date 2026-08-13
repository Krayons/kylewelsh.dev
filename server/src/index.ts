import http from 'node:http'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { checkContainerRuntime } from './container.js'
import { clientIp, createSessionManager } from './session.js'

const sessions = createSessionManager()

const server = http.createServer(async (req, res) => {
  // CORS for local static hosts / alternate ports
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (url.pathname === '/health') {
    const runtime = await checkContainerRuntime()
    const body = {
      ok: runtime.up,
      container: runtime.up ? 'up' : 'down',
      detail: runtime.detail,
      sessions: sessions.count(),
      maxSessions: config.maxSessions,
      image: config.image,
    }
    res.writeHead(runtime.up ? 200 : 503, {
      'Content-Type': 'application/json',
    })
    res.end(JSON.stringify(body))
    return
  }

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('kylewelsh.dev terminal proxy — GET /health, WS /ws\n')
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('not found\n')
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', (ws, req) => {
  const ip = clientIp(req.headers, req.socket.remoteAddress)
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const cols = Math.max(20, Number(url.searchParams.get('cols') || 80) || 80)
  const rows = Math.max(5, Number(url.searchParams.get('rows') || 24) || 24)

  if (sessions.count() >= config.maxSessions) {
    ws.send('\r\n\x1b[31msession limit reached — try again later\x1b[0m\r\n')
    ws.close(1013, 'max-sessions')
    return
  }
  if (sessions.countForIp(ip) >= config.maxPerIp) {
    ws.send('\r\n\x1b[31mtoo many sessions from this address\x1b[0m\r\n')
    ws.close(1013, 'max-per-ip')
    return
  }

  const session = sessions.tryAccept(ws, ip, cols, rows)
  if (!session) {
    ws.send('\r\n\x1b[31mfailed to start container\x1b[0m\r\n')
    ws.close(1011, 'spawn-failed')
  }
})

server.listen(config.port, () => {
  console.log(
    `[server] listening on :${config.port} image=${config.image} maxSessions=${config.maxSessions}`,
  )
})
