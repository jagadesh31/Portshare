"use client";

import { useEffect, useState } from "react";

const requiredPublicEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
  const samplePort = requiredPublicEnv(process.env.NEXT_PUBLIC_SAMPLE_PORT, "NEXT_PUBLIC_SAMPLE_PORT");
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;

  useEffect(() => {
    const nextTheme = window.localStorage.getItem("portshare-theme") === "dark" ? "dark" : "light";
    // Theme storage is client-only; apply it after hydration to avoid markup mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem("portshare-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  return (
    <div className="landing-wrap">
      <div className="landing-aura landing-aura-left" aria-hidden="true" />
      <div className="landing-aura landing-aura-right" aria-hidden="true" />

      <main className="landing-main">
        <header className="site-header">
          <span className="site-brand">PortShare</span>
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </header>
        <section className="hero-block">
          <p className="hero-tag">PortShare Desktop</p>
          <h1>Expose localhost with a public subdomain from your own domain.</h1>
          <p className="hero-copy">
            PortShare is a desktop tunnel client that creates a unique identity for every user,
            reserves a subdomain, and forwards any selected local port to the internet through a
            clean public URL.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="/download/portshare-desktop">
              Download Desktop App
            </a>
            <a className="btn btn-ghost" href="#how-it-works">
              See desktop flow
            </a>
          </div>

          <div className="hero-preview" aria-label="sample tunnel output">
            <p className="preview-label">Assigned URL</p>
            <code>{sampleUrl}</code>
            <span>Forwarding -&gt; localhost:{samplePort}</span>
          </div>
        </section>

        <section id="how-it-works" className="flow-grid">
          <article className="flow-card">
            <p className="flow-step">01</p>
            <h2>Identity bootstrap</h2>
            <p>
              On first launch, the desktop app requests a random client ID from your server and
              stores it locally for future sessions.
            </p>
          </article>

          <article className="flow-card">
            <p className="flow-step">02</p>
            <h2>Subdomain reservation</h2>
            <p>
              Users choose a subdomain, the app checks availability, then binds that name to their
              client identity.
            </p>
          </article>

          <article className="flow-card">
            <p className="flow-step">03</p>
            <h2>Port exposure dashboard</h2>
            <p>
              The desktop dashboard shows the public URL at the top with a one-click copy button
              and updates the exposed local port instantly.
            </p>
          </article>
        </section>

        <section className="benefit-grid">
          <article className="benefit-card">
            <h3>Built for quick sharing</h3>
            <p>
              Move from localhost to a public URL in seconds for demos, webhook testing, and
              client previews.
            </p>
          </article>

          <article className="benefit-card">
            <h3>Consistent address</h3>
            <p>
              Each user keeps a memorable URL pattern like
              <strong> your-name.{publicDomain}</strong> that can be copied from the app bar.
            </p>
          </article>

          <article className="benefit-card">
            <h3>Server-controlled routing</h3>
            <p>
              The desktop app only updates identity, subdomain, and port while your backend
              controls routing and security.
            </p>
          </article>
        </section>

        <section className="cta-band">
          <h2>Install the desktop client and start tunneling now.</h2>
          <a className="btn btn-primary" href="/download/portshare-desktop">
            Download PortShare Desktop
          </a>
        </section>
      </main>
    </div>
  );
}
