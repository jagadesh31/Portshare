import './styles/tokens.css'
import './styles/base.css'
import './styles/animations.css'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Toaster, toast } from 'react-hot-toast'
import axios from 'axios'

import {
  type ClientSession, type ConnectionState, type FlowStep,
  API_BASE_URL, ROOT_DOMAIN,
  ensureClientIdentity, checkSubdomainAvailability, claimSubdomain,
  updateExposedPort, updateCustomDomain, updateClientAuth
} from './lib/api'
import { getClientId, setClientId } from './lib/storage'
import { normalizeSubdomain, extractError } from './lib/utils'
import { createTunnelConnection } from './lib/tunnel'
import { useTheme } from './hooks/useTheme'
import { useRequestLog } from './hooks/useRequestLog'

import AppShell from './components/layout/AppShell'
import Sidebar from './components/layout/Sidebar'
import FeedbackBanner from './components/ui/FeedbackBanner'
import LoadingScreen from './components/screens/LoadingScreen'
import SubdomainScreen from './components/screens/SubdomainScreen'
import DashboardPage from './components/pages/DashboardPage'
import TunnelsPage from './components/pages/TunnelsPage'
import RequestsPage from './components/pages/RequestsPage'
import DomainsPage from './components/pages/DomainsPage'
import SettingsPage from './components/pages/SettingsPage'

type Page = 'dashboard' | 'tunnels' | 'requests' | 'domains' | 'settings'

export default function App() {
  const [step, setStep] = useState<FlowStep>('loading')
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [session, setSession] = useState<ClientSession | null>(null)
  
  const [subdomainInput, setSubdomainInput] = useState('')
  const [portInput, setPortInput] = useState('')
  const [domainInput, setDomainInput] = useState('')
  
  const [statusMessage, setStatusMessage] = useState('Starting secure tunnel client...')
  const [infoMessage, setInfoMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [connState, setConnState] = useState<ConnectionState>('idle')
  const [gauthEnabled, setGauthEnabled] = useState(false)

  const { theme, toggleTheme } = useTheme()
  const { requestLog, totalRequests, addLogEntry, clearLog } = useRequestLog()

  const tunnelPort = useRef<number | null>(null)
  const tunnelClose = useRef<(() => void) | null>(null)

  const publicUrl = useMemo(() => {
    if (!session?.subdomain) return ''
    return `https://${session.subdomain}.${ROOT_DOMAIN}`
  }, [session])

  const bootstrapClient = useCallback(async (): Promise<void> => {
    setStep('loading')
    setIsBusy(true)
    setErrorMessage('')
    setInfoMessage('')
    setConnState('connecting')

    try {
      const storedId = getClientId()
      setStatusMessage(storedId ? 'Validating saved client identity...' : 'Generating a new client identity...')

      const nextSession = await ensureClientIdentity(storedId)
      setClientId(nextSession.id)
      setSession(nextSession)
      setPortInput(nextSession.port ? String(nextSession.port) : '')
      setSubdomainInput(nextSession.subdomain)
      setDomainInput(nextSession.customDomain)
      tunnelPort.current = nextSession.port

      tunnelClose.current?.()
      const tunnel = createTunnelConnection({
        apiBaseUrl: API_BASE_URL,
        clientId: nextSession.id,
        portRef: tunnelPort,
        onStateChange: (state, message) => {
          setConnState(state)
          if (message) setStatusMessage(message)
        },
        onLogEntry: addLogEntry
      })
      tunnelClose.current = tunnel.close

      if (nextSession.subdomain.length > 0) {
        setStep('dashboard')
        setInfoMessage('Identity loaded. You can expose any local port now.')
        try {
          const { data: authStatus } = await axios.get<{ enabled: boolean }>(`${API_BASE_URL}/auth/google/status`)
          setGauthEnabled(authStatus.enabled)
        } catch {}
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
    void bootstrapClient()
    return () => {
      tunnelClose.current?.()
      tunnelClose.current = null
    }
  }, [bootstrapClient])

  const handleSubdomainSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

  const handlePortSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      toast.success(`Port ${next} is now exposed!`)
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleDomainSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session || !domainInput.trim()) return
    setIsBusy(true); setErrorMessage(''); setInfoMessage('Mapping your domain...')
    try {
      const customDomain = await updateCustomDomain(session.id, domainInput.trim())
      setSession(cur => cur ? { ...cur, customDomain } : cur)
      setDomainInput(customDomain)
      setInfoMessage('Domain mapped. Add a CNAME record pointing to your PortShare endpoint.')
      toast.success('Custom domain mapped!')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleAuthToggle = async () => {
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
      toast.success(result.requireAuth ? 'Auth wall enabled' : 'Auth wall disabled')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally { setIsBusy(false) }
  }

  const handleCopyUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyFeedback('copied')
      toast.success('URL copied to clipboard!')
    } catch {
      setCopyFeedback('failed')
    }
    window.setTimeout(() => setCopyFeedback('idle'), 1800)
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <AppShell>
        {step === 'dashboard' && session && (
          <Sidebar
            activePage={activePage}
            onNavigate={setActivePage}
            connState={connState}
            publicUrl={publicUrl}
            requestCount={totalRequests}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        
        {step === 'loading' && (
          <LoadingScreen key="loading" statusMessage={statusMessage} errorMessage={errorMessage} onRetry={() => void bootstrapClient()} />
        )}

        {step === 'subdomain' && session && (
          <main className="console-content">
            <SubdomainScreen
              key="subdomain"
              session={session}
              subdomainInput={subdomainInput}
              setSubdomainInput={setSubdomainInput}
              onSubmit={handleSubdomainSubmit}
              isBusy={isBusy}
              gauthEnabled={gauthEnabled}
              onAuthToggle={handleAuthToggle}
            />
          </main>
        )}

        {step === 'dashboard' && session && (
          <>
            {activePage === 'dashboard' && (
              <DashboardPage
                session={session}
                connState={connState}
                portInput={portInput}
                setPortInput={setPortInput}
                onPortSubmit={handlePortSubmit}
                domainInput={domainInput}
                setDomainInput={setDomainInput}
                onDomainSubmit={handleDomainSubmit}
                gauthEnabled={gauthEnabled}
                onAuthToggle={handleAuthToggle}
                isBusy={isBusy}
                totalRequests={totalRequests}
                onCopyUrl={handleCopyUrl}
                copyFeedback={copyFeedback}
                statusMessage={statusMessage}
                uptimeSeconds={0}
              />
            )}
            
            {activePage === 'tunnels' && (
              <TunnelsPage
                session={session}
                connState={connState}
                portInput={portInput}
                setPortInput={setPortInput}
                onPortSubmit={handlePortSubmit}
                isBusy={isBusy}
                onCopyUrl={handleCopyUrl}
                copyFeedback={copyFeedback}
                onNewTunnel={() => setActivePage('dashboard')}
              />
            )}

            {activePage === 'requests' && (
              <RequestsPage
                requestLog={requestLog}
                onClear={clearLog}
              />
            )}

            {activePage === 'domains' && (
              <DomainsPage
                session={session}
                domainInput={domainInput}
                setDomainInput={setDomainInput}
                onDomainSubmit={handleDomainSubmit}
                isBusy={isBusy}
              />
            )}

            {activePage === 'settings' && (
              <SettingsPage
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )}
            
            <FeedbackBanner infoMessage={infoMessage} errorMessage={errorMessage} />
          </>
        )}
      </AppShell>
    </>
  )
}
