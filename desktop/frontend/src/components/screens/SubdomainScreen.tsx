import { type FormEvent } from 'react'
import type { ClientSession } from '../../lib/api'
import { ROOT_DOMAIN } from '../../lib/api'
import ThemeToggle from '../ui/ThemeToggle'

type SubdomainScreenProps = {
  session: ClientSession
  subdomainInput: string
  setSubdomainInput: (v: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isBusy: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function SubdomainScreen({
  session, subdomainInput, setSubdomainInput, onSubmit, isBusy, theme, onToggleTheme
}: SubdomainScreenProps) {
  return (
    <div className="ps-onboard">
      <div className="ps-onboard-bar">
        <div className="ps-sidebar-brand" style={{ padding: 0, border: 'none', margin: 0 }}>
          <div className="ps-brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="ps-brand-name">PortShare</div>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
      </div>
      <div className="ps-onboard-body">
        <div className="ps-onboard-card">
          <p className="ps-onboard-kicker">Step 1 of 2</p>
          <h1>Reserve your subdomain</h1>
          <p className="ps-onboard-text">
            This becomes your permanent public URL. You can expose a local port after claiming it.
          </p>
          <p className="ps-client-id">Client {session.id}</p>
          <form className="ps-onboard-form" onSubmit={onSubmit}>
            <div className="ps-input-wrap">
              <label className="ps-label" htmlFor="subdomain">Subdomain</label>
              <div className="ps-input-group">
                <input
                  id="subdomain"
                  className="ps-input ps-input-mono"
                  value={subdomainInput}
                  onChange={e => setSubdomainInput(e.target.value)}
                  placeholder="myapp"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isBusy}
                  autoFocus
                />
                <span className="ps-input-suffix">.{ROOT_DOMAIN}</span>
              </div>
            </div>
            <button className="ps-btn ps-btn-primary ps-btn-lg" type="submit" disabled={isBusy}>
              {isBusy ? 'Checking…' : 'Claim subdomain'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
