type GateScreenProps = {
  onLogin: () => void
  onSkip: () => void
  verifying: boolean
  gauthEnabled: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function GateScreen({ onLogin, onSkip, verifying, gauthEnabled, theme, onToggleTheme }: GateScreenProps) {
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

      <div className="ps-splash-inner">
        <div className="ps-splash-logo-wrap">
          <img src="./logo.svg" alt="PortShare" className="ps-splash-logo" width={72} height={72} />
          <span className="ps-splash-ring" />
        </div>
        <div className="ps-splash-brand">PortShare</div>
        <p className="ps-splash-status" style={{ maxWidth: 340 }}>
          {verifying
            ? 'Waiting for Google sign-in in your browser…'
            : gauthEnabled
              ? 'Verify with Google to unlock 1 GB of free bandwidth. Guests get 100 MB.'
              : 'Google verification is not enabled on this server. Continue as guest with 100 MB.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, marginTop: 8 }}>
          {gauthEnabled && (
            <button
              type="button"
              className="ps-btn ps-btn-primary"
              onClick={onLogin}
              disabled={verifying}
              style={{ width: '100%' }}
            >
              {verifying ? 'Check your browser…' : 'Login with Google · 1 GB free'}
            </button>
          )}
          {!verifying && (
            <button
              type="button"
              className={gauthEnabled ? 'ps-btn ps-btn-ghost' : 'ps-btn ps-btn-primary'}
              onClick={onSkip}
              style={{ width: '100%' }}
            >
              {gauthEnabled ? 'Skip for now · 100 MB guest' : 'Continue as guest · 100 MB'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 16, maxWidth: 320 }}>
          One click, no password. Upgrading to Pro later unlocks 100 GB, custom domains and priority support.
        </p>
      </div>
    </div>
  )
}
