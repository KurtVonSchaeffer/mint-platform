'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader2, PhoneCall, Calendar, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface CallLog {
  id: string;
  outcome: string;
  duration: number | null;
  notes: string | null;
  called_at: string;
  lead_id: string | null;
  recording_url?: string | null;
  leads: { id: string; name: string; company: string; phone: string } | null;
}

interface Commission {
  id: string;
  client_name: string;
  commission_amount: number;
  status: string;
  created_at: string;
  leads: { name: string; company: string } | null;
}

const OUTCOME_CFG: Record<string, { color: string; bg: string }> = {
  'Answered':           { color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  'Voicemail':          { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  'No Answer':          { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  'Callback':           { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  'Called Back Later':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  'Not Interested':     { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
};

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function fmtR(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

function dateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRESETS = [
  { key: '7',  label: '7 days',  days: 7  },
  { key: '14', label: '14 days', days: 14 },
  { key: '30', label: '30 days', days: 30 },
] as const;

export function CallHistoryPanel({ agentId, agentName, onClose }: {
  agentId: string; agentName: string; onClose: () => void;
}) {
  const [mode,        setMode]        = useState<'day' | 'range'>('day');
  const [selectedDay, setSelectedDay] = useState(() => isoDate(new Date()));
  const [preset,  setPreset]  = useState<'7' | '14' | '30' | 'all' | 'custom'>('7');
  const [from,    setFrom]    = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return isoDate(d); });
  const [to,      setTo]      = useState(() => isoDate(new Date()));
  const [calls,       setCalls]       = useState<CallLog[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading,     setLoading]     = useState(true);

  const effTo   = mode === 'day' ? selectedDay : to;
  const effFrom = mode === 'day' ? selectedDay : (preset === 'all' ? null : from);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const callsParams = new URLSearchParams({ agent_id: agentId, to: effTo });
      const commParams  = new URLSearchParams({ agent_id: agentId, to: effTo });
      if (effFrom) {
        callsParams.set('from', effFrom);
        commParams.set('from', effFrom);
      }
      const [callsRes, commRes] = await Promise.all([
        fetch(`/api/telemarketer/call-logs?${callsParams}`),
        fetch(`/api/admin/agent-commissions?${commParams}`),
      ]);
      if (callsRes.ok) {
        const { call_logs } = await callsRes.json();
        setCalls(call_logs ?? []);
      }
      if (commRes.ok) {
        const { commissions: data } = await commRes.json();
        setCommissions(data ?? []);
      } else {
        setCommissions([]);
      }
    } finally { setLoading(false); }
  }, [agentId, effFrom, effTo]);

  useEffect(() => { load(); }, [load]);

  function shiftDay(delta: number) {
    const d = new Date(`${selectedDay}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const next = isoDate(d);
    if (next > isoDate(new Date())) return;
    setSelectedDay(next);
  }

  function applyPreset(days: number, key: '7' | '14' | '30') {
    const end   = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setFrom(isoDate(start));
    setTo(isoDate(end));
    setPreset(key);
  }

  function applyAll() {
    setTo(isoDate(new Date()));
    setPreset('all');
  }

  const groups: Record<string, CallLog[]> = {};
  calls.forEach(c => { (groups[dateKey(c.called_at)] ??= []).push(c); });

  const commByDay: Record<string, Commission[]> = {};
  commissions.forEach(c => { (commByDay[dateKey(c.created_at)] ??= []).push(c); });

  const days = Array.from(new Set([...Object.keys(groups), ...Object.keys(commByDay)])).sort((a, b) => b.localeCompare(a));
  const earnedFor = (day: string) => (commByDay[day] ?? []).reduce((s, c) => s + c.commission_amount, 0);
  const totalEarned = commissions.reduce((s, c) => s + c.commission_amount, 0);

  function exportCSV() {
    const rows: string[][] = [['Date', 'Time', 'Lead', 'Company', 'Phone', 'Outcome', 'Duration (min)', 'Notes']];
    days.forEach(day => {
      (groups[day] ?? [])
        .slice()
        .sort((a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime())
        .forEach(c => {
          const d = new Date(c.called_at);
          rows.push([
            day,
            d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
            c.leads?.name ?? '',
            c.leads?.company ?? '',
            c.leads?.phone ?? '',
            c.outcome,
            c.duration != null ? String(c.duration) : '',
            c.notes ?? '',
          ]);
        });
    });

    rows.push([]);
    rows.push(['Daily Earnings']);
    rows.push(['Date', 'Amount (R)', 'Deals']);
    days.forEach(day => {
      const dayComm = commByDay[day] ?? [];
      rows.push([day, String(earnedFor(day)), String(dayComm.length)]);
    });
    rows.push(['Total', String(totalEarned), String(commissions.length)]);

    const csv  = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const rangeLabel = mode === 'day' ? selectedDay : preset === 'all' ? 'all-time' : `${from}-to-${to}`;
    a.download = `${agentName.toLowerCase().replace(/\s+/g, '-')}-calls-${rangeLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 confirm-backdrop z-50 flex items-center justify-center p-4"
      style={{ animation: 'fade-in 0.2s ease-out both' }}
      onClick={onClose}
    >
      <div
        className="bento-card w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ animation: 'scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
              <PhoneCall size={14} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Call History</h2>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{agentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 px-6 pt-3">
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface2)' }}>
            {([['day', 'Single day'], ['range', 'Date range']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                style={mode === key
                  ? { background: 'var(--color-surface)', color: 'var(--color-text)' }
                  : { color: 'var(--color-text3)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-6 py-3 flex-wrap" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          {mode === 'day' ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => shiftDay(-1)}
                className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)' }}>
                <ChevronLeft size={14} />
              </button>
              <input
                type="date" value={selectedDay} max={isoDate(new Date())}
                onChange={e => setSelectedDay(e.target.value)}
                className="field-input text-xs py-1 px-2"
              />
              <button onClick={() => shiftDay(1)} disabled={selectedDay >= isoDate(new Date())}
                className="p-1.5 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
                style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)' }}>
                <ChevronRight size={14} />
              </button>
              {selectedDay !== isoDate(new Date()) && (
                <button onClick={() => setSelectedDay(isoDate(new Date()))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)' }}>
                  Today
                </button>
              )}
            </div>
          ) : (
            <>
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.days, p.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={preset === p.key
                    ? { background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }
                    : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid transparent' }}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={applyAll}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={preset === 'all'
                  ? { background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }
                  : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid transparent' }}
              >
                All time
              </button>
              <div className="flex items-center gap-1.5 ml-1">
                <Calendar size={12} style={{ color: 'var(--color-text3)' }} />
                <input
                  type="date" value={from} max={to} disabled={preset === 'all'}
                  onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
                  className="field-input text-xs py-1 px-2 disabled:opacity-40"
                />
                <span className="text-xs" style={{ color: 'var(--color-text3)' }}>to</span>
                <input
                  type="date" value={to} min={from} max={isoDate(new Date())}
                  onChange={e => { setTo(e.target.value); setPreset('custom'); }}
                  className="field-input text-xs py-1 px-2"
                />
              </div>
            </>
          )}
          <button
            onClick={exportCSV}
            disabled={loading || days.length === 0}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            <Download size={12} /> Export CSV
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
            </div>
          ) : days.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: 'var(--color-text3)' }}>No activity in this period.</p>
          ) : (
            <div className="space-y-5">
              {days.map(day => {
                const dayCalls = (groups[day] ?? []).slice().sort((a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime());
                const dayEarned = earnedFor(day);
                const label = new Date(`${day}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-bold" style={{ color: 'var(--color-text2)' }}>{label}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)' }}>
                        {dayCalls.length} call{dayCalls.length === 1 ? '' : 's'}
                      </span>
                      {dayEarned > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
                          {fmtR(dayEarned)} earned
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {dayCalls.map(c => {
                        const cfg = OUTCOME_CFG[c.outcome] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
                        return (
                          <div key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface2)' }}>
                            <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--color-text3)', minWidth: 42 }}>
                              {new Date(c.called_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                {c.leads?.name ?? 'Unknown lead'}
                                {c.leads?.company && <span className="font-normal" style={{ color: 'var(--color-text3)' }}> · {c.leads.company}</span>}
                              </p>
                              {c.notes && <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)' }}>{c.notes}</p>}
                            </div>
                            {c.duration != null && (
                              <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--color-text3)' }}>{c.duration}m</span>
                            )}
                            {c.recording_url && (
                              <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                                title="Play recording"
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-opacity hover:opacity-75"
                                style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
                                <Play size={9} fill="currentColor" />
                              </a>
                            )}
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {c.outcome}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border2)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
            {calls.length} call{calls.length === 1 ? '' : 's'} · {
              mode === 'day' ? selectedDay
              : preset === 'all' ? `all time through ${to}`
              : `${from} to ${to}`
            }
          </p>
          {totalEarned > 0 && (
            <p className="text-xs font-bold" style={{ color: '#34D399' }}>
              {fmtR(totalEarned)} earned this period
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
