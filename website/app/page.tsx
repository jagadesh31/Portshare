"use client";

import { useEffect, useState } from "react";
import { 
  Check, 
  X, 
  Zap, 
  Lock, 
  Globe, 
  Search, 
  Monitor, 
  Code,
  Tag
} from "lucide-react";

const requiredPublicEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const publicDomain = requiredPublicEnv(
    process.env.NEXT_PUBLIC_PORTSHARE_DOMAIN,
    "NEXT_PUBLIC_PORTSHARE_DOMAIN",
  );
  requiredPublicEnv(
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL,
    "NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL",
  );
  const sampleSubdomain = requiredPublicEnv(
    process.env.NEXT_PUBLIC_SAMPLE_SUBDOMAIN,
    "NEXT_PUBLIC_SAMPLE_SUBDOMAIN",
  );
  const samplePort = requiredPublicEnv(
    process.env.NEXT_PUBLIC_SAMPLE_PORT,
    "NEXT_PUBLIC_SAMPLE_PORT",
  );
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const comparisonData = [
    {
      feature: "Permanent subdomains",
      portshare: "yes",
      ngrok: "yes",
      cloudflare: "yes",
    },
    {
      feature: "Custom domain (BYOD)",
      portshare: "yes",
      ngrok: "Paid only",
      cloudflare: "yes",
    },
    {
      feature: "Request inspector + replay",
      portshare: "yes",
      ngrok: "yes",
      cloudflare: "no",
    },
    {
      feature: "Desktop GUI client",
      portshare: "yes",
      ngrok: "no",
      cloudflare: "no",
    },
    {
      feature: "Zero-config setup",
      portshare: "yes",
      ngrok: "Partial",
      cloudflare: "Partial",
    },
    {
      feature: "Self-hostable",
      portshare: "yes",
      ngrok: "no",
      cloudflare: "no",
    },
    {
      feature: "Open source client",
      portshare: "yes",
      ngrok: "no",
      cloudflare: "no",
    },
    {
      feature: "Generous free tier",
      portshare: "yes",
      ngrok: "Limited",
      cloudflare: "Limited",
    },
  ];

  const renderCell = (val: string) => {
    if (val === "yes") return <span className="check-yes"><Check size={18} /></span>;
    if (val === "no") return <span className="check-no"><X size={18} /></span>;
    return <span className="check-partial">{val}</span>;
  };

  return (
    <div className="landing-wrap">
      <main className="landing-main">
        {/* ── HEADER ── */}
        <header className="site-header">
          <span className="site-brand">PortShare</span>
          <nav className="header-nav">
            <a className="nav-link" href="#how-it-works">How it works</a>
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#compare">Compare</a>
            <a className="nav-link" href="/pricing">Pricing</a>
            <a className="btn btn-primary" href="/download/portshare-desktop" style={{ padding: "8px 16px", fontSize: "0.84rem" }}>
              Download
            </a>
          </nav>
        </header>

        {/* ── HERO ── */}
        <section className="hero-block">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Developer-first localhost tunneling
          </div>

          <h1>
            Expose localhost with a <span className="accent-word">public URL</span> in seconds.
          </h1>

          <p className="hero-copy">
            PortShare gives your local dev server a permanent public subdomain. Ship demos,
            test webhooks, and collaborate on localhost — with a desktop client that just works.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="/download/portshare-desktop">
              Download Desktop App
            </a>
            <a className="btn btn-ghost" href="#how-it-works">
              See how it works →
            </a>
          </div>

          {/* Terminal mockup */}
          <div className="hero-terminal" aria-label="Sample tunnel output">
            <div className="terminal-chrome">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <p className="terminal-title">portshare — tunnel</p>
            </div>

            <div className="terminal-line">
              <span className="term-prompt">$</span>
              <span className="term-cmd">portshare connect --port {samplePort}</span>
            </div>
            <div className="terminal-line">
              <span className="term-dim">→</span>
              <span className="term-dim">Connecting to PortShare server...</span>
            </div>
            <div className="terminal-line">
              <span className="term-status-ok"><Check size={14} className="inline-icon" /></span>
              <span className="term-dim">Tunnel established</span>
            </div>
            <div className="terminal-line">
              <span className="term-dim">  Public URL</span>
              <span className="term-arrow">→</span>
              <span className="term-url">{sampleUrl}</span>
            </div>
            <div className="terminal-line">
              <span className="term-dim">  Forwarding</span>
              <span className="term-arrow">→</span>
              <span className="term-local">http://localhost:{samplePort}</span>
            </div>
            <div className="terminal-line">
              <span className="term-dim">  Press Ctrl+C to stop</span>
              {mounted && <span className="term-cursor" />}
            </div>
          </div>

          {/* Badges row */}
          <div className="badges-row">
            {[
              { icon: <Zap size={16} />, text: "Zero-config setup" },
              { icon: <Lock size={16} />, text: "Permanent subdomains" },
              { icon: <Globe size={16} />, text: "Custom domains" },
              { icon: <Search size={16} />, text: "Request inspector" },
              { icon: <Monitor size={16} />, text: "Desktop GUI" },
              { icon: <Code size={16} />, text: "Open source client" },
            ].map((b) => (
              <span key={b.text} className="badge">
                <span className="badge-icon">{b.icon}</span>
                {b.text}
              </span>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <div className="section-header" id="how-it-works">
          <span className="section-eyebrow">— How it works</span>
          <h2>Up and running in 30 seconds</h2>
          <p>Three simple steps from install to public URL. No DNS wrangling, no YAML, no tears.</p>
        </div>

        <section className="flow-grid">
          {[
            {
              step: "01",
              title: "Install & identify",
              body: "Download the desktop app or grab the CLI. On first launch, PortShare generates a unique client identity and stores it locally for future sessions.",
            },
            {
              step: "02",
              title: "Claim your subdomain",
              body: `Pick a memorable name — like ${sampleSubdomain}.${publicDomain}. It's yours permanently. No more broken webhook URLs when you restart.`,
            },
            {
              step: "03",
              title: "Expose any port",
              body: "Enter the local port your dev server is running on. Your app is now live at your public URL — copy it and share anywhere.",
            },
          ].map((card) => (
            <article key={card.step} className="flow-card">
              <span className="flow-step-badge">{card.step}</span>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </section>

        {/* ── FEATURES ── */}
        <div className="section-header" id="features">
          <span className="section-eyebrow">— Features</span>
          <h2>Everything you need, nothing you don't</h2>
          <p>Built by developers for developers — every feature is designed to reduce friction.</p>
        </div>

        <section className="features-grid">
          {[
            {
              icon: <Search size={24} />,
              tag: "Built-in",
              title: "Request Inspector",
              body: "See every HTTP request hitting your tunnel in real-time — method, path, headers, and JSON body. Replay any request with one click for faster webhook debugging.",
            },
            {
              icon: <Globe size={24} />,
              tag: "Persistent",
              title: "Permanent Subdomains",
              body: `Your subdomain on ${publicDomain} is yours for life. Set it once, use it forever. Share it with clients, configure it in your webhooks dashboard and never change it again.`,
            },
            {
              icon: <Tag size={24} />,
              tag: "Pro",
              title: "Bring Your Own Domain",
              body: "Map any domain you own (like dev.yourcompany.com) to your tunnel with a simple CNAME record. Your clients never need to know you're running locally.",
            },
            {
              icon: <Monitor size={24} />,
              tag: "Desktop + CLI",
              title: "Native Desktop Client",
              body: "A beautiful, minimal desktop GUI that lives in your menubar. Toggle tunnels on/off with a switch, see live stats, and inspect requests — all without touching a terminal.",
            },
          ].map((f) => (
            <article key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <span className="feature-tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </section>

        {/* ── COMPARISON ── */}
        <div className="section-header" id="compare">
          <span className="section-eyebrow">— Compare</span>
          <h2>Why choose PortShare?</h2>
          <p>See how we stack up against the established alternatives.</p>
        </div>

        <section className="comparison-section">
          <div className="table-container">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="feature-col">Feature</th>
                  <th className="portshare-col">PortShare</th>
                  <th>ngrok</th>
                  <th>Cloudflare</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row) => (
                  <tr key={row.feature}>
                    <td className="feature-name">{row.feature}</td>
                    <td className="portshare-cell">{renderCell(row.portshare)}</td>
                    <td>{renderCell(row.ngrok)}</td>
                    <td>{renderCell(row.cloudflare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
