/**
 * AlgoLend brand mark — purple gateway arch with a dark navy circle nested inside.
 * Mirrors the official lockup. Reusable across portal screens.
 *
 *  variant="light" (default) — for use on light backgrounds; circle is dark navy
 *  variant="dark"            — for use on dark backgrounds; circle is paper-cream
 */
export function Logo({
  size = 32,
  variant = 'light',
  className,
  archColor = '#7C3AED',
}: {
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
  archColor?: string;
}) {
  const circleColor = variant === 'dark' ? '#FAFAF9' : '#0F1629';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="AlgoLend"
      className={className}
    >
      <path
        d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30"
        stroke={archColor}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="15" r="5.5" fill={circleColor} />
    </svg>
  );
}
