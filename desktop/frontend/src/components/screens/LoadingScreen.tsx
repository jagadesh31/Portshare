type LoadingScreenProps = {
  statusMessage: string
  errorMessage: string
  onRetry: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function LoadingScreen({ statusMessage, errorMessage, onRetry, theme, onToggleTheme }: LoadingScreenProps) {
  return (
    <div className="ps-splash">
      <button
        type="button"
        className="ps-splash-theme"
        onClick={onToggleTheme}
        title="Toggle theme"
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div className={`ps-splash-inner ${errorMessage ? 'has-error' : ''}`}>
        <div className="ps-splash-logo-wrap">
          <img src="./logo.svg" alt="PortShare" className="ps-splash-logo" width={72} height={72} />
          <span className="ps-splash-ring" />
        </div>
        <div className="ps-splash-brand">PortShare</div>
        <p className="ps-splash-status">{errorMessage || statusMessage}</p>
        {errorMessage && (
          <button type="button" className="ps-btn ps-btn-primary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
