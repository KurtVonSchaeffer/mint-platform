'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone, TrendingUp, Users2, DollarSign, Filter, Calendar,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Zap,
  ChevronRight, Target, Banknote, Loader2,
} from 'lucide-react';
import { getAgentId, getAgentName } from '@/lib/telemarketer-agent';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashStats {
  leads:    { total: number; newThisMonth: number; awaitingContact: number };
  activity: { callsToday: number; followUpsDue: number; overdue: number };
  clients:  { converted: number; live: number; pendingCompliance: number; complianceApproved: number };
  earnings: { commissionPending: number; commissionEarned: number; expectedPayroll: number };
}

interface TodayCall {
  id: string; outcome: string; called_at: string;
  leads: { id: string; name: string; company: string; phone: string | null } | null;
}

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

function KpiCard({ label, value, sub, color, rgb, icon: Icon, href }: {
  label: string; value: string; sub: string; color: string; rgb: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; href: string;
}) {
  return (
    <Link href={href} className="bento-card p-5 block group transition-all hover:-translate-y-0.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${rgb},0.12)`, color }}>
          <Icon size={15} />
        </div>
        <ArrowUpRight size={12} style={{ color, opacity: 0.6 }} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color }}>{sub}</p>
    </Link>
  );
}

function SectionHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
      {href && cta && (
        <Link href={href} className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-violet)' }}>
          {cta} <ChevronRight size={11} />
        </Link>
      )}
    </div>
  );
}

const MONTH = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

