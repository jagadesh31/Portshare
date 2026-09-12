import { useState } from 'react'
import { X } from 'lucide-react'
import { QUICK_PORTS } from '../../lib/storage'
import { ROOT_DOMAIN } from '../../lib/api'

type Props = {
  onClose: () => void
  onSubmit: (port: number) => void | Promise<void>
}

export default function NewTunnelModal({ onClose, onSubmit }: Props) {
  const [port, setPort] = useState('')

  const handleSubmit = () => {
    const p = Number(port)
    if (!p || p < 1 || p > 65535) return
    void onSubmit(p)
  }

  return (
    <div className="ps-modal-overlay" onClick={onClose}>
      <div className="ps-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-header">
          <span className="ps-modal-title">Forward a local port</span>
          <button className="ps-btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="ps-modal-body">
          <div className="ps-input-wrap">
            <label className="ps-label">Quick select</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_PORTS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`ps-btn ps-btn-sm ${Number(port) === p ? 'ps-btn-primary' : 'ps-btn-secondary'}`}
                  onClick={() => setPort(String(p))}
                  style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="ps-input-wrap">
            <label className="ps-label">Local port</label>
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
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            Incoming HTTPS requests to your subdomain will be forwarded to this port on this machine.
            Hostname suffix: {ROOT_DOMAIN}
          </p>
        </div>
        <div className="ps-modal-footer">
          <button className="ps-btn ps-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ps-btn ps-btn-primary"
            onClick={handleSubmit}
            disabled={!port || Number(port) < 1}
          >
            Start forwarding
          </button>
        </div>
      </div>
    </div>
  )
}
