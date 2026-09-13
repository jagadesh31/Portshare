'use client';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

const REQUESTS = [
  { method: 'GET',    path: '/api/users',         status: 200, duration: '12ms' },
  { method: 'POST',   path: '/api/auth/login',    status: 201, duration: '48ms' },
  { method: 'GET',    path: '/api/products',      status: 200, duration: '8ms'  },
  { method: 'DELETE', path: '/api/posts/42',      status: 404, duration: '6ms'  },
  { method: 'GET',    path: '/webhook/razorpay',  status: 200, duration: '31ms' },
];

export default function TerminalMockup({ samplePort, sampleUrl }: { samplePort: string; sampleUrl: string }) {
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    REQUESTS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 1200 + i * 550));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const methodClass = (m: string) => {
    if (m === 'GET') return 'terminal-req-method-get';
    if (m === 'POST') return 'terminal-req-method-post';
    if (m === 'DELETE') return 'terminal-req-method-delete';
    return 'terminal-req-method-get';
  };

  const statusClass = (s: number) => {
    if (s < 300) return 'terminal-req-status-2xx';
    if (s < 500) return 'terminal-req-status-4xx';
    return 'terminal-req-status-5xx';
  };

  return (
    <div className="hero-terminal" aria-label="Tunnel output preview">
      <div className="terminal-chrome">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <p className="terminal-title">PortShare — tunnel</p>
      </div>

      <div className="terminal-body">
        <div className="terminal-static">
          <div className="terminal-line">
            <span className="term-prompt">❯</span>
            <span className="term-cmd">portshare connect --port {samplePort}</span>
          </div>
          <div className="terminal-line">
            <span className="term-dim">Starting PortShare client...</span>
          </div>
          <div className="terminal-line">
            {mounted ? (
              <>
                <Check size={12} style={{ color: '#34D399', flexShrink: 0 }} />
                <span style={{ color: '#34D399' }}>Tunnel established</span>
              </>
            ) : (
              <span className="term-dim">Authenticating identity</span>
            )}
          </div>
          <div className="terminal-line terminal-url-line">
            <span className="term-url">{sampleUrl}</span>
          </div>
          <div className="terminal-line">
            <span className="term-cmd">Forwarding</span>
            <span className="term-arrow">→</span>
            <span className="term-local">localhost:{samplePort}</span>
          </div>
        </div>

        <div className="terminal-req-log" aria-live="polite">
          {REQUESTS.map((req, i) => (
            <div
              key={req.path}
              className={`terminal-req-row ${i < visibleCount ? 'visible' : ''}`}
            >
              <span className={methodClass(req.method)}>{req.method}</span>
              <span className="terminal-req-path">{req.path}</span>
              <span className={statusClass(req.status)}>{req.status}</span>
              <span className="terminal-req-duration">{req.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
