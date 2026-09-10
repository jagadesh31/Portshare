'use client';
import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

const REQUESTS = [
  { method: 'GET',    path: '/api/users',         status: 200, duration: '12ms' },
  { method: 'POST',   path: '/api/auth/login',    status: 201, duration: '48ms' },
  { method: 'GET',    path: '/api/products',      status: 200, duration: '8ms'  },
  { method: 'DELETE', path: '/api/posts/42',      status: 404, duration: '6ms'  },
  { method: 'GET',    path: '/webhook/stripe',    status: 200, duration: '31ms' },
];

export default function TerminalMockup({ samplePort, sampleUrl }: { samplePort: string; sampleUrl: string }) {
  const [mounted, setMounted] = useState(false);
  const [visibleRequests, setVisibleRequests] = useState<typeof REQUESTS>([]);
  const reqIdx = useRef(0);

  useEffect(() => {
    setMounted(true);

    // Stagger initial requests
    const timers: ReturnType<typeof setTimeout>[] = [];
    REQUESTS.forEach((req, i) => {
      timers.push(setTimeout(() => {
        setVisibleRequests(prev => [...prev, req]);
      }, 1400 + i * 600));
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const methodClass = (m: string) => {
    if (m === 'GET')    return 'terminal-req-method-get';
    if (m === 'POST')   return 'terminal-req-method-post';
    if (m === 'DELETE') return 'terminal-req-method-delete';
    return 'terminal-req-method-get';
  };

  const statusClass = (s: number) => {
    if (s < 300) return 'terminal-req-status-2xx';
    if (s < 500) return 'terminal-req-status-4xx';
    return 'terminal-req-status-5xx';
  };

  return (
    <div className="hero-terminal" aria-label="Live tunnel output">
      {/* Chrome */}
      <div className="terminal-chrome">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <p className="terminal-title">PortShare — tunnel</p>
      </div>

      {/* Body */}
      <div className="terminal-body">
        <div className="terminal-line">
          <span className="term-prompt">❯</span>
          <span className="term-cmd">portshare connect --port {samplePort}</span>
        </div>
        <br />
        <div className="terminal-line">
          <span className="term-dim">Starting PortShare client...</span>
        </div>
        <div className="terminal-line">
          <span className="term-dim">Authenticating identity</span>
        </div>
        {mounted && (
          <div className="terminal-line">
            <Check size={12} style={{ color: '#34D399', flexShrink: 0, marginTop: 2 }} />
            <span className="term-dim" style={{ color: '#34D399' }}>Tunnel established</span>
          </div>
        )}

        <br />

        <div className="terminal-line">
          <span className="term-cmd" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Public URL</span>
        </div>
        <div className="terminal-line" style={{ marginTop: -4 }}>
          <span className="term-url" style={{ fontWeight: 700 }}>{sampleUrl}</span>
        </div>

        <div className="terminal-line" style={{ marginTop: 4 }}>
          <span className="term-cmd">Forwarding</span>
          <span className="term-arrow">→</span>
          <span className="term-local">localhost:{samplePort}</span>
        </div>

        {/* Live request log */}
        {visibleRequests.length > 0 && (
          <div className="terminal-req-log">
            {visibleRequests.map((req, i) => (
              <div key={i} className="terminal-req-row" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={methodClass(req.method)}>{req.method}</span>
                <span className="terminal-req-path">{req.path}</span>
                <span className={statusClass(req.status)}>{req.status}</span>
                <span className="terminal-req-duration">{req.duration}</span>
              </div>
            ))}
          </div>
        )}

        <div className="terminal-line" style={{ marginTop: 8 }}>
          <span className="term-dim">Waiting for requests</span>
          {mounted && <span className="term-cursor" />}
        </div>
      </div>
    </div>
  );
}
