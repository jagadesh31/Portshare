import { Check, X } from 'lucide-react';
export default function FeatureCheck({ value }: { value: string }) {
  if (value === 'yes') return <span className="check-yes"><Check size={18} /></span>;
  if (value === 'no') return <span className="check-no"><X size={18} /></span>;
  return <span className="check-partial">{value}</span>;
}
