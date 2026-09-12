'use client';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('portshare-web-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portshare-web-theme', next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <a href="/" className="site-brand">
        <span className="site-brand-icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-inverse)" strokeWidth="2.6">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        PortShare
      </a>

      <nav className="header-nav" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <a className="nav-link" href="/#how-it-works">How it works</a>
        <a className="nav-link" href="/#features">Features</a>
        <a className="nav-link" href="/#stats">Stats</a>
        <a className="nav-link" href="/#compare">Compare</a>
        <a className="nav-link" href="/pricing">Pricing</a>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleTheme}
          className="nav-link"
          style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
        </button>
        <a
          href="https://github.com/jagadesh31/Portshare"
          target="_blank"
          rel="noreferrer"
          className="nav-link"
          style={{ padding: '6px 8px', display: 'flex', alignItems: 'center' }}
          title="GitHub"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
          </svg>
        </a>
        <a className="btn btn-primary" href="/download/portshare-desktop" style={{ padding: '8px 16px', fontSize: '0.85rem', marginLeft: '4px' }}>
          Download Free
        </a>
      </div>
    </header>
  );
}
