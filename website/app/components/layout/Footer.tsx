import PortShareLogo from '../brand/PortShareLogo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand-row">
        <a href="/" className="site-brand footer-brand-link">
          <PortShareLogo size={24} />
          PortShare
        </a>
        <span className="footer-copy-inline">
          © {new Date().getFullYear()} · Built by{' '}
          <a href="https://kexoz.dev" target="_blank" rel="noreferrer">Kexoz</a>
        </span>
      </div>
      <nav className="footer-links">
        <a href="/terms" className="footer-link">Terms</a>
        <a href="/privacy" className="footer-link">Privacy</a>
        <a href="/abuse" className="footer-link">Report abuse</a>
        <a href="https://github.com/jagadesh31/Portshare" target="_blank" rel="noreferrer" className="footer-link">GitHub</a>
        <a href="/pricing" className="footer-link">Pricing</a>
      </nav>
    </footer>
  );
}
