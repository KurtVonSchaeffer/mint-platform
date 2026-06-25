export function AlgoLendLogo({ className = '', white = false }: { className?: string; white?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30"
        stroke={white ? '#fff' : '#7C3AED'}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="15" r="5.5" fill={white ? '#fff' : '#0F1629'} />
    </svg>
  );
}
