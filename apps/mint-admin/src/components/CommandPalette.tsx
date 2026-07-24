'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutGrid, Building2, Filter, Inbox, Tag, ScrollText,
  Receipt, CreditCard, Globe, ToggleLeft, Activity, ShieldCheck,
  ArrowDownToLine, Banknote, PiggyBank, Scale, Gauge, Link2,
  Users2, Settings, X,
} from 'lucide-react';

type Cmd = { label: string; group: string; href: string; icon: React.ElementType; keywords?: string };

const COMMANDS: Cmd[] = [
  { label: 'Dashboard',          group: 'Core',        href: '/',                               icon: LayoutGrid,      keywords: 'home overview' },
  { label: 'Clients',            group: 'Core',        href: '/clients',                        icon: Building2,       keywords: 'tenants lenders' },
  { label: 'Leads',              group: 'Core',        href: '/leads',                          icon: Filter,          keywords: 'pipeline prospects' },
  { label: 'Applications',       group: 'Core',        href: '/applications',                   icon: Inbox,           keywords: 'loan requests' },
  { label: 'Pricing',            group: 'Finance',     href: '/pricing',                        icon: Tag             },
  { label: 'Quotes',             group: 'Finance',     href: '/quotes',                         icon: ScrollText      },
  { label: 'Invoices',           group: 'Finance',     href: '/invoices',                       icon: Receipt         },
  { label: 'Subscriptions',      group: 'Finance',     href: '/billing',                        icon: CreditCard,      keywords: 'billing mrr' },
  { label: 'Payroll',            group: 'Finance',     href: '/payroll',                        icon: Banknote,        keywords: 'commissions' },
  { label: 'Lender Policies',    group: 'Marketplace', href: '/marketplace',                    icon: Scale           },
  { label: 'Loan Simulator',     group: 'Marketplace', href: '/marketplace/simulate',           icon: Gauge           },
  { label: 'Integration',        group: 'Marketplace', href: '/marketplace/integration',        icon: Link2           },
  { label: 'Unsecured Credit',   group: 'Marketplace', href: '/marketplace/loans',              icon: Banknote        },
  { label: 'Portfolio Credit',   group: 'Marketplace', href: '/marketplace/portfolio-credit',   icon: PiggyBank       },
  { label: 'Features',           group: 'Platform',    href: '/features',                       icon: ToggleLeft,      keywords: 'flags modules' },
  { label: 'API Usage',          group: 'Platform',    href: '/usage',                          icon: Activity,        keywords: 'quota metrics' },
  { label: 'Compliance',         group: 'Platform',    href: '/compliance',                     icon: ShieldCheck     },
  { label: 'Migration',          group: 'Platform',    href: '/migration',                      icon: ArrowDownToLine },
  { label: 'Users',              group: 'Admin',       href: '/users',                          icon: Users2,          keywords: 'team roles invite' },
  { label: 'Settings',           group: 'Admin',       href: '/settings',                       icon: Settings,        keywords: 'config env' },
  { label: 'Telemarketer View',  group: 'Admin',       href: '/telemarketer',                   icon: Globe,           keywords: 'tm agent' },
];

function score(cmd: Cmd, q: string): number {
  const lq = q.toLowerCase();
  const label = cmd.label.toLowerCase();
  const kw    = (cmd.keywords ?? '').toLowerCase();
  if (label.startsWith(lq))   return 3;
  if (label.includes(lq))     return 2;
  if (kw.includes(lq))        return 1;
  if (cmd.group.toLowerCase().includes(lq)) return 0.5;
  return 0;
}

interface Props { onClose: () => void }

export function CommandPalette({ onClose }: Props) {
  const router   = useRouter();
  const [query, setQuery]     = useState('');
  const [active, setActive]   = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? COMMANDS.map(c => ({ cmd: c, s: score(c, query) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.cmd)
    : COMMANDS;

  // Group results
  const groups = results.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});
  const flat = Object.values(groups).flat();

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const navigate = useCallback((cmd: Cmd) => {
    router.push(cmd.href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(a => Math.min(a + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      }
      if (e.key === 'Enter') {
        const cmd = flat[active];
        if (cmd) navigate(cmd);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, flat, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', animation: 'fade-in 0.12s ease-out both' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 560,
          maxHeight: '65vh',
          background: 'var(--color-surface)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.08)',
          animation: 'scale-in 0.18s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <Search size={16} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, features…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)', caretColor: 'var(--color-violet)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--color-text3)' }}>
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2">
          {Object.entries(groups).length === 0 && (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5" style={{ color: 'var(--color-text3)' }}>
                {group}
              </p>
              {items.map(cmd => {
                const idx  = flatIdx++;
                const Icon = cmd.icon;
                const isActive = idx === active;
                return (
                  <button
                    key={cmd.href}
                    data-idx={idx}
                    onClick={() => navigate(cmd)}
                    onMouseEnter={() => setActive(idx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
                      color: isActive ? 'var(--color-text)' : 'var(--color-text2)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isActive ? 'rgba(124,58,237,0.18)' : 'var(--color-surface2)',
                        color: isActive ? 'var(--color-violet)' : 'var(--color-text3)',
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <span className="text-sm font-medium">{cmd.label}</span>
                    {isActive && (
                      <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}>
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
          <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
            <kbd className="font-mono">↑↓</kbd> navigate &nbsp;·&nbsp; <kbd className="font-mono">↵</kbd> open &nbsp;·&nbsp; <kbd className="font-mono">esc</kbd> close
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'rgba(124,58,237,0.5)' }}>⌘K</span>
        </div>
      </div>
    </div>
  );
}
