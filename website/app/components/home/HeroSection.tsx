'use client';
import { useState, useEffect } from 'react';
import TerminalMockup from './TerminalMockup';

type Props = {
  publicDomain: string;
  sampleSubdomain: string;
  samplePort: string;
};

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 1800;
    const start = Date.now();
    const startVal = Math.max(0, target - Math.floor(target * 0.15));

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target]);

  const formatted = value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(1)}K`
    : value.toLocaleString();

  return <span>{formatted}{suffix}</span>;
}

export default function HeroSection({ publicDomain, sampleSubdomain, samplePort }: Props) {
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;
  const [liveRequests, setLiveRequests] = useState(0);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_PORTSHARE_API_BASE;
    if (!apiBase) return;
    fetch(`${apiBase}/stats/global`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.totalRequests) setLiveRequests(Number(data.totalRequests) || 0);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="hero-block">
      <div className="hero-content">
        {/* Eyebrow */}
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-pill">
            <span className="hero-eyebrow-dot" />
            Open Source
          </span>
          <span className="hero-eyebrow-text">Free to use &amp; self-host</span>
        </div>

        {/* Headline */}
        <h1>
          Expose localhost with a{' '}
          <span className="gradient-text">public URL</span>{' '}
          in seconds.
        </h1>

        {/* Subtext */}
        <p className="hero-copy">
          PortShare gives your local dev server a permanent public subdomain instantly.
          Share demos, test webhooks, and collaborate on localhost — no config, no friction.
        </p>

        {/* Actions */}
        <div className="hero-actions">
          <a className="btn btn-primary" href="/download/portshare-desktop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Desktop App
          </a>
          <a className="btn btn-ghost" href="#how-it-works">
            How it works
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        {/* Platform icons */}
        <div className="hero-platforms">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
          <span>Windows</span>
          <span style={{ color: 'var(--border-bright)' }}>·</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-soft)', letterSpacing: '-0.01em' }}>
            ssh -R also supported
          </span>
        </div>
      </div>

      {/* Terminal */}
      <div className="hero-visual">
        <TerminalMockup samplePort={samplePort} sampleUrl={sampleUrl} />
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value live">
            <AnimatedCounter target={liveRequests} />
          </span>
          <span className="stat-label">Requests Proxied</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <span className="stat-value">HTTPS</span>
          <span className="stat-label">Public URLs</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <span className="stat-value">1 GB</span>
          <span className="stat-label">Free monthly cap</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <span className="stat-value">Open</span>
          <span className="stat-label">Source client</span>
        </div>

        <div className="live-indicator" style={{ marginLeft: 'auto' }}>
          <span className="live-dot" />
          Live data
        </div>
      </div>
    </section>
  );
}
