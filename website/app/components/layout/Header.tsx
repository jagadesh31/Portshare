'use client';
export default function Header({ style }: { style?: React.CSSProperties }) {
  return (
    <header className="site-header" style={style}>
      <a href="/" className="site-brand" style={{ textDecoration: 'none' }}>PortShare</a>
      <nav className="header-nav">
        <a className="nav-link" href="/#how-it-works">How it works</a>
        <a className="nav-link" href="/#features">Features</a>
        <a className="nav-link" href="/#compare">Compare</a>
        <a className="nav-link" href="/pricing">Pricing</a>
        <a className="btn btn-primary" href="/download/portshare-desktop" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>Download</a>
      </nav>
    </header>
  );
}
