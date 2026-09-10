import { Search, Globe, Tag, Monitor, Shield, Zap, Terminal, Clock } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';

export default function FeaturesGrid({ publicDomain }: { publicDomain: string }) {
  const features = [
    {
      icon: <Search size={22} />,
      tag: 'Built-in',
      title: 'Request Inspector',
      body: 'See every HTTP request hitting your tunnel in real-time — method, path, headers, status, and JSON body. Replay any request with one click.',
    },
    {
      icon: <Globe size={22} />,
      tag: 'Permanent',
      title: 'Persistent Subdomains',
      body: `Your subdomain on ${publicDomain} is yours forever. Set it once, configure webhooks and share with clients — it never changes.`,
    },
    {
      icon: <Tag size={22} />,
      tag: 'Pro',
      title: 'Custom Domains',
      body: 'Map tunnel.yourdomain.com to your local server via a CNAME record. Your clients never see a generic subdomain.',
    },
    {
      icon: <Monitor size={22} />,
      tag: 'Desktop',
      title: 'Native Desktop App',
      body: 'A premium, minimal GUI that lives in your menubar. Toggle tunnels, inspect requests, manage domains — all without a terminal.',
    },
    {
      icon: <Terminal size={22} />,
      tag: 'Zero Install',
      title: 'SSH Tunnel Support',
      body: 'Use any machine\'s native SSH: ssh -R 80:localhost:3000 portshare.kexoz.dev. No client install required anywhere.',
    },
    {
      icon: <Shield size={22} />,
      tag: 'Security',
      title: 'Google Auth Wall',
      body: 'Protect tunnels with Google OAuth in one click. Only authorized Google accounts can access your tunnel URL.',
    },
    {
      icon: <Zap size={22} />,
      tag: 'Fast',
      title: 'Persistent WebSocket',
      body: 'A single WebSocket connection handles all traffic with automatic reconnection, pings and exponential backoff.',
    },
    {
      icon: <Clock size={22} />,
      tag: 'History',
      title: 'Request Replay',
      body: 'Scroll back through your request history and replay any call instantly. Perfect for debugging flaky webhooks.',
    },
  ];

  return (
    <section id="features-section">
      <SectionHeader
        id="features"
        eyebrow="Features"
        title="Everything developers need"
        description="Built by developers for developers — every feature reduces friction, not adds it."
      />
      <div className="features-grid" style={{ marginTop: '40px' }}>
        {features.map((f) => (
          <article key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <span className="feature-tag">{f.tag}</span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
