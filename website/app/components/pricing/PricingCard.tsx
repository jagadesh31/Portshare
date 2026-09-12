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
        border: highlighted ? "1px solid var(--border-accent)" : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "48px 40px",
        position: "relative",
        boxShadow: highlighted ? "0 20px 40px rgba(0,0,0,0.18)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}
    >
      {highlighted && (
        <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "var(--text-strong)", color: "var(--text-inverse)", padding: "6px 16px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Most Popular
        </div>
      )}
      <h3 style={{ fontSize: "1.75rem", margin: "0 0 4px", color: "var(--text-strong)" }}>{title}</h3>
      <div style={{ fontSize: "3rem", fontWeight: "900", margin: "0 0 16px", letterSpacing: "-0.04em", color: "var(--text-strong)" }}>
        ${price}<span style={{ fontSize: "1.1rem", color: "var(--text-soft)", fontWeight: "500", letterSpacing: "normal" }}>/mo</span>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.95rem", lineHeight: "1.6" }}>{description}</p>

      <div style={{ flex: 1 }}></div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-dim)" }}>
              <Check size={14} color="var(--text-strong)" strokeWidth={3} />
            </div>
            {f}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
