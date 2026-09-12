'use client';
import { useEffect, useState, useRef } from 'react';

type Stats = {
  totalRequests: number;
  activeTunnels: number;
  developers: number;
  dataProxiedGB: number;
};

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (value === 0) return;
    const start = Date.now();
    const from = startRef.current;
    const duration = 1200;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (p < 1) requestAnimationFrame(tick);
      else startRef.current = value;
    };
    requestAnimationFrame(tick);
  }, [value]);

  if (decimals > 0) return <>{display.toFixed(decimals)}</>;
  if (display >= 1_000_000) return <>{(display / 1_000_000).toFixed(1)}M</>;
  if (display >= 1_000) return <>{(display / 1_000).toFixed(1)}K</>;
  return <>{Math.floor(display).toLocaleString()}</>;
}

export default function LiveStatsSection() {
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    activeTunnels: 0,
    developers: 0,
    dataProxiedGB: 0,
  });

  // Poll the API for live stats every 10s
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_PORTSHARE_API_BASE;
    if (!apiBase) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`${apiBase}/stats/global`);
        if (!res.ok) return;
        const data = await res.json();
        setStats(prev => ({
          totalRequests: data.totalRequests ?? prev.totalRequests,
          activeTunnels: data.activeTunnels ?? prev.activeTunnels,
          developers:    data.developers    ?? prev.developers,
          dataProxiedGB: data.dataProxiedGB ?? prev.dataProxiedGB,
        }));
      } catch { /* fail silently, use fallback */ }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="stats" style={{ marginBottom: '140px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span className="section-eyebrow">Live Stats</span>
        <h2 style={{ margin: '12px 0 8px', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-strong)' }}>
          Trusted by developers worldwide
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '48ch', margin: '0 auto', lineHeight: 1.65, fontSize: '1rem' }}>
          Real-time numbers from our global infrastructure — updated every 10 seconds.
        </p>
      </div>

      <div className="live-stats-section">
        <div className="live-stats-grid">
          <div className="live-stat-item">
            <div className="live-stat-num green">
              <AnimatedNumber value={stats.totalRequests} />
            </div>
            <div className="live-stat-label">Requests Proxied</div>
            <div className="live-stat-sub">Since launch</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-num accent">
              <AnimatedNumber value={stats.activeTunnels} />
            </div>
            <div className="live-stat-label">Active Tunnels</div>
            <div className="live-stat-sub">Right now</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-num cyan">
              <AnimatedNumber value={stats.developers} />
            </div>
            <div className="live-stat-label">Developers</div>
            <div className="live-stat-sub">This month</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-num">
              <AnimatedNumber value={stats.dataProxiedGB} decimals={1} />
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>GB</span>
            </div>
            <div className="live-stat-label">Data Proxied</div>
            <div className="live-stat-sub">This month</div>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>Live — updates every 10s</span>
        </div>
      </div>
    </section>
  );
}
