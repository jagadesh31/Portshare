import ThemeToggle from '../ui/ThemeToggle'

type LoadingScreenProps = {
  statusMessage: string
  errorMessage: string
  onRetry: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function LoadingScreen({ statusMessage, errorMessage, onRetry, theme, onToggleTheme }: LoadingScreenProps) {
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
        <div className="ps-onboard-card" style={{ textAlign: 'center' }}>
          <div className="ps-loader-ring" style={{ margin: '0 auto 16px' }} />
          <p className="ps-onboard-kicker">Connecting</p>
          <h1>Preparing your tunnel</h1>
          <p className="ps-onboard-text" style={{ marginBottom: errorMessage ? 16 : 0 }}>{statusMessage}</p>
          {errorMessage && (
            <>
              <p className="ps-onboard-text" style={{ color: 'var(--red)' }}>{errorMessage}</p>
              <button type="button" className="ps-btn ps-btn-primary" onClick={onRetry}>
                Retry connection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
