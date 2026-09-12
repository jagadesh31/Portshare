type Props = {
  size?: number;
  className?: string;
};

export default function PortShareLogo({ size = 28, className }: Props) {
  return (
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', borderRadius: Math.round(size * 0.22) }}
    />
  );
}
