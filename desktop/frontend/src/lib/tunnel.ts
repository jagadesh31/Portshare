import { type TunnelRequest, type RequestLogEntry, type ConnectionState } from './api'
import { toBase64, fromBase64 } from './utils'

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

function flattenHeaders(headers: Record<string, string[]> | undefined): Record<string, string> {
  const localHeaders: Record<string, string> = {}
  Object.entries(headers ?? {}).forEach(([key, value]) => {
    if (SKIP_HEADERS.has(key.toLowerCase())) return
    localHeaders[key] = value.join(', ')
  })
  return localHeaders
}

async function proxyToLocal(port: number, request: TunnelRequest, localHeaders: Record<string, string>) {
  const bodyBase64 = request.body || undefined

  if (window.portshare?.localRequest) {
    return window.portshare.localRequest({
      port,
      method: request.method,
      path: request.path,
      headers: localHeaders,
      bodyBase64,
    })
  }

  const requestBytes = fromBase64(request.body ?? '')
  const response = await fetch(`http://127.0.0.1:${port}${request.path}`, {
    method: request.method,
    headers: localHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : new Blob([requestBytes.buffer as ArrayBuffer]),
  })
  const responseBody = new Uint8Array(await response.arrayBuffer())
  const headers: Record<string, string[]> = {}
  response.headers.forEach((value, name) => { headers[name] = [value] })
  return {
    status: response.status,
    headers,
    body: toBase64(responseBody),
  }
}

export function createTunnelConnection({ apiBaseUrl, clientId, portRef, onStateChange, onLogEntry }: CreateTunnelArgs) {
  let shouldReconnect = true
  let tunnelSocket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let reconnectDelay = 1000

  const protocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
  const tunnelUrl = `${protocol}://${new URL(apiBaseUrl).host}/tunnel/connect?clientId=${encodeURIComponent(clientId)}`

  const connectTunnel = (): void => {
    if (!shouldReconnect) return
    const socket = new WebSocket(tunnelUrl)
    tunnelSocket = socket
    onStateChange('connecting')

    socket.onopen = () => {
      reconnectDelay = 1000
      onStateChange('connected', 'Persistent tunnel connected.')
    }

    socket.onmessage = async (event) => {
      const request = JSON.parse(event.data) as TunnelRequest
      const port = portRef.current
      const startMs = Date.now()
      const localHeaders = flattenHeaders(request.headers)

      if (!port) {
        socket.send(JSON.stringify({ id: request.id, status: 503, headers: {}, error: 'No local port configured' }))
        onLogEntry({
          id: request.id, method: request.method, path: request.path, status: 503,
          timestamp: new Date().toISOString(), durationMs: 0
        })
        return
      }

      try {
        const result = await proxyToLocal(port, request, localHeaders)
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            id: request.id,
            status: result.status,
            headers: result.headers,
            body: result.body,
          }))
        }

        let decodedBody = ''
        if (request.body) {
          try {
            decodedBody = new TextDecoder().decode(fromBase64(request.body))
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
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ id: request.id, status: 502, headers: {}, error: message }))
        }
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
