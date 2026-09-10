export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 0', marginTop: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
      <span>© {new Date().getFullYear()} PortShare. Built by <a href="https://github.com/jagadesh31" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>jagadesh31</a></span>
      <nav style={{ display: 'flex', gap: '16px' }}>
        <a href="https://github.com/jagadesh31/Portshare" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
        <a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</a>
        <a href="/download/portshare-desktop" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Download</a>
      </nav>
    </footer>
  );
}
