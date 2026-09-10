import { useState, type FormEvent } from 'react'
import { Globe, Plus, Trash2, CheckCircle, Clock, XCircle, Copy, X } from 'lucide-react'
import type { ClientSession } from '../../lib/api'
import { ROOT_DOMAIN } from '../../lib/api'

type Props = {
  session: ClientSession | null
  domainInput: string
  setDomainInput: (v: string) => void
  onDomainSubmit: (e: FormEvent<HTMLFormElement>) => void
  isBusy: boolean
}

type DomainEntry = {
  id: string
  name: string
  type: 'subdomain' | 'custom'
  status: 'active' | 'pending' | 'error'
  target: string
}

export default function DomainsPage({ session, domainInput, setDomainInput, onDomainSubmit, isBusy }: Props) {
  const [showAddCustom, setShowAddCustom] = useState(false)

  const domains: DomainEntry[] = [
    ...(session?.subdomain ? [{
      id: 'sub',
      name: `${session.subdomain}.${ROOT_DOMAIN}`,
      type: 'subdomain' as const,
      status: 'active' as const,
      target: `localhost:${session.port ?? 3000}`,
    }] : []),
    ...(session?.customDomain ? [{
      id: 'custom',
      name: session.customDomain,
      type: 'custom' as const,
      status: 'pending' as const,
      target: `${session.subdomain}.${ROOT_DOMAIN}`,
    }] : []),
  ]

  const statusIcon = {
    active:  <CheckCircle size={14} style={{ color: 'var(--green)' }} />,
    pending: <Clock size={14} style={{ color: 'var(--yellow)' }} />,
    error:   <XCircle size={14} style={{ color: 'var(--red)' }} />,
  }

  const statusBadge = {
    active:  'ps-badge-green',
    pending: 'ps-badge-yellow',
    error:   'ps-badge-red',
  }

  return (
    <div className="ps-main">
      <div className="ps-page-header animate-fade-down">
        <div>
          <h1 className="ps-page-title">Domains</h1>
          <p className="ps-page-subtitle">Manage your PortShare subdomains and custom domains</p>
        </div>
        <div className="ps-header-actions">
          <button className="ps-btn ps-btn-primary ps-btn-sm" onClick={() => setShowAddCustom(true)}>
            <Plus size={13} />
            Add Custom Domain
          </button>
        </div>
      </div>

      <div className="ps-page-content">
        {/* Domains list */}
        <div className="ps-card animate-fade-up">
          {domains.length === 0 ? (
            <div className="ps-empty">
              <Globe size={32} />
              <span className="ps-empty-title">No domains configured</span>
              <span className="ps-empty-sub">Your PortShare subdomain will appear here once you connect.</span>
            </div>
          ) : (
            domains.map(domain => (
              <div key={domain.id} className="ps-domain-item">
                {statusIcon[domain.status]}
                <div className="ps-domain-info">
                  <div className="ps-domain-name">{domain.name}</div>
                  <div className="ps-domain-sub">
                    {domain.type === 'subdomain' ? 'PortShare Subdomain' : `Custom → ${domain.target}`}
                  </div>
                </div>
                <span className={`ps-badge ${statusBadge[domain.status]}`}>{domain.status}</span>
                <div className="ps-domain-actions">
                  <button
                    className="ps-btn-icon"
                    onClick={() => navigator.clipboard.writeText(`https://${domain.name}`)}
                    title="Copy URL"
                  >
                    <Copy size={12} />
                  </button>
                  {domain.type === 'custom' && (
                    <button className="ps-btn-icon" title="Remove">
                      <Trash2 size={12} style={{ color: 'var(--red)' }} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DNS instructions for pending */}
        {session?.customDomain && (
          <div className="ps-card animate-fade-up delay-100" style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                DNS Configuration
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 12, lineHeight: 1.6 }}>
              Add this CNAME record to your DNS provider to activate your custom domain:
            </p>
            <div className="ps-code">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '0 24px' }}>
                <span style={{ color: 'var(--text-soft)' }}>Type</span>
                <span style={{ color: 'var(--text-soft)' }}>Name</span>
                <span style={{ color: 'var(--text-soft)' }}>Value</span>
                <span style={{ color: 'var(--cyan)' }}>CNAME</span>
                <span style={{ color: 'var(--text)' }}>{session.customDomain.split('.')[0]}</span>
                <span style={{ color: 'var(--text-accent)' }}>{session.subdomain}.{ROOT_DOMAIN}</span>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 10 }}>
              DNS propagation can take up to 48 hours. Status will update automatically.
            </p>
          </div>
        )}
      </div>

      {/* Add custom domain modal */}
      {showAddCustom && (
        <div className="ps-modal-overlay" onClick={() => setShowAddCustom(false)}>
          <div className="ps-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-header">
              <span className="ps-modal-title">Add Custom Domain</span>
              <button className="ps-btn-icon" onClick={() => setShowAddCustom(false)}><X size={14} /></button>
            </div>
            <form onSubmit={e => { onDomainSubmit(e); setShowAddCustom(false) }}>
              <div className="ps-modal-body">
                <div className="ps-input-wrap">
                  <label className="ps-label">Domain Name</label>
                  <input
                    className="ps-input"
                    value={domainInput}
                    onChange={e => setDomainInput(e.target.value.toLowerCase())}
                    placeholder="tunnel.yourdomain.com"
                    autoFocus
                  />
                </div>
                <div className="ps-code" style={{ fontSize: 11.5, lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 4, color: 'var(--text-soft)' }}>After adding, create this DNS record:</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> CNAME</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Target:</span> {session?.subdomain}.{ROOT_DOMAIN}</div>
                </div>
              </div>
              <div className="ps-modal-footer">
                <button type="button" className="ps-btn ps-btn-ghost" onClick={() => setShowAddCustom(false)}>Cancel</button>
                <button type="submit" className="ps-btn ps-btn-primary" disabled={isBusy || !domainInput.trim()}>
                  Add Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
