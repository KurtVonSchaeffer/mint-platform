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
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">MINT BizTech</p>
        <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
          IT consulting &amp; software services workspace.
        </p>
      </div>

      <div
        className="rounded-2xl p-5 flex items-start gap-3"
        style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.18)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(13,148,136,0.15)' }}>
          <Building2 size={16} style={{ color: '#0D9488' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>This workspace is in early setup</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
            The workspace switcher, branding, and navigation are live. Client management, quoting,
            invoicing, projects, CRM, and reporting are being built out next — the numbers below are
            placeholders, not live data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bento-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow">{s.label}</p>
              <s.icon size={14} style={{ color: 'var(--color-text3)' }} />
            </div>
            <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{s.value}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
