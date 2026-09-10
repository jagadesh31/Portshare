import { type FormEvent } from 'react'
import { Link2, Plus, Play, Square, Copy, ExternalLink, Check } from 'lucide-react'
import type { ClientSession, ConnectionState } from '../../lib/api'
import { ROOT_DOMAIN } from '../../lib/api'

type Props = {
  session: ClientSession | null
  connState: ConnectionState
  portInput: string
  setPortInput: (v: string) => void
  onPortSubmit: (e: FormEvent<HTMLFormElement>) => void
  onCopyUrl: () => void
  copyFeedback: 'idle' | 'copied' | 'failed'
  isBusy: boolean
  onNewTunnel: () => void
}

const statusText: Record<ConnectionState, string> = {
  idle:         'Idle',
  connecting:   'Connecting…',
  connected:    'Connected',
  disconnected: 'Reconnecting…',
}

export default function TunnelsPage({
  session, connState, portInput, setPortInput, onPortSubmit,
  onCopyUrl, copyFeedback, isBusy, onNewTunnel
}: Props) {
  const publicUrl = session?.subdomain ? `https://${session.subdomain}.${ROOT_DOMAIN}` : null
  const isConnected = connState === 'connected'

  return (
    <div className="ps-main">
      <div className="ps-page-header animate-fade-down">
        <div>
          <h1 className="ps-page-title">Tunnels</h1>
          <p className="ps-page-subtitle">Active and recent tunnel sessions</p>
        </div>
        <div className="ps-header-actions">
          <button className="ps-btn ps-btn-primary ps-btn-sm" onClick={onNewTunnel}>
            <Plus size={13} />
            New Tunnel
          </button>
        </div>
      </div>

      <div className="ps-page-content">
        {session?.subdomain ? (
          <div className={`ps-tunnel-card ${isConnected ? 'tunnel-connected' : ''} animate-fade-up`}>
            <div className="ps-tunnel-card-header">
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: isConnected ? 'var(--green)' : 'var(--yellow)',
                boxShadow: isConnected ? '0 0 0 2px rgba(52,211,153,0.2)' : '0 0 0 2px rgba(251,191,36,0.2)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {session.subdomain}.{ROOT_DOMAIN}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-soft)', fontFamily: 'var(--mono-font)', marginTop: 1 }}>
                  localhost:{session.port ?? '—'}
                </div>
              </div>
              <span
                className={`ps-badge ${isConnected ? 'ps-badge-green' : 'ps-badge-yellow'}`}
                style={{ textTransform: 'uppercase' }}
              >
                {statusText[connState]}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {publicUrl && (
                  <>
                    <button className="ps-btn-icon" onClick={onCopyUrl} title="Copy URL">
                      {copyFeedback === 'copied' ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ps-btn-icon"
                      title="Open in browser"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </>
                )}
                {isConnected ? (
                  <button className="ps-btn ps-btn-danger ps-btn-sm">
                    <Square size={10} fill="currentColor" />
                    Stop
                  </button>
                ) : (
                  <button className="ps-btn ps-btn-success ps-btn-sm" disabled={isBusy}>
                    <Play size={10} fill="currentColor" />
                    Start
                  </button>
                )}
              </div>
            </div>

            {/* Port config */}
            <div className="ps-tunnel-card-body">
              <form onSubmit={onPortSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="ps-input-wrap" style={{ flex: 1, maxWidth: 260 }}>
                  <label className="ps-label">Forwarding to</label>
                  <div className="ps-input-group">
                    <span className="ps-input-prefix">localhost:</span>
                    <input
                      className="ps-input ps-input-mono"
                      value={portInput}
                      onChange={e => setPortInput(e.target.value)}
                      placeholder="3000"
                      type="number"
                      min={1}
                      max={65535}
                    />
                  </div>
                </div>
                <button type="submit" className="ps-btn ps-btn-secondary ps-btn-sm" disabled={isBusy}>
                  Update Port
                </button>
              </form>
            </div>

            <div className="ps-tunnel-card-stats">
              <div className="ps-tunnel-stat">
                <span className="ps-tunnel-stat-label">Protocol</span>
                <span className="ps-tunnel-stat-value" style={{ fontSize: 14 }}>HTTPS</span>
              </div>
              <div className="ps-tunnel-stat">
                <span className="ps-tunnel-stat-label">Plan</span>
                <span className="ps-tunnel-stat-value" style={{ fontSize: 14, textTransform: 'capitalize' }}>{session.plan}</span>
              </div>
              <div className="ps-tunnel-stat">
                <span className="ps-tunnel-stat-label">Auth</span>
                <span className="ps-tunnel-stat-value" style={{ fontSize: 14 }}>{session.requireAuth ? 'Google' : 'Public'}</span>
              </div>
              <div className="ps-tunnel-stat">
                <span className="ps-tunnel-stat-label">Custom Domain</span>
                <span className="ps-tunnel-stat-value" style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                  {session.customDomain || 'None'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="ps-card animate-fade-up">
            <div className="ps-empty">
              <Link2 size={32} />
              <span className="ps-empty-title">No active tunnels</span>
              <span className="ps-empty-sub">Create a tunnel to expose your local service to the internet.</span>
              <button className="ps-btn ps-btn-primary" onClick={onNewTunnel} style={{ marginTop: 8 }}>
                <Plus size={13} />
                New Tunnel
              </button>
            </div>
          </div>
        )}

        {/* SSH Quick-connect */}
        <div className="ps-card animate-fade-up delay-100" style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Zero-Install SSH Tunnel
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              Use native SSH on any machine — no client install required.
            </div>
          </div>
          <div className="ps-code">
            ssh -R 80:localhost:{portInput || '3000'} portshare.kexoz.dev
          </div>
        </div>
      </div>
    </div>
  )
}
