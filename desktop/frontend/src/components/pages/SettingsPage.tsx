import { useState } from 'react'
import { Monitor, Shield, Wifi } from 'lucide-react'
import type { ClientSession } from '../../lib/api'
import { API_BASE_URL, ROOT_DOMAIN } from '../../lib/api'

type SettingsSection = 'appearance' | 'tunnel' | 'account'

const sections: { id: SettingsSection; label: string; icon: typeof Monitor }[] = [
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'tunnel',     label: 'Tunnel',     icon: Wifi },
  { id: 'account',    label: 'Account',    icon: Shield },
]

type Props = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  session: ClientSession
}

export default function SettingsPage({ theme, onToggleTheme, session }: Props) {
  const [active, setActive] = useState<SettingsSection>('appearance')

  return (
    <div className="ps-main">
      <div className="ps-page-header animate-fade-down">
        <div>
          <h1 className="ps-page-title">Settings</h1>
          <p className="ps-page-subtitle">Preferences for this client</p>
        </div>
      </div>

      <div className="ps-page-content" style={{ flex: 1, overflow: 'hidden', padding: '16px 28px 28px' }}>
        <div className="ps-settings-layout ps-card animate-fade-up" style={{ height: 'calc(100vh - 160px)' }}>
          <div className="ps-settings-nav">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`ps-settings-nav-item ${active === id ? 'active' : ''}`}
                onClick={() => setActive(id)}
              >
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>

          <div className="ps-settings-content">
            {active === 'appearance' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Appearance</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Theme</div>
                    <div className="ps-settings-row-desc">Dark and light modes for this device</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`ps-btn ps-btn-sm ${theme === 'dark' ? 'ps-btn-primary' : 'ps-btn-secondary'}`}
                      onClick={() => theme !== 'dark' && onToggleTheme()}
                    >
                      Dark
                    </button>
                    <button
                      className={`ps-btn ps-btn-sm ${theme === 'light' ? 'ps-btn-primary' : 'ps-btn-secondary'}`}
                      onClick={() => theme !== 'light' && onToggleTheme()}
                    >
                      Light
                    </button>
                  </div>
                </div>
              </div>
            )}

            {active === 'tunnel' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Tunnel</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Reconnect</div>
                    <div className="ps-settings-row-desc">The client reconnects automatically if the socket drops</div>
                  </div>
                  <span className="ps-badge ps-badge-green">On</span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">API</div>
                    <div className="ps-settings-row-desc">Control plane used by this build</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11.5, color: 'var(--text-soft)' }}>
                    {API_BASE_URL.replace(/^https?:\/\//, '')}
                  </span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Root domain</div>
                    <div className="ps-settings-row-desc">Public hostname suffix for tunnels</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11.5, color: 'var(--text-soft)' }}>
                    {ROOT_DOMAIN}
                  </span>
                </div>
              </div>
            )}

            {active === 'account' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Account</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Plan</div>
                    <div className="ps-settings-row-desc">Current bandwidth plan for this identity</div>
                  </div>
                  <span className="ps-badge ps-badge-gray" style={{ textTransform: 'capitalize' }}>{session.plan}</span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Client ID</div>
                    <div className="ps-settings-row-desc">Stored locally on this machine</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-soft)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.id}
                  </span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Auth wall</div>
                    <div className="ps-settings-row-desc">Google sign-in required for visitors</div>
                  </div>
                  <span className="ps-badge ps-badge-gray">{session.requireAuth ? 'Enabled' : 'Off'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
