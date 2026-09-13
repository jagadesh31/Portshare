import { type RequestLogEntry, type ConnectionState } from './api'
import { toBase64, fromBase64 } from './utils'
import { encodeFrame, decodeFrame, type WireRequest } from './wire'

type CreateTunnelArgs = {
  apiBaseUrl: string
  clientId: string
  portRef: React.MutableRefObject<number | null>
  onStateChange: (state: ConnectionState, message?: string) => void
  onLogEntry: (entry: RequestLogEntry) => void
}

const SKIP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'te',
  'trailer',
  'upgrade',
  'accept-encoding',
  'origin',
  'referer',
])

/** Dev-server chatter that inflates request counts without real payload. */
export function isNoiseRequestPath(path: string): boolean {
  const pathname = path.split('?')[0]?.toLowerCase() ?? ''
  return (
    pathname.includes('/_next/webpack-hmr') ||
    pathname.endsWith('/__webpack_hmr') ||
    pathname.includes('/.well-known/') ||
    pathname === '/favicon.ico'
  )
}

function flattenHeaders(headers: Record<string, string[]> | undefined): Record<string, string> {
  const localHeaders: Record<string, string> = {}
  Object.entries(headers ?? {}).forEach(([key, value]) => {
    if (SKIP_HEADERS.has(key.toLowerCase())) return
    localHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value)
  })
  return localHeaders
}

/** Normalizes both wire formats (v2 binary frame / legacy JSON+base64). */
function parseIncoming(data: ArrayBuffer | string): { binary: boolean; request: WireRequest } {
  if (typeof data === 'string') {
    const raw = JSON.parse(data) as {
      id: string; method: string; path: string
      headers?: Record<string, string[]>; body?: string
    }
    return {
      binary: false,
      request: {
        id: raw.id, method: raw.method, path: raw.path,
        headers: raw.headers ?? {},
        body: raw.body ? fromBase64(raw.body) : new Uint8Array(0),
      },
    }
  }
  const { meta, body } = decodeFrame(data)
  return {
    binary: true,
    request: {
      id: meta.id ?? '', method: meta.method ?? 'GET', path: meta.path ?? '/',
      headers: meta.headers ?? {}, body,
    },
  }
}

type ProxyResult = { status: number; headers: Record<string, string[]>; body: Uint8Array }

async function proxyToLocal(port: number, request: WireRequest, localHeaders: Record<string, string>): Promise<ProxyResult> {
  if (window.portshare?.localRequest) {
    const result = await window.portshare.localRequest({
      port,
      method: request.method,
      path: request.path,
      headers: localHeaders,
      body: request.body.byteLength ? request.body : undefined,
    })
    const body = result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body)
    return { status: result.status, headers: result.headers, body }
  }

  const response = await fetch(`http://127.0.0.1:${port}${request.path}`, {
    method: request.method,
    headers: localHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' || !request.body.byteLength
      ? undefined
      : new Blob([request.body.slice()]),
  })
  const responseBody = new Uint8Array(await response.arrayBuffer())
  const headers: Record<string, string[]> = {}
  response.headers.forEach((value, name) => { headers[name] = [value] })
  return { status: response.status, headers, body: responseBody }
}

export function createTunnelConnection({ apiBaseUrl, clientId, portRef, onStateChange, onLogEntry }: CreateTunnelArgs) {
  let shouldReconnect = true
  let tunnelSocket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let reconnectDelay = 1000
  let binaryMode = false
  let modeKnown = false

  const protocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
  // proto=2 asks for raw binary framing; older servers ignore it and reply
  // with legacy JSON, which parseIncoming auto-detects.
  const tunnelUrl = `${protocol}://${new URL(apiBaseUrl).host}/tunnel/connect?clientId=${encodeURIComponent(clientId)}&proto=2`

  const sendPayload = (
    socket: WebSocket,
    payload: { id: string; status: number; headers: Record<string, string[]>; body?: Uint8Array; error?: string },
  ): void => {
    if (socket.readyState !== WebSocket.OPEN) return
    if (binaryMode) {
      socket.send(encodeFrame(
        { id: payload.id, status: payload.status, headers: payload.headers, error: payload.error },
        payload.body && payload.body.byteLength ? payload.body : undefined,
      ))
    } else {
      socket.send(JSON.stringify({
        id: payload.id,
        status: payload.status,
        headers: payload.headers,
        error: payload.error,
        body: payload.body && payload.body.byteLength ? toBase64(payload.body) : undefined,
      }))
    }
  }

  const connectTunnel = (): void => {
    if (!shouldReconnect) return
    const socket = new WebSocket(tunnelUrl)
    socket.binaryType = 'arraybuffer'
    tunnelSocket = socket
    onStateChange('connecting')

    socket.onopen = () => {
      reconnectDelay = 1000
      onStateChange('connected', 'Persistent tunnel connected.')
    }

    socket.onmessage = async (event) => {
      let parsed: { binary: boolean; request: WireRequest }
      try {
        parsed = parseIncoming(event.data as ArrayBuffer | string)
      } catch {
        return
      }
      if (!modeKnown) {
        binaryMode = parsed.binary
        modeKnown = true
      }
      const request = parsed.request
      const port = portRef.current
      const startMs = Date.now()
      const localHeaders = flattenHeaders(request.headers)

      if (!port) {
        sendPayload(socket, { id: request.id, status: 503, headers: {}, error: 'No local port configured' })
        if (!isNoiseRequestPath(request.path)) {
          onLogEntry({
            id: request.id, method: request.method, path: request.path, status: 503,
            timestamp: new Date().toISOString(), durationMs: 0
          })
        }
        return
      }

      try {
        const result = await proxyToLocal(port, request, localHeaders)
        sendPayload(socket, { id: request.id, status: result.status, headers: result.headers, body: result.body })

        if (isNoiseRequestPath(request.path)) return

        let decodedBody = ''
        if (request.body.byteLength) {
          try {
            decodedBody = new TextDecoder().decode(request.body)
          } catch {
            decodedBody = '(binary or invalid text data)'
          }
        }

        onLogEntry({
          id: request.id, method: request.method, path: request.path, status: result.status,
          timestamp: new Date().toISOString(), durationMs: Date.now() - startMs,
          headers: localHeaders, body: decodedBody
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Local service unavailable'
        sendPayload(socket, { id: request.id, status: 502, headers: {}, error: message })
        if (isNoiseRequestPath(request.path)) return
        onLogEntry({
          id: request.id, method: request.method, path: request.path, status: 502,
          timestamp: new Date().toISOString(), durationMs: Date.now() - startMs,
          headers: localHeaders
        })
      }
    }

    socket.onclose = () => {
      if (tunnelSocket !== socket || !shouldReconnect) return
      tunnelSocket = null
      modeKnown = false
      onStateChange('disconnected')
      if (shouldReconnect) {
        reconnectTimer = window.setTimeout(connectTunnel, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      }
    }
  }

  connectTunnel()

  return {
    close: () => {
      shouldReconnect = false
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      tunnelSocket?.close()
      tunnelSocket = null
    }
  }
}
