import { useEffect, useState } from 'react';
import { Check, FileSignature, Landmark, TrendingUp } from 'lucide-react';

interface Activity {
  icon: typeof Check;
  text: string;
  meta: string;
  /** Tailwind text color class for the icon dot. */
  color: string;
}

const ACTIVITIES: Activity[] = [
  { icon: Check,         text: 'Approved · Mahlangu Tech',          meta: 'just now',  color: 'text-emerald-400' },
  { icon: FileSignature, text: 'Contract signed · Nkosi Holdings',  meta: '12s ago',   color: 'text-[#A78BFA]' },
  { icon: Landmark,      text: 'Bank verified · Dlamini Logistics', meta: '34s ago',   color: 'text-sky-400' },
  { icon: TrendingUp,    text: 'Disbursed R 50,000',                 meta: '1m ago',    color: 'text-emerald-400' },
  { icon: Check,         text: 'KYC passed · Velocity Trading',     meta: '2m ago',    color: 'text-emerald-400' },
];

/**
 * ActivityTicker — cycles through platform activity items, one at a time,
 * with a slide-in / slide-out transition. Pauses on hover.
 */
export function ActivityTicker({ interval = 3200 }: { interval?: number }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % ACTIVITIES.length);
    }, interval);
    return () => window.clearInterval(t);
  }, [interval, paused]);

  const a = ACTIVITIES[idx];
  const Icon = a.icon;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
        </span>
        <span className="text-[10px] mono uppercase tracking-[0.18em] text-white/40">Live activity</span>
      </div>

      <div key={idx} className="flex items-center gap-3" style={{ animation: 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <div className={`w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${a.color}`}>
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white/85 truncate font-medium">{a.text}</p>
          <p className="text-[10px] text-white/35 mono">{a.meta}</p>
        </div>
      </div>

      {/* Indicator dots */}
      <div className="flex items-center gap-1 mt-3">
        {ACTIVITIES.map((_, i) => (
          <span
            key={i}
            className={`h-0.5 rounded-full transition-all duration-500 ${i === idx ? 'w-5 bg-white/70' : 'w-1.5 bg-white/15'}`}
          />
        ))}
      </div>
    </div>
  );
}
