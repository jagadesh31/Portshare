'use client';

export default function Header({ style }: { style?: React.CSSProperties }) {
  return (
    <header className="site-header" style={style}>
      <a href="/" className="site-brand" style={{ textDecoration: 'none' }}>PortShare</a>
      
      <nav className="header-nav" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <a className="nav-link" href="/#how-it-works">How it works</a>
        <a className="nav-link" href="/#features">Features</a>
        <a className="nav-link" href="/#compare">Compare</a>
        <a className="nav-link" href="/pricing">Pricing</a>
        <a className="nav-link" href="/docs">Docs</a>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <a href="https://github.com/jagadesh31/Portshare" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
        </a>
        <a className="btn btn-primary" href="/download/portshare-desktop" style={{ padding: '10px 20px', fontSize: '0.9rem', borderRadius: '8px' }}>Download</a>
      </div>
    </header>
  );
}
