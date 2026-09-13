'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FeatureCheck from '../ui/FeatureCheck';

gsap.registerPlugin(ScrollTrigger);

const comparisonData = [
  { feature: 'Permanent subdomains', portshare: 'yes', ngrok: 'yes', cloudflare: 'yes' },
  { feature: 'Custom domains', portshare: 'yes', ngrok: 'Paid only', cloudflare: 'yes' },
  { feature: 'Request inspector', portshare: 'yes', ngrok: 'yes', cloudflare: 'no' },
  { feature: 'Desktop client', portshare: 'yes', ngrok: 'no', cloudflare: 'no' },
  { feature: 'Self-hostable', portshare: 'yes', ngrok: 'no', cloudflare: 'no' },
];

export default function ComparisonTable() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelector('.compare-intro'),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: { trigger: root, start: 'top 80%', once: true },
        },
      );

      gsap.fromTo(
        root.querySelectorAll('tbody tr'),
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power2.out',
          immediateRender: false,
          scrollTrigger: { trigger: root.querySelector('.table-shell'), start: 'top 85%', once: true },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="compare" className="compare" ref={ref}>
      <div className="compare-intro">
        <span className="eyebrow">Compare</span>
        <h2>Why PortShare</h2>
        <p>Same job as the big tools — without the rental tax.</p>
      </div>
      <div className="table-shell">
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
                <td className="portshare-cell"><FeatureCheck value={row.portshare} /></td>
                <td><FeatureCheck value={row.ngrok} /></td>
                <td><FeatureCheck value={row.cloudflare} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
