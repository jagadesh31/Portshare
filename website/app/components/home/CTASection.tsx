export default function CTASection() {
  return (
    <section style={{ marginBottom: '80px' }}>
      <div className="cta-section">
        <h2>Start tunneling in 30 seconds</h2>
        <p>
          Download the desktop app or use our zero-install SSH method.
          Free tier includes 1GB/month — no credit card required.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href="/download/portshare-desktop" style={{ padding: '11px 22px', fontSize: '0.95rem' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Free
          </a>
          <a className="btn btn-ghost" href="https://github.com/jagadesh31/Portshare" target="_blank" rel="noreferrer" style={{ padding: '11px 22px', fontSize: '0.95rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
            View on GitHub
          </a>
        </div>
        <p style={{ marginTop: 20, marginBottom: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
          Also available via{' '}
          <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: '5px', fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--accent-bright)' }}>
            ssh -R 80:localhost:3000 portshare.kexoz.dev
          </code>
          {' '}— no install needed.
        </p>
      </div>
    </section>
  );
}
