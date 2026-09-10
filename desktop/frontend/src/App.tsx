import './App.css'
import axios from 'axios'
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShieldCheck, Activity } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowStep = 'loading' | 'subdomain' | 'dashboard'

type ClientSession = {
  id: string
  subdomain: string
  port: number | null
  customDomain: string
  requireAuth: boolean
  plan: string
  bandwidthUsed: number
  bandwidthLimit: number
}

type IdentityResponse = {
  id: string
  subdomain?: string | null
  port?: number | null
  customDomain?: string | null
  requireAuth?: boolean
  plan?: string
  bandwidthUsed?: number
  bandwidthLimit?: number
}

type AuthResponse = { requireAuth: boolean; gauthEnabled: boolean }

type AvailabilityResponse = {
  available?: boolean
  exists?: boolean
}

type PortResponse = { port?: number }
type DomainResponse = { customDomain: string }

type TunnelRequest = {
  id: string
  method: string
  path: string
  headers: Record<string, string[]>
  body?: string
}

type RequestLogEntry = {
  id: string
  method: string
  path: string
  status: number | null
  timestamp: string
  durationMs: number | null
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected'

// ─── Env ─────────────────────────────────────────────────────────────────────

const requiredEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`)
  return value.trim()
}

const API_BASE_URL = requiredEnv(import.meta.env.VITE_PORTSHARE_API_BASE, 'VITE_PORTSHARE_API_BASE')
const ROOT_DOMAIN  = requiredEnv(import.meta.env.VITE_PORTSHARE_ROOT_DOMAIN, 'VITE_PORTSHARE_ROOT_DOMAIN')

const CLIENT_ID_KEY = 'portshare-client-id'
const THEME_KEY     = 'portshare-theme'

const QUICK_PORTS = [3000, 4000, 5173, 8080, 8000]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parsePort = (value: unknown): number | null => {
  const p = Number(value)
  return Number.isInteger(p) && p >= 1 && p <= 65535 ? p : null
}

const normalizeSubdomain = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+/, '').replace(/-+$/, '')

const extractError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  if (err instanceof Error && err.message.trim()) return err.message
  return 'Something went wrong while contacting the server.'
}

const toBase64 = (bytes: Uint8Array): string => {
  let s = ''
  bytes.forEach(b => { s += String.fromCharCode(b) })
  return btoa(s)
}

const fromBase64 = (v: string): Uint8Array => {
  const bin = atob(v)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const statusClass = (s: number | null) => {
  if (!s) return ''
  if (s < 300) return 'ok'
  if (s < 500) return 'warn'
  return 'err'
}

// ─── API calls ───────────────────────────────────────────────────────────────

const ensureClientIdentity = async (existingId: string | null): Promise<ClientSession> => {
  const payload = existingId ? { id: existingId } : {}
  const { data } = await axios.post<IdentityResponse>(`${API_BASE_URL}/client/identity`, payload)
  if (!data.id) throw new Error('Server did not return a valid client id.')
  return {
    id: data.id,
    subdomain: data.subdomain?.trim().toLowerCase() ?? '',
    port: parsePort(data.port),
    customDomain: data.customDomain?.trim().toLowerCase() ?? '',
    requireAuth: data.requireAuth ?? false,
    plan: data.plan ?? 'free',
    bandwidthUsed: data.bandwidthUsed ?? 0,
    bandwidthLimit: data.bandwidthLimit ?? 1073741824,
  }
}

const checkSubdomainAvailability = async (name: string): Promise<boolean> => {
  const { data } = await axios.get<AvailabilityResponse>(`${API_BASE_URL}/subdomain/check`, { params: { name } })
  if (typeof data.available === 'boolean') return data.available
  if (typeof data.exists   === 'boolean') return !data.exists
  throw new Error('Unexpected response while checking subdomain availability.')
}

const claimSubdomain = async (clientId: string, subdomain: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/subdomain/claim`, { clientId, subdomain })
}

