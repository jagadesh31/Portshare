import './App.css'
import axios from 'axios'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

type FlowStep = 'loading' | 'subdomain' | 'dashboard'

type ClientSession = {
  id: string
  subdomain: string
  port: number | null
  customDomain: string
}

type IdentityResponse = {
  id: string
  subdomain?: string | null
  port?: number | null
  customDomain?: string | null
}

type AvailabilityResponse = {
  available?: boolean
  exists?: boolean
}

type PortResponse = {
  port?: number
}

type DomainResponse = { customDomain: string }

type TunnelRequest = { id: string; method: string; path: string; headers: Record<string, string[]>; body?: string }

const requiredEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

const API_BASE_URL = requiredEnv(import.meta.env.VITE_PORTSHARE_API_BASE, 'VITE_PORTSHARE_API_BASE')
const ROOT_DOMAIN = requiredEnv(import.meta.env.VITE_PORTSHARE_ROOT_DOMAIN, 'VITE_PORTSHARE_ROOT_DOMAIN')
const CLIENT_ID_STORAGE_KEY = 'portshare-client-id'
const THEME_STORAGE_KEY = 'portshare-theme'

const parsePort = (value: unknown): number | null => {
  const parsed = Number(value)
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    return parsed
  }
  return null
}

const normalizeSubdomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message
    if (typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
      return serverMessage
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Something went wrong while contacting the server.'
}

const ensureClientIdentity = async (existingId: string | null): Promise<ClientSession> => {
  const payload = existingId ? { id: existingId } : {}
  const { data } = await axios.post<IdentityResponse>(`${API_BASE_URL}/client/identity`, payload)

  if (!data.id) {
    throw new Error('Server did not return a valid client id.')
  }

  return {
    id: data.id,
    subdomain: data.subdomain?.trim().toLowerCase() ?? '',
    port: parsePort(data.port),
    customDomain: data.customDomain?.trim().toLowerCase() ?? '',
  }
}

const checkSubdomainAvailability = async (subdomain: string): Promise<boolean> => {
  const { data } = await axios.get<AvailabilityResponse>(`${API_BASE_URL}/subdomain/check`, {
    params: { name: subdomain },
  })

  if (typeof data.available === 'boolean') {
    return data.available
  }

  if (typeof data.exists === 'boolean') {
    return !data.exists
  }

  throw new Error('Unexpected response while checking subdomain availability.')
}

