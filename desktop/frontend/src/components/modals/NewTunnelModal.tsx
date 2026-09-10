import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { QUICK_PORTS } from '../../lib/storage'

type Props = {
  onClose: () => void
  onSubmit: (port: number) => void
}

export default function NewTunnelModal({ onClose, onSubmit }: Props) {
  const [port, setPort] = useState('')
  const [protocol, setProtocol] = useState('https')
  const [subdomain, setSubdomain] = useState('')

  const handleSubmit = () => {
    const p = Number(port)
    if (!p || p < 1 || p > 65535) return
    onSubmit(p)
  }

  return (
    <div className="ps-modal-overlay" onClick={onClose}>
      <div className="ps-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-header">
          <span className="ps-modal-title">New Tunnel</span>
          <button className="ps-btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="ps-modal-body">
          {/* Quick port selection */}
          <div className="ps-input-wrap">
            <label className="ps-label">Quick Port</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_PORTS.map(p => (
                <button
                  key={p}
                  className={`ps-btn ps-btn-sm ${Number(port) === p ? 'ps-btn-primary' : 'ps-btn-secondary'}`}
                  onClick={() => setPort(String(p))}
                  style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Local port */}
          <div className="ps-input-wrap">
            <label className="ps-label">Local Port</label>
            <div className="ps-input-group">
              <span className="ps-input-prefix">localhost:</span>
              <input
                className="ps-input ps-input-mono"
                type="number"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="3000"
                min={1}
                max={65535}
                autoFocus
              />
            </div>
          </div>

          {/* Protocol */}
          <div className="ps-input-wrap">
            <label className="ps-label">Protocol</label>
            <select
              className="ps-select"
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
            >
              <option value="https">HTTPS (recommended)</option>
              <option value="http">HTTP</option>
            </select>
          </div>

          {/* Subdomain */}
          <div className="ps-input-wrap">
            <label className="ps-label">Subdomain (optional)</label>
            <div className="ps-input-group">
              <input
                className="ps-input ps-input-mono"
                value={subdomain}
                onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="myapp"
              />
              <span className="ps-input-suffix">.portshare.kexoz.dev</span>
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            Your tunnel will be instantly available after starting. Free plan includes 1GB bandwidth/month.
          </p>
        </div>
        <div className="ps-modal-footer">
          <button className="ps-btn ps-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ps-btn ps-btn-primary"
            onClick={handleSubmit}
            disabled={!port || Number(port) < 1}
          >
            Start Tunnel
          </button>
        </div>
      </div>
    </div>
  )
}
