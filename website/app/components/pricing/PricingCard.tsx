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
        background: highlighted ? "linear-gradient(145deg, rgba(34,211,238,0.05), rgba(0,0,0,0))" : "var(--bg-card)", 
        border: highlighted ? "1px solid rgba(34,211,238,0.3)" : "1px solid var(--border)", 
        borderRadius: "var(--radius)", 
        padding: "48px 40px",
        position: "relative",
        boxShadow: highlighted ? "0 20px 40px rgba(34,211,238,0.05)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}
    >
      {highlighted && (
        <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #22d3ee, #818cf8)", color: "#000", padding: "6px 16px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", boxShadow: "0 4px 12px rgba(34,211,238,0.3)" }}>
          Most Popular
        </div>
      )}
      <h3 style={{ fontSize: "1.75rem", margin: "0 0 4px", color: highlighted ? "#22d3ee" : "var(--text)" }}>{title}</h3>
      <div style={{ fontSize: "3rem", fontWeight: "900", margin: "0 0 16px", letterSpacing: "-0.04em" }}>
        ${price}<span style={{ fontSize: "1.1rem", color: "var(--text-soft)", fontWeight: "500", letterSpacing: "normal" }}>/mo</span>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.95rem", lineHeight: "1.6" }}>{description}</p>
      
      <div style={{ flex: 1 }}></div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: highlighted ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.05)" }}>
              <Check size={14} color={highlighted ? "#22d3ee" : "var(--text)"} strokeWidth={3} />
            </div>
            {f}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
