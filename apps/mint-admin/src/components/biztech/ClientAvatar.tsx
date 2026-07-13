const PALETTE = ['#5C3BCF', '#DDC357', '#22C55E', '#0EA5E9', '#F97316', '#EC4899'];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Small colored initials avatar, deterministic per name — used in list rows instead of a plain text-only column. */
export function ClientAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const color = colorFor(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.42,
        background: `${color}22`, color,
      }}
    >
      {initials}
    </span>
  );
}
