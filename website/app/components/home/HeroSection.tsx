import TerminalMockup from "./TerminalMockup";
import BadgesRow from "./BadgesRow";

export default function HeroSection({ publicDomain, sampleSubdomain, samplePort }: { publicDomain: string, sampleSubdomain: string, samplePort: string }) {
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;
  return (
    <section className="hero-block">
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-pill"><span className="hero-eyebrow-dot" /> Open source</span>
          <span className="hero-eyebrow-text">Self-host or use locally</span>
        </div>

        <h1>
          Expose localhost with a public URL in seconds.
        </h1>

        <p className="hero-copy">
          PortShare gives your local development server a permanent public subdomain. Share demos, test webhooks, and collaborate on localhost — with a lightweight desktop client.
        </p>

        <div className="hero-actions">
          <a className="btn btn-primary" href="/download/portshare-desktop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Desktop App
          </a>
          <a className="btn btn-ghost" href="#how-it-works">
            See how it works →
          </a>
        </div>

        <div className="hero-platforms" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" style={{display: 'none'}}/><path d="M17.05 20.28c-.98.95-2.05 1.8-3.08 2.73-.24.22-.51.19-.74-.01-1.12-.96-2.28-1.87-3.41-2.82-.14-.11-.27-.33-.27-.51.01-4.04 0-8.08.01-12.12 0-.32.14-.52.41-.69 1.1-.69 2.22-1.35 3.32-2.03.22-.14.47-.14.69 0 1.1.68 2.21 1.34 3.31 2.03.27.17.41.37.41.69.01 4.04 0 8.08.01 12.12 0 .2-.11.42-.25.55-.14.12-.35.13-.53 0l-3.32-2.02-3.32 2.02c-.17.11-.38.11-.53 0z" style={{display:'none'}}/><path d="M16.14 16.63c-.34-.84-1-1.42-1.85-1.77.72-.45 1.25-1.07 1.42-1.92-.85.34-1.62.77-2.37 1.25-.79-.53-1.66-.96-2.57-1.3-.22.95-.27 1.9-.11 2.85-1.03.45-1.93.99-2.73 1.63.38.86 1.05 1.45 1.9 1.83-.8.49-1.57 1.07-2.22 1.76 1.07.41 2.18.66 3.32.74v-1.6c0-.52.3-1.01.76-1.28l1.45-.85 1.45.85c.46.27.76.76.76 1.28v1.6c1.17-.08 2.3-.35 3.39-.77-.63-.68-1.36-1.26-2.14-1.74.83-.37 1.49-.94 1.87-1.77zM11.66 8.52c.22-.05.45-.06.68 0 .5.14.88.52 1.02 1.02.05.23.05.46 0 .68-.14.5-.52.88-1.02 1.02-.23.05-.46.05-.68 0-.5-.14-.88-.52-1.02-1.02-.05-.23-.05-.46 0-.68.14-.5.52-.88 1.02-1.02z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20.5C12 20.5 15 17 15 13C15 9.13401 11.866 6 8 6C6.13401 6 4 9.13401 4 13C4 17 7 20.5 7 20.5M12 20.5C12 20.5 9 17 9 13C9 9.13401 12.134 6 16 6C17.866 6 20 9.13401 20 13C20 17 17 20.5 17 20.5M12 20.5V13M12 4V2"/></svg>
          <span>Available for Windows, macOS and Linux</span>
        </div>
      </div>

      <div className="hero-visual">
        <TerminalMockup samplePort={samplePort} sampleUrl={sampleUrl} />
      </div>
      
      <div className="hero-badges-wrapper">
        <BadgesRow />
      </div>
    </section>
  );
}
