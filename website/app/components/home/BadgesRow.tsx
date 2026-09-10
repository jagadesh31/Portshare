import { Zap, Lock, Globe, Search, Monitor, Code } from "lucide-react";

export default function BadgesRow() {
  return (
    <div className="badges-row">
      {[
        { icon: <Zap size={16} />, text: "Zero-config setup" },
        { icon: <Lock size={16} />, text: "Permanent subdomains" },
        { icon: <Globe size={16} />, text: "Custom domains" },
        { icon: <Search size={16} />, text: "Request inspector" },
        { icon: <Monitor size={16} />, text: "Desktop GUI" },
        { icon: <Code size={16} />, text: "Open source client" },
      ].map((b) => (
        <span key={b.text} className="badge">
          <span className="badge-icon">{b.icon}</span>
          {b.text}
        </span>
      ))}
    </div>
  );
}
