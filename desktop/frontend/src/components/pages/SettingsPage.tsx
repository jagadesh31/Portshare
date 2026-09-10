import { useState } from 'react'
import { User, Shield, Wifi, Monitor, Bell, Sliders } from 'lucide-react'

type SettingsSection = 'general' | 'account' | 'tunnel' | 'security' | 'appearance' | 'network'

const sections: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: 'general',    label: 'General',    icon: Sliders },
  { id: 'account',    label: 'Account',    icon: User },
  { id: 'tunnel',     label: 'Tunnel',     icon: Wifi },
  { id: 'security',   label: 'Security',   icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'network',    label: 'Network',    icon: Bell },
]

type Props = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function SettingsPage({ theme, onToggleTheme }: Props) {
  const [active, setActive] = useState<SettingsSection>('general')
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [startOnLogin, setStartOnLogin] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [requireAuth, setRequireAuth] = useState(false)
  const [logRequests, setLogRequests] = useState(true)
  const [maxRetries, setMaxRetries] = useState('5')

  return (
    <div className="ps-main">
      <div className="ps-page-header animate-fade-down">
        <div>
          <h1 className="ps-page-title">Settings</h1>
          <p className="ps-page-subtitle">Configure your PortShare preferences</p>
        </div>
      </div>

      <div className="ps-page-content" style={{ flex: 1, overflow: 'hidden', padding: '16px 28px 28px' }}>
        <div className="ps-settings-layout ps-card animate-fade-up" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Settings Nav */}
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

          {/* Settings Content */}
          <div className="ps-settings-content">
            {active === 'general' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">General</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Start on Login</div>
                    <div className="ps-settings-row-desc">Launch PortShare automatically when you log in</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" checked={startOnLogin} onChange={() => setStartOnLogin(v => !v)} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Desktop Notifications</div>
                    <div className="ps-settings-row-desc">Get notified when tunnel status changes</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" checked={notifications} onChange={() => setNotifications(v => !v)} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Log Requests</div>
                    <div className="ps-settings-row-desc">Record incoming requests in the Requests inspector</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" checked={logRequests} onChange={() => setLogRequests(v => !v)} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
              </div>
            )}

            {active === 'tunnel' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Tunnel</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Auto-Reconnect</div>
                    <div className="ps-settings-row-desc">Automatically reconnect if the tunnel drops</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" checked={autoReconnect} onChange={() => setAutoReconnect(v => !v)} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Max Reconnect Retries</div>
                    <div className="ps-settings-row-desc">Number of reconnection attempts before giving up</div>
                  </div>
                  <input
                    type="number"
                    className="ps-input ps-input-mono"
                    value={maxRetries}
                    onChange={e => setMaxRetries(e.target.value)}
                    min={1}
                    max={100}
                    style={{ width: 80 }}
                  />
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Default Protocol</div>
                    <div className="ps-settings-row-desc">Protocol for new tunnels</div>
                  </div>
                  <select className="ps-select">
                    <option value="https">HTTPS</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
              </div>
            )}

            {active === 'security' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Security</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Require Authentication</div>
                    <div className="ps-settings-row-desc">Protect tunnels with Google OAuth by default</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" checked={requireAuth} onChange={() => setRequireAuth(v => !v)} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">SSH Tunneling</div>
                    <div className="ps-settings-row-desc">Allow native SSH -R reverse tunnels (no client install needed)</div>
                  </div>
                  <label className="ps-toggle">
                    <input type="checkbox" defaultChecked={true} />
                    <div className="ps-toggle-track" />
                  </label>
                </div>
              </div>
            )}

            {active === 'appearance' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Appearance</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Theme</div>
                    <div className="ps-settings-row-desc">Choose between dark and light modes</div>
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
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Sidebar Width</div>
                    <div className="ps-settings-row-desc">Adjust the sidebar navigation width</div>
                  </div>
                  <select className="ps-select">
                    <option value="compact">Compact (180px)</option>
                    <option value="default" selected>Default (220px)</option>
                    <option value="wide">Wide (260px)</option>
                  </select>
                </div>
              </div>
            )}

            {active === 'account' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Account</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Plan</div>
                    <div className="ps-settings-row-desc">Your current PortShare subscription</div>
                  </div>
                  <span className="ps-badge ps-badge-purple">Free</span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Bandwidth Limit</div>
                    <div className="ps-settings-row-desc">Monthly data transfer cap for your plan</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>1 GB</span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">Upgrade Plan</div>
                    <div className="ps-settings-row-desc">Unlock unlimited bandwidth, custom domains, and more</div>
                  </div>
                  <button className="ps-btn ps-btn-primary ps-btn-sm">Upgrade</button>
                </div>
              </div>
            )}

            {active === 'network' && (
              <div className="ps-settings-section animate-fade-in">
                <div className="ps-settings-section-title">Network</div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">API Server</div>
                    <div className="ps-settings-row-desc">PortShare API endpoint</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11.5, color: 'var(--text-soft)' }}>
                    api.portshare.kexoz.dev
                  </span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">SSH Server</div>
                    <div className="ps-settings-row-desc">Zero-install SSH tunnel endpoint</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11.5, color: 'var(--text-soft)' }}>
                    portshare.kexoz.dev:22
                  </span>
                </div>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-label">WebSocket Timeout</div>
                    <div className="ps-settings-row-desc">How long to wait before reconnecting (ms)</div>
                  </div>
                  <input type="number" className="ps-input ps-input-mono" defaultValue={30000} style={{ width: 100 }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
