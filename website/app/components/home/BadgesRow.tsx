import { Zap, Users, Shield, Code } from "lucide-react";

export default function BadgesRow() {
  return (
    <div className="badges-row">
      {[
        { icon: <Zap size={22} strokeWidth={2} />, title: "HTTP & HTTPS Tunneling", desc: "Expose any local port securely." },
        { icon: <Users size={22} strokeWidth={2} />, title: "Share with Anyone", desc: "Public URL, no complex setup." },
        { icon: <Shield size={22} strokeWidth={2} />, title: "Secure & Reliable", desc: "Built for developers, with security in mind." },
        { icon: <Code size={22} strokeWidth={2} />, title: "Webhooks & Testing", desc: "Test webhooks and integrations easily." },
      ].map((b) => (
        <div key={b.title} className="badge">
          <div className="badge-icon">{b.icon}</div>
          <div className="badge-content">
            <span className="badge-title">{b.title}</span>
            <span className="badge-desc">{b.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