const updateExposedPort = async (clientId: string, port: number): Promise<number> => {
  const { data } = await axios.put<PortResponse>(`${API_BASE_URL}/client/port`, { clientId, port })
  return parsePort(data.port) ?? port
}

const updateCustomDomain = async (clientId: string, domain: string): Promise<string> => {
  const { data } = await axios.put<DomainResponse>(`${API_BASE_URL}/client/domain`, { clientId, domain })
  return data.customDomain
}

const updateClientAuth = async (clientId: string, requireAuth: boolean): Promise<AuthResponse> => {
  const { data } = await axios.put<AuthResponse>(`${API_BASE_URL}/client/auth`, { clientId, requireAuth })
  return data
}

// ─── Component ───────────────────────────────────────────────────────────────

function App() {
  const [step,           setStep]           = useState<FlowStep>('loading')
  const [session,        setSession]        = useState<ClientSession | null>(null)
  const [subdomainInput, setSubdomainInput] = useState('')
  const [portInput,      setPortInput]      = useState('')
  const [domainInput,    setDomainInput]    = useState('')
  const [statusMessage,  setStatusMessage]  = useState('Starting secure tunnel client...')
  const [infoMessage,    setInfoMessage]    = useState('')
  const [errorMessage,   setErrorMessage]   = useState('')
  const [isBusy,         setIsBusy]         = useState(false)
  const [copyFeedback,   setCopyFeedback]   = useState<'idle' | 'copied' | 'failed'>('idle')
  const [theme,          setTheme]          = useState<'light' | 'dark'>('dark')
  const [connState,      setConnState]      = useState<ConnectionState>('idle')
  const [requestLog,     setRequestLog]     = useState<RequestLogEntry[]>([])
  const [totalRequests,  setTotalRequests]  = useState(0)
  const [gauthEnabled,   setGauthEnabled]   = useState(false)

  const tunnelSocket    = useRef<WebSocket | null>(null)
  const tunnelPort      = useRef<number | null>(null)
  const reconnectTimer  = useRef<number | null>(null)
  const shouldReconnect = useRef(true)
  const logBodyRef      = useRef<HTMLDivElement | null>(null)

  const publicUrl = useMemo(() => {
    if (!session?.subdomain) return ''
    return `https://${session.subdomain}.${ROOT_DOMAIN}`
  }, [session])

  // Auto-scroll log to bottom on new entries
  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight
    }
  }, [requestLog])

  const addLogEntry = useCallback((entry: RequestLogEntry) => {
    setRequestLog(prev => {
      const next = [...prev, entry]
      return next.length > 100 ? next.slice(-100) : next
    })
    setTotalRequests(n => n + 1)
  }, [])

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  const bootstrapClient = useCallback(async (): Promise<void> => {
    setStep('loading')
    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('')
    setConnState('connecting')

    try {
      const storedId = window.localStorage.getItem(CLIENT_ID_KEY)
      setStatusMessage(storedId ? 'Validating saved client identity...' : 'Generating a new client identity...')

      const nextSession = await ensureClientIdentity(storedId)
      window.localStorage.setItem(CLIENT_ID_KEY, nextSession.id)
      setSession(nextSession)
      setPortInput(nextSession.port ? String(nextSession.port) : '')
      setSubdomainInput(nextSession.subdomain)
      setDomainInput(nextSession.customDomain)
      tunnelPort.current = nextSession.port

      // ── WebSocket tunnel ───────────────────────────────────────────────────
      const protocol  = API_BASE_URL.startsWith('https') ? 'wss' : 'ws'
      const tunnelUrl = `${protocol}://${new URL(API_BASE_URL).host}/tunnel/connect?clientId=${encodeURIComponent(nextSession.id)}`
      let reconnectDelay = 1000

      const connectTunnel = (): void => {
        if (!shouldReconnect.current) return
        const socket = new WebSocket(tunnelUrl)
        tunnelSocket.current = socket
        setConnState('connecting')

        socket.onopen = () => {
          reconnectDelay = 1000
          setConnState('connected')
          setStatusMessage('Persistent tunnel connected.')
        }

        socket.onmessage = async (event) => {
          const request = JSON.parse(event.data) as TunnelRequest
          const port    = tunnelPort.current
          const startMs = Date.now()

          if (!port) {
            socket.send(JSON.stringify({ id: request.id, status: 503, headers: {}, error: 'No local port configured' }))
            addLogEntry({ id: request.id, method: request.method, path: request.path, status: 503, timestamp: new Date().toISOString(), durationMs: 0 })
            return
          }

          try {
            const localHeaders: Record<string, string> = {}
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
            addLogEntry({ id: request.id, method: request.method, path: request.path, status: response.status, timestamp: new Date().toISOString(), durationMs: Date.now() - startMs })
          } catch (error) {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ id: request.id, status: 502, headers: {}, error: error instanceof Error ? error.message : 'Local service unavailable' }))
            }
            addLogEntry({ id: request.id, method: request.method, path: request.path, status: 502, timestamp: new Date().toISOString(), durationMs: Date.now() - startMs })
          }
        }

        socket.onclose = () => {
          if (tunnelSocket.current !== socket || !shouldReconnect.current) return
          tunnelSocket.current = null
          setConnState('disconnected')
          reconnectTimer.current = window.setTimeout(connectTunnel, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, 30000)
        }
      }

      shouldReconnect.current = true
      tunnelSocket.current?.close()
      connectTunnel()

      if (nextSession.subdomain.length > 0) {
        setStep('dashboard')
        setInfoMessage('Identity loaded. You can expose any local port now.')
        // Fetch GAuth feature-flag status from the server.
        try {
          const { data: authStatus } = await axios.get<{ enabled: boolean }>(`${API_BASE_URL}/auth/google/status`)
          setGauthEnabled(authStatus.enabled)
        } catch { /* non-fatal — GAuth UI just stays hidden */ }
      } else {
        setStep('subdomain')
        setInfoMessage('Identity created. Reserve your subdomain to continue.')
      }
    } catch (error) {
      setConnState('disconnected')
      setErrorMessage(extractError(error))
      setStatusMessage('Could not connect to your PortShare API server.')
    } finally {
      setIsBusy(false)
    }
  }, [addLogEntry])

  useEffect(() => {
    const saved    = window.localStorage.getItem(THEME_KEY)
    const next     = saved === 'dark' ? 'dark' : 'dark'  // default dark
    setTheme(next)
    document.documentElement.dataset.theme = next
    void bootstrapClient()
    return () => {
      shouldReconnect.current = false
      if (reconnectTimer.current !== null) window.clearTimeout(reconnectTimer.current)
      tunnelSocket.current?.close()
      tunnelSocket.current = null
    }
  }, [bootstrapClient])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.localStorage.setItem(THEME_KEY, next)
    document.documentElement.dataset.theme = next
  }

  const handleSubdomainSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!session) return
    const name = normalizeSubdomain(subdomainInput)
    if (name.length < 3 || name.length > 32) {
      setErrorMessage('Subdomain must be 3–32 characters using letters, numbers, or hyphens.')
      return
    }
    setIsBusy(true); setErrorMessage(''); setInfoMessage('Checking subdomain availability...')
    try {
      if (!await checkSubdomainAvailability(name)) {
        setErrorMessage('That subdomain is already taken. Try another one.')
        return
      }
      await claimSubdomain(session.id, name)
      setSession(cur => cur ? { ...cur, subdomain: name } : cur)
      setStep('dashboard')
      setInfoMessage('Subdomain reserved successfully.')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handlePortSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!session) return
    const p = Number(portInput)
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      setErrorMessage('Enter a valid TCP port between 1 and 65535.')
      return
    }
    setIsBusy(true); setErrorMessage(''); setInfoMessage('Updating exposed port...')
    try {
      const next = await updateExposedPort(session.id, p)
      tunnelPort.current = next
      setSession(cur => cur ? { ...cur, port: next } : cur)
      setPortInput(String(next))
      setInfoMessage(`Port ${next} is now routed to your public URL.`)
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleDomainSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!session || !domainInput.trim()) return
    setIsBusy(true); setErrorMessage(''); setInfoMessage('Mapping your domain...')
    try {
      const customDomain = await updateCustomDomain(session.id, domainInput.trim())
      setSession(cur => cur ? { ...cur, customDomain } : cur)
      setDomainInput(customDomain)
      setInfoMessage('Domain mapped. Add a CNAME record pointing to your PortShare endpoint.')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleAuthToggle = async (): Promise<void> => {
    if (!session) return
    const next = !session.requireAuth
    setIsBusy(true); setErrorMessage(''); setInfoMessage('')
    try {
      const result = await updateClientAuth(session.id, next)
      setSession(cur => cur ? { ...cur, requireAuth: result.requireAuth } : cur)
      setGauthEnabled(result.gauthEnabled)
      setInfoMessage(result.requireAuth
        ? '🔒 Google Auth wall enabled — visitors must sign in with Google.'
        : '🔓 Google Auth wall disabled — tunnel is publicly accessible.')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleCopyUrl = async (): Promise<void> => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyFeedback('copied')
    } catch {
      setCopyFeedback('failed')
    }
    window.setTimeout(() => setCopyFeedback('idle'), 1800)
  }

  // ── Connection state label ────────────────────────────────────────────────

  const connLabel = connState === 'connected'
    ? 'Tunnel live'
    : connState === 'connecting'
      ? 'Connecting...'
      : connState === 'disconnected'
        ? 'Reconnecting...'
        : 'Idle'

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="portshare-root">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />

      <section className="console-shell">

        {/* ── TOPBAR ── */}
        <header className="console-topbar">
          <div className="brand-area">
            <span className="brand-mark" aria-hidden="true">PS</span>
            <div>
              <p className="brand-title">PortShare Tunnel</p>
              <p className="brand-subtitle">Expose localhost through managed subdomains</p>
            </div>
          </div>

          {step === 'dashboard' && publicUrl ? (
            <div className="url-chip-wrap">
              <div className="url-chip" aria-live="polite">
                <span className="url-chip-label">Public URL</span>
                <strong>{publicUrl}</strong>
              </div>
              <button id="copy-url-btn" type="button" className="copy-btn" onClick={handleCopyUrl}>
                {copyFeedback === 'copied'  && '✓ Copied'}
                {copyFeedback === 'failed'  && '✗ Failed'}
                {copyFeedback === 'idle'    && 'Copy URL'}
              </button>
            </div>
          ) : (
            <div className="connection-status">
              <span className={`status-dot loading`} />
              <span className="connection-label">{statusMessage}</span>
            </div>
          )}

          <div className="topbar-right">
            {step === 'dashboard' && (
              <>
                <div className="connection-status">
                  <span className={`status-dot ${connState === 'connected' ? 'connected' : connState === 'connecting' ? 'loading' : 'disconnected'}`} />
                  <span className="connection-label">{connLabel}</span>
                </div>
                <div className="request-counter">
                  <span>{totalRequests}</span> req{totalRequests !== 1 ? 's' : ''}
                </div>
              </>
            )}
            <button type="button" className="theme-toggle" onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? '☀ Light' : '◐ Dark'}
            </button>
          </div>
        </header>

        <main className="console-content">

          {/* ── LOADING ── */}
          {step === 'loading' && (
            <section className="panel panel-loading">
              <p className="panel-kicker">Boot sequence</p>
              <h1>Preparing your tunnel</h1>
              <p className="panel-text">{statusMessage}</p>
              <div className="loader" aria-hidden="true">
                <span /><span /><span />
              </div>
              {errorMessage && (
                <button type="button" className="primary-btn" onClick={() => void bootstrapClient()}>
                  Retry connection
                </button>
              )}
            </section>
          )}

          {/* ── SUBDOMAIN ── */}
          {step === 'subdomain' && session && (
            <section className="panel">
              <p className="panel-kicker">Step 1 of 2</p>
              <h1>Reserve your subdomain</h1>
              <p className="panel-text">Choose your permanent public URL prefix before exposing any local port.</p>
              <p className="client-id">Client ID: {session.id}</p>

              <form id="subdomain-form" className="input-form" onSubmit={handleSubdomainSubmit}>
                <label htmlFor="subdomain">Subdomain name</label>
                <div className="field-with-suffix">
                  <input
                    id="subdomain"
                    value={subdomainInput}
                    onChange={e => setSubdomainInput(e.target.value)}
                    placeholder="myapp"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isBusy}
                  />
                  <span>.{ROOT_DOMAIN}</span>
                </div>
                <button id="claim-subdomain-btn" type="submit" className="primary-btn" disabled={isBusy}>
                  {isBusy ? 'Checking...' : 'Claim subdomain →'}
                </button>
              </form>

              <hr className="form-section-divider" />

              {/* GAuth security toggle */}
              <div className="gauth-section">
                <div className="gauth-info">
                  <div className="gauth-icon" aria-hidden="true"><ShieldCheck size={24} /></div>
                  <div>
                    <p className="gauth-title">Google Auth Wall</p>
                    <p className="gauth-desc">
                      {gauthEnabled
                        ? 'Require visitors to sign in with their Google account before accessing your tunnel.'
                        : 'Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID to enable.'}
                    </p>
                  </div>
                </div>
                <button
                  id="gauth-toggle-btn"
                  type="button"
                  role="switch"
                  aria-checked={session?.requireAuth ?? false}
                  className={`toggle-switch ${session?.requireAuth ? 'toggle-on' : ''}`}
                  onClick={handleAuthToggle}
                  disabled={isBusy || !gauthEnabled}
                  title={!gauthEnabled ? 'Configure GOOGLE_CLIENT_ID on the server to enable' : ''}
                />
              </div>
            </section>
          )}

          {/* ── DASHBOARD ── */}
          {step === 'dashboard' && session && (
            <section className="panel">
              <p className="panel-kicker">Port Dashboard</p>
              <h1>Expose a local port</h1>
              <p className="panel-text">Set the local port that should be forwarded to your public URL.</p>

              <div className="status-grid">
                <article>
                  <p className="status-label">Tunnel status</p>
                  <p className={`status-value ${connState === 'connected' ? 'online' : 'offline'}`}>
                    {connState === 'connected' ? '● Live' : '○ Offline'}
                  </p>
                </article>
                <article>
                  <p className="status-label">Subdomain</p>
                  <p className="status-value">{session.subdomain}.{ROOT_DOMAIN}</p>
                </article>
                <article>
                  <p className="status-label">Active port</p>
                  <p className="status-value">{session.port ?? '—'}</p>
                </article>
                <article>
                  <p className="status-label">Custom domain</p>
                  <p className="status-value">{session.customDomain || '—'}</p>
                </article>
              </div>

              {/* Bandwidth Usage */}
              <div className="bandwidth-section">
                <div className="bandwidth-header">
                  <span className="bandwidth-label"><Activity size={16} /> Bandwidth Used ({session.plan.toUpperCase()})</span>
                  <span className="bandwidth-values">
                    {(session.bandwidthUsed / 1024 / 1024).toFixed(1)} MB / {(session.bandwidthLimit / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="bandwidth-track">
                  <div 
                    className="bandwidth-fill" 
                    style={{ width: `${Math.min(100, (session.bandwidthUsed / session.bandwidthLimit) * 100)}%` }} 
                  />
                </div>
                {session.plan === 'free' && (
                  <div className="bandwidth-upgrade">
                    <a href="http://localhost:3000/pricing" target="_blank" rel="noreferrer">Upgrade to Pro</a> for 100GB limits.
                  </div>
                )}
              </div>

              {/* Port form */}
              <form id="port-form" className="input-form" onSubmit={handlePortSubmit}>
                <label htmlFor="port">Local port to expose</label>

                <div className="port-quickpick">
                  <span className="port-quickpick-label">Quick:</span>
                  {QUICK_PORTS.map(p => (
                    <button
                      key={p}
                      type="button"
                      className="port-pill"
                      onClick={() => setPortInput(String(p))}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <input
                  id="port"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  placeholder="3000"
                  value={portInput}
                  onChange={e => setPortInput(e.target.value)}
                  disabled={isBusy}
                />
                <button id="expose-port-btn" type="submit" className="primary-btn jumbo" disabled={isBusy}>
                  {isBusy ? 'Updating...' : '⚡ Expose this port'}
                </button>
              </form>

              <hr className="form-section-divider" />

              {/* Domain form */}
              <form id="domain-form" className="input-form domain-form" onSubmit={handleDomainSubmit}>
                <label htmlFor="custom-domain">Use your own domain</label>
                <input
                  id="custom-domain"
                  type="text"
                  inputMode="url"
                  placeholder="dev.yourcompany.com"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  disabled={isBusy}
                />
                <p className="field-help">
                  After mapping, create a CNAME for this hostname pointing to your PortShare endpoint.
                </p>
                <button id="map-domain-btn" type="submit" className="secondary-btn" disabled={isBusy || !domainInput.trim()}>
                  {isBusy ? 'Mapping...' : 'Map owned domain'}
                </button>
              </form>

              <hr className="form-section-divider" />

              {/* GAuth security toggle */}
              <div className="gauth-section">
                <div className="gauth-info">
                  <div className="gauth-icon" aria-hidden="true"><ShieldCheck size={24} /></div>
                  <div>
                    <p className="gauth-title">Google Auth Wall</p>
                    <p className="gauth-desc">
                      {gauthEnabled
                        ? 'Require visitors to sign in with their Google account before accessing your tunnel.'
                        : 'Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID to enable.'}
                    </p>
                  </div>
                </div>
                <button
                  id="gauth-toggle-btn-dashboard"
                  type="button"
                  role="switch"
                  aria-checked={session?.requireAuth ?? false}
                  className={`toggle-switch ${session?.requireAuth ? 'toggle-on' : ''}`}
                  onClick={handleAuthToggle}
                  disabled={isBusy || !gauthEnabled}
                  title={!gauthEnabled ? 'Configure GOOGLE_CLIENT_ID on the server to enable' : ''}
                ></button>
              </div>
            </section>
          )}

          {/* ── REQUEST LOG ── */}
          {step === 'dashboard' && (
            <div className="request-log-panel">
              <div className="request-log-header">
                <p className="request-log-title">
                  Request Log
                  <span className="log-live-badge">
                    <span className="log-live-dot" />
                    LIVE
                  </span>
                </p>
                <button
                  type="button"
                  className="clear-log-btn"
                  onClick={() => { setRequestLog([]); setTotalRequests(0); }}
                >
                  Clear
                </button>
              </div>
              <div className="request-log-body" ref={logBodyRef}>
                {requestLog.length === 0 ? (
                  <p className="log-empty">Waiting for requests… your tunnel is ready.</p>
                ) : (
                  requestLog.slice().reverse().map(entry => (
                    <div key={entry.id} className="log-entry">
                      <span className={`log-method ${entry.method}`}>{entry.method}</span>
                      <span className={`log-status ${statusClass(entry.status)}`}>
                        {entry.status ?? '—'}
                      </span>
                      <span className="log-path" title={entry.path}>{entry.path}</span>
                      <span className="log-duration">
                        {entry.durationMs !== null ? `${entry.durationMs}ms` : ''}
                      </span>
                      <span className="log-time">{formatTime(entry.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── FEEDBACK ── */}
          <section className="feedback-row" aria-live="polite">
            {infoMessage  && <p className="feedback feedback-info">{infoMessage}</p>}
            {errorMessage && <p className="feedback feedback-error">{errorMessage}</p>}
          </section>

        </main>
      </section>
    </div>
  )
}

export default App
