import { type TunnelRequest, type RequestLogEntry, type ConnectionState } from './api'
import { toBase64, fromBase64 } from './utils'

type CreateTunnelArgs = {
  apiBaseUrl: string
  clientId: string
  portRef: React.MutableRefObject<number | null>
  onStateChange: (state: ConnectionState, message?: string) => void
  onLogEntry: (entry: RequestLogEntry) => void
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

      if (!port) {
        socket.send(JSON.stringify({ id: request.id, status: 503, headers: {}, error: 'No local port configured' }))
        onLogEntry({ 
          id: request.id, method: request.method, path: request.path, status: 503, 
          timestamp: new Date().toISOString(), durationMs: 0 
        })
        return
      }

      const localHeaders: Record<string, string> = {}
      try {
        Object.entries(request.headers).forEach(([k, v]) => { localHeaders[k] = v.join(', ') })
        const requestBytes = fromBase64(request.body ?? '')
        const response = await fetch(`http://127.0.0.1:${port}${request.path}`, {
          method: request.method,
          headers: localHeaders,
          body: request.method === 'GET' || request.method === 'HEAD' ? undefined : new Blob([requestBytes.buffer as ArrayBuffer]),
        })
        const responseBody = new Uint8Array(await response.arrayBuffer())
        const headers: Record<string, string[]> = {}
        response.headers.forEach((value, name) => { headers[name] = [value] })
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ id: request.id, status: response.status, headers, body: toBase64(responseBody) }))
        }
        
        let decodedBody = ''
        if (request.body) {
          try {
            decodedBody = new TextDecoder().decode(fromBase64(request.body))
          } catch (e) {
            decodedBody = '(binary or invalid text data)'
          }
        }
        
        onLogEntry({ 
          id: request.id, method: request.method, path: request.path, status: response.status, 
          timestamp: new Date().toISOString(), durationMs: Date.now() - startMs,
          headers: localHeaders, body: decodedBody
        })
      } catch (error) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ id: request.id, status: 502, headers: {}, error: error instanceof Error ? error.message : 'Local service unavailable' }))
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
