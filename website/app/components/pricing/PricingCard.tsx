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
    <div className={`pricing-card ${highlighted ? 'highlighted' : ''}`}>
      {highlighted && <div className="pricing-badge">Popular</div>}
      <h3>{title}</h3>
      <div className="pricing-price">
        ${price}<span>/mo</span>
      </div>
      <p className="pricing-desc">{description}</p>
      <ul className="pricing-features">
        {features.map((f) => (
          <li key={f}>
            <span className="pricing-check"><Check size={14} strokeWidth={3} /></span>
            {f}
          </li>
        ))}
      </ul>
      <div className="pricing-cta">{children}</div>
    </div>
  );
}
