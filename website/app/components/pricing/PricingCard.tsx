import { Check } from "lucide-react";

export default function PricingCard({
  title,
  price,
  description,
  features,
  highlighted,
  children
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div 
      className="pricing-card" 
      style={{ 
        background: "var(--bg-card)", 
        border: highlighted ? "2px solid var(--accent)" : "1px solid var(--border)", 
        borderRadius: "var(--radius)", 
        padding: "40px",
        position: "relative"
      }}
    >
      {highlighted && (
        <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "var(--text)", color: "var(--bg)", padding: "4px 12px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Most Popular
        </div>
      )}
      <h3 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>{title}</h3>
      <div style={{ fontSize: "2.5rem", fontWeight: "800", margin: "0 0 24px" }}>
        ${price}<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "500" }}>/mo</span>
      </div>
      <p style={{ color: "var(--text-soft)", marginBottom: "32px" }}>{description}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
            <Check size={18} color="var(--accent)" /> {f}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
