export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 0', marginTop: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>© {new Date().getFullYear()} PortShare. Built by <a href="https://kexoz.dev" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>Kexoz</a></span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
          <a href="/terms" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/privacy" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/abuse" style={{ color: 'var(--accent-red, #ef4444)', textDecoration: 'none', fontWeight: 500 }}>Report Abuse</a>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <a href="https://github.com/jagadesh31/Portshare" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
        <a href="https://twitter.com/kexoz" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Twitter / X</a>
        <a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</a>
        <a href="/download/portshare-desktop" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Download</a>
      </nav>
    </footer>
  );
}
