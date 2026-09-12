import { Search, Globe, Tag, Monitor, Shield, Zap, Terminal, Clock } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';

export default function FeaturesGrid({ publicDomain }: { publicDomain: string }) {
  const features = [
    {
      icon: <Search size={22} />,
      tag: 'Built-in',
      title: 'Request Inspector',
      body: 'See every HTTP request hitting your tunnel in real time — method, path, status, and duration.',
    },
    {
      icon: <Globe size={22} />,
      tag: 'Permanent',
      title: 'Persistent Subdomains',
      body: `Your subdomain is yours forever. Set it once, share it, and it never changes.`,
    },
    {
      icon: <Tag size={22} />,
      tag: 'Pro',
      title: 'Custom Domains',
      body: 'Map tunnel.yourdomain.com via a CNAME record for a fully white-labeled experience.',
    },
    {
      icon: <Monitor size={22} />,
      tag: 'Desktop',
      title: 'Native GUI',
      body: 'A premium, minimal app that lives in your menubar. Manage tunnels without a terminal.',
    },
    {
      icon: <Terminal size={22} />,
      tag: 'Zero Install',
      title: 'SSH Tunnels',
      body: `Use native SSH: ssh -R 80:localhost:3000 ${publicDomain}. No extra client required.`,
    },
    {
      icon: <Shield size={22} />,
      tag: 'Security',
      title: 'Google Auth Wall',
      body: 'Protect endpoints with Google OAuth. Only authorized accounts can access your tunnel.',
    },
    {
      icon: <Zap size={22} />,
      tag: 'Fast',
      title: 'Reliable Connection',
      body: 'Auto-reconnecting WebSockets handle traffic with exponential backoff.',
    },
    {
      icon: <Clock size={22} />,
      tag: 'History',
      title: 'Session log',
      body: 'Keep a live log of traffic for the current session while you debug webhooks and APIs.',
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
