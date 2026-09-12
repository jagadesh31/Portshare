'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  publicDomain: string;
  sampleSubdomain: string;
  samplePort: string;
};

const LOG = [
  { method: 'GET', path: '/api/users', status: 200, ms: 12 },
  { method: 'POST', path: '/api/auth/login', status: 201, ms: 48 },
  { method: 'GET', path: '/webhook/stripe', status: 200, ms: 31 },
  { method: 'DELETE', path: '/api/posts/42', status: 404, ms: 6 },
  { method: 'GET', path: '/api/products', status: 200, ms: 9 },
];

const FEATURES = [
  'Live tunnel status',
  'Request inspector',
  'Domain controls',
];

export default function ProductPreview({ publicDomain, sampleSubdomain, samplePort }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);
  const publicUrl = `https://${sampleSubdomain}.${publicDomain}`;

  useEffect(() => {
    const clock = window.setInterval(() => setTick((v) => v + 1), 1400);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll('[data-reveal]'),
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: root, start: 'top 78%' },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const visible = LOG.slice(0, 4 + (tick % 2));

  return (
    <section id="product" className="product-section" ref={rootRef}>
      <div className="shell product-layout">
        <div className="product-copy" data-reveal>
          <span className="eyebrow">Desktop app</span>
          <h2>Tunnel console</h2>
          <p>Status, forwarding, and live request traffic in one native window.</p>
          <ul className="product-features">
            {FEATURES.map((item) => (
              <li key={item}>
                <span className="check" aria-hidden>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="product-stage" data-reveal>
          <div className="console">
            <div className="console-bar">
              <div className="traffic" aria-hidden>
                <i className="red" />
                <i className="yellow" />
                <i className="green" />
              </div>
              <p className="console-title">PortShare — Desktop</p>
              <div className="console-live">
                <i />
                Connected
              </div>
            </div>

            <div className="console-body static">
              <div className="console-url">
                <span>Public</span>
                <code>{publicUrl}</code>
                <span className="chip">Copy</span>
              </div>

              <div className="console-kpis">
                <div>
                  <span>Forwarding</span>
                  <strong>localhost:{samplePort}</strong>
                </div>
                <div>
                  <span>Requests</span>
                  <strong>{148 + (tick % 11)}</strong>
                </div>
                <div>
                  <span>Latency</span>
                  <strong>{7 + (tick % 5)}ms</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="ok">Live</strong>
                </div>
              </div>

              <div className="console-log">
                {visible.map((row, i) => (
                  <div key={`${row.path}-${i}`} className="log-row" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className={`m-${row.method.toLowerCase()}`}>{row.method}</span>
                    <span className="path">{row.path}</span>
                    <span className={row.status < 400 ? 'ok' : 'bad'}>{row.status}</span>
                    <span className="ms">{row.ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
