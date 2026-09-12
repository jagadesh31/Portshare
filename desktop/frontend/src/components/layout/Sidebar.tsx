import { LayoutDashboard, Link2, Activity, Globe, Settings } from 'lucide-react'
import type { ConnectionState } from '../../lib/api'
import ThemeToggle from '../ui/ThemeToggle'

type Page = 'dashboard' | 'tunnels' | 'requests' | 'domains' | 'settings'

type Props = {
  activePage: Page
  onNavigate: (page: Page) => void
  connState: ConnectionState
  publicUrl: string
  requestCount: number
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tunnels',   label: 'Tunnels',   icon: Link2 },
  { id: 'requests',  label: 'Requests',  icon: Activity },
  { id: 'domains',   label: 'Domains',   icon: Globe },
  { id: 'settings',  label: 'Settings',  icon: Settings },
]

const connLabels: Record<ConnectionState, string> = {
  idle:         'Idle',
  connecting:   'Connecting',
  connected:    'Connected',
  disconnected: 'Reconnecting',
}

export default function Sidebar({ activePage, onNavigate, connState, publicUrl, requestCount, theme, onToggleTheme }: Props) {
  return (
    <aside className="ps-sidebar animate-slide-left">
      {/* Brand */}
      <div className="ps-sidebar-brand">
        <img src="./logo.svg" alt="" width={30} height={30} style={{ borderRadius: 7, display: 'block' }} />
        <div>
          <div className="ps-brand-name">PortShare</div>
          <div className="ps-brand-version">Desktop</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="ps-nav" style={{ flex: 1 }}>
        <div className="ps-nav-section-label">Navigation</div>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`ps-nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
            {id === 'requests' && requestCount > 0 && (
              <span className="ps-nav-badge">{requestCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div style={{ padding: '0 12px 12px' }}>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      {/* Connection Status */}
      <div className="ps-sidebar-status">
        <div className="ps-conn-indicator">
          <div className={`ps-conn-dot ${connState}`} />
          <div className="ps-conn-label">
            {connLabels[connState]}
            {connState === 'connected' && publicUrl && (
              <span>{new URL(publicUrl).hostname}</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
