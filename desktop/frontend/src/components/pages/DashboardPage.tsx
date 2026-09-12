import { useState, type FormEvent } from 'react'
import { Copy, ExternalLink, Activity, Clock, Database, Plus, ChevronDown, ChevronUp, Check } from 'lucide-react'
import type { ClientSession, ConnectionState } from '../../lib/api'
import { ROOT_DOMAIN } from '../../lib/api'
import NewTunnelModal from '../modals/NewTunnelModal'

type Props = {
  session: ClientSession | null
  connState: ConnectionState
  portInput: string
  setPortInput: (v: string) => void
  onPortSubmit: (e: FormEvent<HTMLFormElement>) => void
  domainInput: string
  setDomainInput: (v: string) => void
  onDomainSubmit: (e: FormEvent<HTMLFormElement>) => void
  gauthEnabled: boolean
  onAuthToggle: () => void
  isBusy: boolean
  totalRequests: number
  onCopyUrl: () => void
  copyFeedback: 'idle' | 'copied' | 'failed'
  statusMessage: string
  uptimeSeconds: number
  showNewTunnel: boolean
  onOpenNewTunnel: () => void
  onCloseNewTunnel: () => void
  onCreateTunnel: (port: number) => void | Promise<void>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const connBadge: Record<ConnectionState, { label: string; cls: string }> = {
  idle:         { label: 'Idle',         cls: 'ps-badge-gray' },
  connecting:   { label: 'Connecting',   cls: 'ps-badge-yellow' },
  connected:    { label: 'Connected',    cls: 'ps-badge-green' },
  disconnected: { label: 'Reconnecting', cls: 'ps-badge-yellow' },
}

export default function DashboardPage({
  session, connState, portInput, setPortInput, onPortSubmit,
  domainInput, setDomainInput, onDomainSubmit,
  gauthEnabled, onAuthToggle, isBusy,
  totalRequests, onCopyUrl, copyFeedback, statusMessage, uptimeSeconds,
  showNewTunnel, onOpenNewTunnel, onCloseNewTunnel, onCreateTunnel,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const publicUrl = session?.subdomain
    ? `https://${session.subdomain}.${ROOT_DOMAIN}`
    : null

  const bwPct = session
    ? Math.min(100, (session.bandwidthUsed / session.bandwidthLimit) * 100)
    : 0

  const badge = connBadge[connState]

  return (
    <div className="ps-main">
      {/* Header */}
      <div className="ps-page-header animate-fade-down">
        <div>
          <h1 className="ps-page-title">Dashboard</h1>
          <p className="ps-page-subtitle">
            {connState === 'connected' ? 'Tunnel is live and forwarding traffic' : statusMessage}
          </p>
        </div>
        <div className="ps-header-actions">
          <button
            className="ps-btn ps-btn-primary ps-btn-sm"
            onClick={onOpenNewTunnel}
          >
            <Plus size={13} />
            Set port
          </button>
        </div>
      </div>

      <div className="ps-page-content">
        {/* Tunnel Card */}
        <div
          className={`ps-tunnel-card ${connState === 'connected' ? 'tunnel-connected' : ''} animate-fade-up`}
        >
          <div className="ps-tunnel-card-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              {publicUrl ? (
                <div className="ps-tunnel-url" onClick={onCopyUrl} title="Click to copy">
                  {copyFeedback === 'copied'
                    ? <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    : <Copy size={14} style={{ flexShrink: 0, color: 'var(--text-soft)' }} />
                  }
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {publicUrl}
                  </span>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ marginLeft: 'auto', color: 'var(--text-soft)', flexShrink: 0 }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              ) : (
                <div style={{ color: 'var(--text-soft)', fontSize: 12 }}>No subdomain configured</div>
              )}
            </div>
            <div className="ps-header-actions">
              <span className={`ps-badge ${badge.cls}`}>{badge.label}</span>
            </div>
          </div>

          {/* Tunnel Config row */}
          <div className="ps-tunnel-card-body">
            <form onSubmit={onPortSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="ps-input-wrap" style={{ flex: 1 }}>
                <label className="ps-label">Local Port</label>
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
              <button
                type="submit"
                className="ps-btn ps-btn-secondary ps-btn-sm"
                disabled={isBusy}
                style={{ marginBottom: 1 }}
              >
                Update
              </button>
            </form>

            {/* Advanced */}
            <button
              className="ps-btn ps-btn-ghost ps-btn-sm"
              style={{ alignSelf: 'flex-start', gap: 5 }}
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Advanced Options
            </button>

            {showAdvanced && (
              <div
                className="animate-fade-up"
                style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}
              >
                <div className="ps-divider" />
                {/* Custom Domain */}
                <form onSubmit={onDomainSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div className="ps-input-wrap" style={{ flex: 1 }}>
                    <label className="ps-label">Custom Domain</label>
                    <input
                      className="ps-input"
                      value={domainInput}
                      onChange={e => setDomainInput(e.target.value)}
                      placeholder="tunnel.yourdomain.com"
                    />
                  </div>
                  <button type="submit" className="ps-btn ps-btn-secondary ps-btn-sm" disabled={isBusy}>
                    Map
                  </button>
                </form>

                {/* Auth toggle */}
                <div className="ps-settings-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Google Auth Wall</div>
                    <div className="ps-settings-row-desc">
                      {gauthEnabled ? 'Visitors must sign in with Google' : 'Tunnel is publicly accessible'}
                    </div>
                  </div>
                  <label className="ps-toggle">
                    <input
                      type="checkbox"
                      checked={session?.requireAuth ?? false}
                      onChange={onAuthToggle}
                      disabled={!gauthEnabled || isBusy}
                    />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="ps-tunnel-card-stats">
            <div className="ps-tunnel-stat">
              <span className="ps-tunnel-stat-label">Requests</span>
              <span className="ps-tunnel-stat-value">{totalRequests.toLocaleString()}</span>
            </div>
            <div className="ps-tunnel-stat">
              <span className="ps-tunnel-stat-label">Bandwidth</span>
              <span className="ps-tunnel-stat-value">{session ? formatBytes(session.bandwidthUsed) : '—'}</span>
            </div>
            <div className="ps-tunnel-stat">
              <span className="ps-tunnel-stat-label">Uptime</span>
              <span className="ps-tunnel-stat-value">{connState === 'connected' ? formatUptime(uptimeSeconds) : '—'}</span>
            </div>
            <div className="ps-tunnel-stat">
              <span className="ps-tunnel-stat-label">Plan</span>
              <span className="ps-tunnel-stat-value" style={{ textTransform: 'capitalize', fontSize: 14 }}>
                {session?.plan ?? 'Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Bandwidth usage */}
        {session && (
          <div className="ps-card animate-fade-up delay-100" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={14} style={{ color: 'var(--text-soft)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Bandwidth Usage</span>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono-font)', color: 'var(--text-soft)' }}>
                {formatBytes(session.bandwidthUsed)} / {formatBytes(session.bandwidthLimit)}
              </span>
            </div>
            <div className="ps-bandwidth-bar">
              <div className="ps-bandwidth-fill" style={{ width: `${bwPct}%` }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-soft)' }}>
              {(100 - bwPct).toFixed(1)}% remaining this period
            </div>
          </div>
        )}

        {/* Quick stats grid */}
        <div className="animate-fade-up delay-150" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="ps-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span className="ps-stat-label">Total Requests</span>
              <Activity size={14} style={{ color: 'var(--text-soft)' }} />
            </div>
            <div className="ps-stat-value">{totalRequests.toLocaleString()}</div>
            <div className="ps-stat-sub">Since session start</div>
          </div>
          <div className="ps-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span className="ps-stat-label">Local port</span>
              <Activity size={14} style={{ color: 'var(--text-soft)' }} />
            </div>
            <div className="ps-stat-value">
              {session?.port ?? '—'}
            </div>
            <div className="ps-stat-sub">Traffic is forwarded here</div>
          </div>
          <div className="ps-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span className="ps-stat-label">Uptime</span>
              <Clock size={14} style={{ color: 'var(--text-soft)' }} />
            </div>
            <div className="ps-stat-value">
              {connState === 'connected' ? formatUptime(uptimeSeconds) : '—'}
            </div>
            <div className="ps-stat-sub">Current session</div>
          </div>
        </div>

        {/* SSH tunnel info */}
        <div className="ps-card animate-fade-up delay-200" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Zero-Install SSH Tunnel
            </span>
            <span className="ps-badge ps-badge-gray">SSH</span>
          </div>
          <div className="ps-code">
            ssh -R 80:localhost:{portInput || '3000'} portshare.kexoz.dev
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 10 }}>
            No client install needed. Use native SSH to create tunnels from any machine.
          </p>
        </div>
      </div>

      {showNewTunnel && (
        <NewTunnelModal
          onClose={onCloseNewTunnel}
          onSubmit={onCreateTunnel}
        />
      )}
    </div>
  )
}
