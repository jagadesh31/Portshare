import { Search, Globe, Tag, Monitor } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";

export default function FeaturesGrid({ publicDomain }: { publicDomain: string }) {
  return (
    <>
      <SectionHeader 
        id="features"
        eyebrow="Features"
        title="Everything you need, nothing you don't"
        description="Built by developers for developers — every feature is designed to reduce friction."
      />
      <section className="features-grid">
        {[
          {
            icon: <Search size={24} />,
            tag: "Built-in",
            title: "Request Inspector",
            body: "See every HTTP request hitting your tunnel in real-time — method, path, headers, and JSON body. Replay any request with one click for faster webhook debugging.",
          },
          {
            icon: <Globe size={24} />,
            tag: "Persistent",
            title: "Permanent Subdomains",
            body: `Your subdomain on ${publicDomain} is yours for life. Set it once, use it forever. Share it with clients, configure it in your webhooks dashboard and never change it again.`,
          },
          {
            icon: <Tag size={24} />,
            tag: "Pro",
            title: "Bring Your Own Domain",
            body: "Map any domain you own (like dev.yourcompany.com) to your tunnel with a simple CNAME record. Your clients never need to know you're running locally.",
          },
          {
            icon: <Monitor size={24} />,
            tag: "Desktop + CLI",
            title: "Native Desktop Client",
            body: "A beautiful, minimal desktop GUI that lives in your menubar. Toggle tunnels on/off with a switch, see live stats, and inspect requests — all without touching a terminal.",
          },
        ].map((f) => (
          <article key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <span className="feature-tag">{f.tag}</span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
