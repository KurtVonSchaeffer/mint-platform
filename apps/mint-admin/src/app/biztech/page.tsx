import { Building2, FolderKanban, FileText, Receipt, TrendingUp, Calendar } from 'lucide-react';

/**
 * MINT BizTech dashboard — Phase 1 placeholder.
 *
 * No real data model exists yet (clients, projects, quotes, invoices are
 * all Phase 2+). This proves the workspace shell/routing/branding works
 * end to end before any real feature is built on top of it. Every stat
 * is a static placeholder, clearly labeled as such rather than a fake
 * live-looking number.
 */

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

const STATS = [
  { label: 'Total Clients',       value: '—', icon: Building2,   sub: 'Not yet tracked' },
  { label: 'Active Projects',     value: '—', icon: FolderKanban, sub: 'Not yet tracked' },
  { label: 'Quotes Sent',         value: '—', icon: FileText,    sub: 'Not yet tracked' },
  { label: 'Outstanding Invoices', value: '—', icon: Receipt,    sub: 'Not yet tracked' },
  { label: 'Revenue (MTD)',       value: '—', icon: TrendingUp,  sub: 'Not yet tracked' },
  { label: 'Upcoming Tasks',      value: '—', icon: Calendar,    sub: 'Not yet tracked' },
];

export default function BizTechDashboard() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
          IT consulting &amp; software services workspace.
        </p>
      </div>

      <div className="rounded-lg px-5 py-4" style={PANEL}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>This workspace is in early setup</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
          The workspace switcher, branding, and navigation are live. Client management, quoting,
          invoicing, projects, CRM, and reporting are being built out next — the numbers below are
          placeholders, not live data.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="p-5" style={PANEL}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              <s.icon size={14} style={{ color: 'var(--color-text3)' }} />
            </div>
            <p className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{s.value}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
