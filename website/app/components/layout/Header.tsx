'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import PortShareLogo from '../brand/PortShareLogo';
import DownloadButton from '../download/DownloadButton';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(y > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const apply = (value: 'light' | 'dark') => {
      setTheme(value);
      document.documentElement.dataset.theme = value;
    };

    const saved = localStorage.getItem('portshare-web-theme');
    if (saved === 'light' || saved === 'dark') {
      apply(saved);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(prefersDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portshare-web-theme', next);
    document.documentElement.dataset.theme = next;
    // Force paint + ScrollTrigger refresh after theme tokens swap.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  return (
    <div className={`header-rail ${scrolled ? 'scrolled' : ''}`}>
      <header className="site-header">
        <a href="/" className="site-brand">
          <PortShareLogo size={26} />
          <span>PortShare</span>
        </a>

        <nav className="header-nav" aria-label="Primary">
          <a className="nav-link" href="/#how-it-works">How it works</a>
          <a className="nav-link" href="/#product">Product</a>
          <a className="nav-link" href="/#compare">Compare</a>
          <a className="nav-link" href="/pricing">Pricing</a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-btn"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
          </button>
          <a
            href="https://github.com/jagadesh31/Portshare"
            target="_blank"
            rel="noreferrer"
            className="icon-btn"
            title="GitHub"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
          </a>
          <DownloadButton className="btn btn-primary header-download">
            Download
          </DownloadButton>
        </div>
      </header>
    </div>
  );
}