export default function TelemarketerHomePage() {
  const [stats,      setStats]      = useState<DashStats | null>(null);
  const [todayCalls, setTodayCalls] = useState<TodayCall[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [agentName,  setAgentName]  = useState('');

  useEffect(() => {
    async function load() {
      const [agentId, name] = await Promise.all([getAgentId(), getAgentName()]);
      setAgentName(name);
      const [dashRes, callsRes] = await Promise.all([
        fetch(`/api/telemarketer/dashboard?agent_id=${agentId}`).then(r => r.json()),
        fetch(`/api/telemarketer/call-logs?agent_id=${agentId}&today=true`).then(r => r.json()),
      ]);
      if (dashRes.leads) setStats(dashRes);
      setTodayCalls(callsRes.call_logs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const s = stats ?? {
    leads:    { total: 0, newThisMonth: 0, awaitingContact: 0 },
    activity: { callsToday: 0, followUpsDue: 0, overdue: 0 },
    clients:  { converted: 0, live: 0, pendingCompliance: 0, complianceApproved: 0 },
    earnings: { commissionPending: 0, commissionEarned: 0, expectedPayroll: 0 },
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Telemarketer Workspace</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            {agentName ? `${getGreeting()}, ${agentName} 👋` : `${getGreeting()} 👋`}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}>
          <div className="flex flex-col items-center">
            <p className="text-xl font-bold" style={{ color: '#34D399', fontFamily: 'var(--font-mono)' }}>
              {loading ? '—' : s.activity.callsToday}
            </p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(52,211,153,0.6)' }}>Calls Today</p>
          </div>
          <div className="w-px h-8" style={{ background: 'rgba(52,211,153,0.2)' }} />
          <div className="flex flex-col items-center">
            <p className="text-xl font-bold" style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>
              {loading ? '—' : s.activity.followUpsDue}
            </p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(251,191,36,0.6)' }}>Due Today</p>
          </div>
        </div>
      </div>

      {/* Attention banner */}
      {!loading && (s.activity.followUpsDue > 0 || s.activity.overdue > 0) && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.22)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
              <Clock size={16} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {s.activity.followUpsDue} follow-up{s.activity.followUpsDue !== 1 ? 's' : ''} due today
                {s.activity.overdue > 0 && ` · ${s.activity.overdue} overdue`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                {s.leads.awaitingContact} leads still awaiting first contact
              </p>
            </div>
          </div>
          <Link href="/telemarketer/follow-ups" className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-4 shrink-0">
            View Follow-Ups <ArrowUpRight size={13} />
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && (
        <>
          {/* My Leads KPIs */}
          <div>
            <SectionHeader title="My Leads" href="/telemarketer/leads" cta="Manage leads" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Total Leads"      value={String(s.leads.total)}           sub="All time"          color="#A78BFA" rgb="167,139,250" icon={Filter}     href="/telemarketer/leads" />
              <KpiCard label="New This Month"   value={String(s.leads.newThisMonth)}    sub={MONTH}            color="#60A5FA" rgb="96,165,250"  icon={TrendingUp}  href="/telemarketer/leads" />
              <KpiCard label="Awaiting Contact" value={String(s.leads.awaitingContact)} sub="Need first call"  color="#FBBF24" rgb="251,191,36"  icon={Phone}       href="/telemarketer/leads" />
            </div>
          </div>

          {/* My Activity */}
          <div>
            <SectionHeader title="My Activity" href="/telemarketer/follow-ups" cta="View follow-ups" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Calls Made Today"     value={String(s.activity.callsToday)}  sub="Keep going!"      color="#34D399" rgb="52,211,153"  icon={Phone}    href="/telemarketer/leads" />
              <KpiCard label="Follow-Ups Due Today" value={String(s.activity.followUpsDue)} sub="Don't miss these" color="#FBBF24" rgb="251,191,36"  icon={Clock}    href="/telemarketer/follow-ups" />
              <KpiCard label="Overdue"              value={String(s.activity.overdue)}      sub="Needs attention"  color="#F87171" rgb="248,113,113" icon={Calendar} href="/telemarketer/follow-ups" />
            </div>
          </div>

          {/* My Clients */}
          <div>
            <SectionHeader title="My Clients" href="/telemarketer/clients" cta="View all" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Converted"          value={String(s.clients.converted)}          sub="Total"              color="#A78BFA" rgb="167,139,250" icon={Users2}       href="/telemarketer/clients" />
              <KpiCard label="Pending Compliance" value={String(s.clients.pendingCompliance)}  sub="Awaiting review"    color="#FBBF24" rgb="251,191,36"  icon={AlertCircle}  href="/telemarketer/clients" />
              <KpiCard label="Approved"           value={String(s.clients.complianceApproved)} sub="Ready for deduction"color="#34D399" rgb="52,211,153"  icon={CheckCircle2} href="/telemarketer/clients" />
              <KpiCard label="Live Clients"       value={String(s.clients.live)}               sub="Active & earning"   color="#10B981" rgb="16,185,129"  icon={Zap}          href="/telemarketer/clients" />
            </div>
          </div>

          {/* My Earnings */}
          <div>
            <SectionHeader title="My Earnings" href="/telemarketer/commission" cta="Commission centre" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Commission Pending"      value={fmt(s.earnings.commissionPending)} sub="Awaiting deduction"  color="#FBBF24" rgb="251,191,36"  icon={Target}     href="/telemarketer/commission" />
              <KpiCard label="Commission Earned"       value={fmt(s.earnings.commissionEarned)}  sub="Collected & payable" color="#34D399" rgb="52,211,153"  icon={DollarSign} href="/telemarketer/commission" />
              <KpiCard label={`Expected Payroll — ${MONTH.split(' ')[0]}`} value={fmt(s.earnings.expectedPayroll)} sub="Due end of month" color="#A78BFA" rgb="167,139,250" icon={Banknote} href="/telemarketer/statements" />
            </div>
          </div>

          {/* Today's calls + Quick actions */}
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bento-card p-5">
              <SectionHeader title="Today's Calls" href="/telemarketer/leads" cta="My leads" />
              {todayCalls.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text3)' }}>No calls logged today yet.</p>
              ) : (
                <div className="space-y-1">
                  {todayCalls.map((call, i) => (
                    <div key={call.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{ borderBottom: i < todayCalls.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                        {(call.leads?.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{call.leads?.name ?? '—'}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{call.leads?.company}</p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: call.outcome === 'Spoke' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                          color: call.outcome === 'Spoke' ? '#34D399' : 'var(--color-text3)',
                        }}>
                        {call.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bento-card p-5">
              <SectionHeader title="Quick Actions" />
              <div className="space-y-2">
                {[
                  { label: 'Add New Lead',       href: '/telemarketer/leads',      icon: Filter,     color: '#A78BFA', rgb: '167,139,250' },
                  { label: 'Schedule Follow-Up', href: '/telemarketer/follow-ups', icon: Calendar,   color: '#FBBF24', rgb: '251,191,36'  },
                  { label: 'Upload Documents',   href: '/telemarketer/documents',  icon: TrendingUp, color: '#34D399', rgb: '52,211,153'  },
                  { label: 'View Commission',    href: '/telemarketer/commission', icon: DollarSign, color: '#10B981', rgb: '16,185,129'  },
                  { label: 'Download Statement', href: '/telemarketer/statements', icon: Banknote,   color: '#A78BFA', rgb: '167,139,250' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{ color: 'var(--color-text2)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `rgba(${a.rgb},0.08)`; el.style.color = a.color; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--color-text2)'; }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `rgba(${a.rgb},0.1)`, color: a.color }}>
                      <a.icon size={12} />
                    </div>
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight size={12} style={{ opacity: 0.4 }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
