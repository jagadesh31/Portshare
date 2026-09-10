'use client';
type SectionHeaderProps = { id?: string; eyebrow?: string; title: string; description: string };

export default function SectionHeader({ id, eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="section-header" id={id}>
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