const claimSubdomain = async (clientId: string, subdomain: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/subdomain/claim`, {
    clientId,
    subdomain,
  })
}

const updateExposedPort = async (clientId: string, port: number): Promise<number> => {
  const { data } = await axios.put<PortResponse>(`${API_BASE_URL}/client/port`, {
    clientId,
    port,
  })

  return parsePort(data.port) ?? port
}

const updateCustomDomain = async (clientId: string, domain: string): Promise<string> => {
  const { data } = await axios.put<DomainResponse>(`${API_BASE_URL}/client/domain`, { clientId, domain })
  return data.customDomain
}

const toBase64 = (bytes: Uint8Array): string => {
  let value = ''
  bytes.forEach((byte) => { value += String.fromCharCode(byte) })
  return btoa(value)
}

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function App() {
  const [step, setStep] = useState<FlowStep>('loading')
  const [session, setSession] = useState<ClientSession | null>(null)
  const [subdomainInput, setSubdomainInput] = useState('')
  const [portInput, setPortInput] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('Starting secure tunnel client...')
  const [infoMessage, setInfoMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const tunnelSocket = useRef<WebSocket | null>(null)
  const tunnelPort = useRef<number | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const shouldReconnect = useRef(true)

  const publicUrl = useMemo(() => {
    if (!session?.subdomain) {
      return ''
    }
    return `https://${session.subdomain}.${ROOT_DOMAIN}`
  }, [session])

  const bootstrapClient = async (): Promise<void> => {
    setStep('loading')
    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const storedClientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)

      setStatusMessage(
        storedClientId
          ? 'Validating saved client identity...'
          : 'Generating a new client identity...'
      )

      const nextSession = await ensureClientIdentity(storedClientId)

      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextSession.id)
      setSession(nextSession)
      setPortInput(nextSession.port ? String(nextSession.port) : '')
      setSubdomainInput(nextSession.subdomain)
      setDomainInput(nextSession.customDomain)
      tunnelPort.current = nextSession.port
      const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws'
      const tunnelUrl = `${protocol}://${new URL(API_BASE_URL).host}/tunnel/connect?clientId=${encodeURIComponent(nextSession.id)}`
      let reconnectDelay = 1000
      const connectTunnel = (): void => {
        if (!shouldReconnect.current) return
        const socket = new WebSocket(tunnelUrl)
        tunnelSocket.current = socket
        socket.onopen = () => {
          reconnectDelay = 1000
          setStatusMessage('Persistent tunnel connected.')
        }
        socket.onmessage = async (event) => {
          const request = JSON.parse(event.data) as TunnelRequest
          const port = tunnelPort.current
          if (!port) {
            socket.send(JSON.stringify({ id: request.id, status: 503, headers: {}, error: 'No local port configured' }))
            return
          }
          try {
            const localHeaders: Record<string, string> = {}
            Object.entries(request.headers).forEach(([name, values]) => { localHeaders[name] = values.join(', ') })
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
          } catch (error) {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ id: request.id, status: 502, headers: {}, error: error instanceof Error ? error.message : 'Local service unavailable' }))
            }
          }
        }
        socket.onclose = () => {
          if (tunnelSocket.current !== socket || !shouldReconnect.current) return
          tunnelSocket.current = null
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
      } else {
        setStep('subdomain')
        setInfoMessage('Identity created. Reserve your subdomain to continue.')
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
      setStatusMessage('Could not connect to your PortShare API server.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDomainSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!session || !domainInput.trim()) return
    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('Mapping your domain...')
    try {
      const customDomain = await updateCustomDomain(session.id, domainInput.trim())
      setSession((current) => current ? { ...current, customDomain } : current)
      setDomainInput(customDomain)
      setInfoMessage('Domain mapped. Add a CNAME record pointing to your PortShare endpoint.')
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    } finally { setIsBusy(false) }
  }

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const nextTheme = savedTheme === 'dark' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    void bootstrapClient()
    return () => {
      shouldReconnect.current = false
      if (reconnectTimer.current !== null) window.clearTimeout(reconnectTimer.current)
      tunnelSocket.current?.close()
      tunnelSocket.current = null
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }

  const handleSubdomainSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!session) {
      return
    }

    const normalizedSubdomain = normalizeSubdomain(subdomainInput)

    if (normalizedSubdomain.length < 3 || normalizedSubdomain.length > 32) {
      setErrorMessage('Subdomain must be 3-32 characters using letters, numbers, or hyphens.')
      return
    }

    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('Checking subdomain availability...')

    try {
      const isAvailable = await checkSubdomainAvailability(normalizedSubdomain)

      if (!isAvailable) {
        setErrorMessage('That subdomain is already taken. Try another one.')
        return
      }

      await claimSubdomain(session.id, normalizedSubdomain)

      setSession((current) =>
        current
          ? {
              ...current,
              subdomain: normalizedSubdomain,
            }
          : current
      )
      setStep('dashboard')
      setInfoMessage('Subdomain reserved successfully.')
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handlePortSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!session) {
      return
    }

    const parsedPort = Number(portInput)
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setErrorMessage('Enter a valid TCP port between 1 and 65535.')
      return
    }

    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('Updating exposed port...')

    try {
      const nextPort = await updateExposedPort(session.id, parsedPort)
      tunnelPort.current = nextPort
      setSession((current) => (current ? { ...current, port: nextPort } : current))
      setPortInput(String(nextPort))
      setInfoMessage(`Port ${nextPort} is now routed to your public URL.`)
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handleCopyUrl = async (): Promise<void> => {
    if (!publicUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyFeedback('copied')
      window.setTimeout(() => setCopyFeedback('idle'), 1800)
    } catch {
      setCopyFeedback('failed')
      window.setTimeout(() => setCopyFeedback('idle'), 1800)
    }
  }

  return (
    <div className="portshare-root">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />

      <section className="console-shell">
        <header className="console-topbar">
          <div className="brand-area">
            <span className="brand-mark" aria-hidden="true">
              PS
            </span>
            <div>
              <p className="brand-title">PortShare Tunnel</p>
              <p className="brand-subtitle">Expose localhost through managed subdomains</p>
            </div>
          </div>

          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          {step === 'dashboard' && publicUrl ? (
            <div className="url-chip-wrap">
              <div className="url-chip" aria-live="polite">
                <span className="url-chip-label">Public URL</span>
                <strong>{publicUrl}</strong>
              </div>
              <button type="button" className="copy-btn" onClick={handleCopyUrl}>
                {copyFeedback === 'copied' && 'Copied'}
                {copyFeedback === 'failed' && 'Copy failed'}
                {copyFeedback === 'idle' && 'Copy'}
              </button>
            </div>
          ) : (
            <p className="status-pill">{statusMessage}</p>
          )}
        </header>

        <main className="console-content">
          {step === 'loading' && (
            <section className="panel panel-loading">
              <p className="panel-kicker">Boot sequence</p>
              <h1>Preparing your tunnel workspace</h1>
              <p>{statusMessage}</p>

              <div className="loader" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              {errorMessage && (
                <button type="button" className="primary-btn" onClick={() => void bootstrapClient()}>
                  Retry connection
                </button>
              )}
            </section>
          )}

          {step === 'subdomain' && session && (
            <section className="panel">
              <p className="panel-kicker">Step 1 of 2</p>
              <h1>Reserve your subdomain</h1>
              <p className="panel-text">Choose your public URL prefix before exposing a local port.</p>

              <p className="client-id">Client ID: {session.id}</p>

              <form className="input-form" onSubmit={handleSubdomainSubmit}>
                <label htmlFor="subdomain">Subdomain name</label>
                <div className="field-with-suffix">
                  <input
                    id="subdomain"
                    value={subdomainInput}
                    onChange={(event) => setSubdomainInput(event.target.value)}
                    placeholder="myapp"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isBusy}
                  />
                  <span>.{ROOT_DOMAIN}</span>
                </div>

                <button type="submit" className="primary-btn" disabled={isBusy}>
                  {isBusy ? 'Checking...' : 'Create subdomain'}
                </button>
              </form>
            </section>
          )}

          {step === 'dashboard' && session && (
            <section className="panel">
              <p className="panel-kicker">Step 2 of 2</p>
              <h1>Port dashboard</h1>
              <p className="panel-text">Set the local port that should be exposed on your public URL.</p>

              <div className="status-grid">
                <article>
                  <p className="status-label">Client ID</p>
                  <p className="status-value">{session.id}</p>
                </article>
                <article>
                  <p className="status-label">Subdomain</p>
                  <p className="status-value">
                    {session.subdomain}.{ROOT_DOMAIN}
                  </p>
                </article>
                <article>
                  <p className="status-label">Current port</p>
                  <p className="status-value">{session.port ?? 'Not set'}</p>
                </article>
                <article>
                  <p className="status-label">Owned domain</p>
                  <p className="status-value">{session.customDomain || 'Not mapped'}</p>
                </article>
              </div>

              <form className="input-form" onSubmit={handlePortSubmit}>
                <label htmlFor="port">Local port</label>
                <input
                  id="port"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  placeholder="3000"
                  value={portInput}
                  onChange={(event) => setPortInput(event.target.value)}
                  disabled={isBusy}
                />

                <button type="submit" className="primary-btn jumbo" disabled={isBusy}>
                  {isBusy ? 'Updating...' : 'Expose this port'}
                </button>
              </form>

              <form className="input-form domain-form" onSubmit={handleDomainSubmit}>
                <label htmlFor="custom-domain">Use your own domain</label>
                <input id="custom-domain" type="text" inputMode="url" placeholder="app.example.com" value={domainInput} onChange={(event) => setDomainInput(event.target.value)} disabled={isBusy} />
                <p className="field-help">After mapping, create a CNAME for this hostname to your PortShare endpoint.</p>
                <button type="submit" className="secondary-btn" disabled={isBusy || !domainInput.trim()}>
                  {isBusy ? 'Mapping...' : 'Map owned domain'}
                </button>
              </form>
            </section>
          )}

          <section className="feedback-row" aria-live="polite">
            {infoMessage && <p className="feedback feedback-info">{infoMessage}</p>}
            {errorMessage && <p className="feedback feedback-error">{errorMessage}</p>}
          </section>
        </main>
      </section>
    </div>
  )
}

export default App
