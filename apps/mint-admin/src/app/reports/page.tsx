'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, Minus,
  Phone, Users, Trophy, BarChart2, ArrowRight, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpis { leadsTotal: number; callsTotal: number; won: number; convRate: number; contacted: number }
interface FunnelStage { key: string; label: string; count: number; pct: number }
interface Source { source: string; label: string; count: number }
interface CallOutcome { outcome: string; count: number }
interface AgentRow { id: string; name: string; email: string; callsThisMonth: number; leadsAssigned: number; won: number; convRate: number }
interface PeriodData { label: string; kpis: Kpis; funnel: FunnelStage[]; sources: Source[]; callOutcomes: CallOutcome[] }
interface ReportData { thisMonth: PeriodData; lastMonth: PeriodData; agents: AgentRow[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const C = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#F97316','#EC4899','#94A3B8'];

// ─── Screen helpers ───────────────────────────────────────────────────────────

function pct(curr: number, prev: number) {
  if (prev === 0) return null;
  return Math.round((curr - prev) / prev * 100);
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  const d = pct(curr, prev);
  if (d === null) return null;
  const same = d === 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={same ? { background:'rgba(148,163,184,0.1)',color:'#94A3B8' }
           : d > 0 ? { background:'rgba(52,211,153,0.12)',color:'#34D399' }
                   : { background:'rgba(248,113,113,0.12)',color:'#F87171' }}>
      {same ? <Minus size={9}/> : d > 0 ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
      {same ? 'flat' : `${d>0?'+':''}${d}%`}
    </span>
  );
}

function KpiCard({ icon, label, thisVal, lastVal, fmt = String }: {
  icon: React.ReactNode; label: string; thisVal: number; lastVal: number; fmt?: (v:number)=>string
}) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span style={{color:'var(--color-text3)'}}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{color:'var(--color-text3)'}}>{label}</span>
      </div>
      <p className="text-2xl font-bold mb-1.5" style={{color:'var(--color-text)'}}>{fmt(thisVal)}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{color:'var(--color-text3)'}}>vs {fmt(lastVal)} last month</span>
        <DeltaBadge curr={thisVal} prev={lastVal}/>
      </div>
    </div>
  );
}

function ScreenFunnelBar({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={s.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{color:'var(--color-text2)'}}>{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tabular-nums" style={{color:'var(--color-text)'}}>{s.count}</span>
              <span className="text-[9px]" style={{color:'var(--color-text3)'}}>{s.pct}%</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full" style={{background:'var(--color-surface2)'}}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{width:`${(s.count/max)*100}%`, background:C[i%C.length]}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PDF SVG chart helpers ────────────────────────────────────────────────────

function PdfFunnelBars({ stages, maxOverride }: { stages: FunnelStage[]; maxOverride?: number }) {
  const max = maxOverride ?? Math.max(...stages.map(s => s.count), 1);
  const LW = 130, BW = 260, H = stages.length * 30;
  return (
    <svg width={LW+BW+60} height={H} style={{display:'block'}}>
      {stages.map((s, i) => {
        const w = Math.round((s.count / max) * BW);
        const y = i * 30;
        return (
          <g key={s.key}>
            <text x={0} y={y+17} fontSize={11} fill="#334155" fontWeight="500">{s.label}</text>
            <rect x={LW} y={y+6} width={BW} height={15} rx={4} fill="#F1F5F9"/>
            {w > 0 && <rect x={LW} y={y+6} width={w} height={15} rx={4} fill={C[i%C.length]}/>}
            <text x={LW+w+7} y={y+17} fontSize={11} fill="#0F172A" fontWeight="700">{s.count}</text>
            <text x={LW+BW+36} y={y+17} fontSize={10} fill="#94A3B8">{s.pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function PdfGroupedBars({ thisStages, lastStages }: { thisStages: FunnelStage[]; lastStages: FunnelStage[] }) {
  const allVals = [...thisStages.map(s => s.count), ...lastStages.map(s => s.count)];
  const maxVal = Math.max(...allVals, 1);
  const W = 960, H = 130;
  const n = thisStages.length;
  const gw = W / n;
  const bw = gw * 0.28;

  return (
    <svg width={W} height={H+56} style={{display:'block'}}>
      {/* Grid lines */}
      {[0.25,0.5,0.75,1].map(f => (
        <line key={f} x1={0} y1={H - f*H} x2={W} y2={H - f*H}
          stroke="#F1F5F9" strokeWidth={1}/>
      ))}

      {thisStages.map((s, i) => {
        const last = lastStages.find(l => l.key === s.key);
        const th = s.count > 0 ? Math.max(Math.round((s.count / maxVal) * H), 2) : 0;
        const lh = last && last.count > 0 ? Math.max(Math.round((last.count / maxVal) * H), 2) : 0;
        const gx = i * gw + gw * 0.08;
        const color = C[i % C.length];

        return (
          <g key={s.key}>
            {/* This month bar */}
            {th > 0 && <rect x={gx} y={H-th} width={bw} height={th} rx={3} fill={color}/>}
            <text x={gx+bw/2} y={H-th-5} fontSize={10} textAnchor="middle" fill={color} fontWeight="700">{s.count}</text>

            {/* Last month bar */}
            {lh > 0 && <rect x={gx+bw+4} y={H-lh} width={bw} height={lh} rx={3} fill={color} opacity={0.22}/>}
            {last && last.count > 0 &&
              <text x={gx+bw+4+bw/2} y={H-lh-5} fontSize={10} textAnchor="middle" fill="#94A3B8">{last.count}</text>}

            {/* Stage label */}
            <text x={gx+bw+2} y={H+14} fontSize={9} textAnchor="middle" fill="#64748B" fontWeight="500">
              {s.label.split('/')[0].trim()}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={W-160} y={H+32} width={11} height={11} rx={2} fill="#7C3AED"/>
      <text x={W-145} y={H+42} fontSize={10} fill="#334155" fontWeight="600">This month</text>
      <rect x={W-70} y={H+32} width={11} height={11} rx={2} fill="#7C3AED" opacity={0.22}/>
      <text x={W-55} y={H+42} fontSize={10} fill="#94A3B8">Last month</text>
    </svg>
  );
}

function PdfBarList({ items, color }: { items:{label:string;count:number}[]; color?:boolean }) {
  const max = items[0]?.count ?? 1;
  return (
    <div>
      {items.map((item, i) => {
        const w = Math.round((item.count / max) * 100);
        return (
          <div key={item.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,color:'#334155',fontWeight:500}}>{item.label}</span>
              <span style={{fontSize:11,color:'#0F172A',fontWeight:700}}>{item.count}</span>
            </div>
            <div style={{background:'#F1F5F9',borderRadius:4,height:10,overflow:'hidden'}}>
              <div style={{background: color ? C[i%C.length] : '#7C3AED', height:10, width:`${w}%`, borderRadius:4}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PDF render zone (captured by html2canvas) ────────────────────────────────

function PdfZone({ data, innerRef }: { data: ReportData; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const generated = new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
  const s = (v: string | number): React.CSSProperties => ({ fontFamily:'-apple-system,Segoe UI,Arial,sans-serif' } as React.CSSProperties);

  const card: React.CSSProperties = {
    background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12,
    padding:'16px 18px', pageBreakInside:'avoid',
  };

  const kpiTile = (label: string, val: string, curr: number, prev: number, accent: string) => {
    const d = prev > 0 ? Math.round((curr - prev) / prev * 100) : null;
    const dColor = d === null ? '#94A3B8' : d > 0 ? '#10B981' : d < 0 ? '#EF4444' : '#94A3B8';
    return (
      <div key={label} style={{...card, borderTop:`3px solid ${accent}`, flex:1}}>
        <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'#64748B',fontWeight:600,marginBottom:8}}>{label}</div>
        <div style={{fontSize:28,fontWeight:800,color:'#0F172A',lineHeight:1}}>{val}</div>
        <div style={{fontSize:11,marginTop:7,fontWeight:600,color:dColor,minHeight:16}}>
          {d !== null ? `${d>0?'▲':'▼'} ${Math.abs(d)}% vs last month` : ''}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={innerRef}
      style={{
        position:'absolute', left:'-9999px', top:0,
        width:1120, background:'#ffffff',
        fontFamily:'-apple-system,Segoe UI,Arial,sans-serif',
        padding:'36px 44px 36px',
        boxSizing:'border-box',
      }}
    >
      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
        marginBottom:22, paddingBottom:18, borderBottom:'3px solid #7C3AED'}}>
        <div>
          <div style={{fontSize:26,fontWeight:800,color:'#7C3AED',letterSpacing:'-0.5px',lineHeight:1}}>AlgoLend</div>
          <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.12em',color:'#94A3B8',marginTop:4}}>Admin Console</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:18,fontWeight:700,color:'#0F172A'}}>Weekly Performance Report</div>
          <div style={{fontSize:12,color:'#64748B',marginTop:4}}>
            {data.thisMonth.label} <span style={{color:'#CBD5E1'}}>vs</span> {data.lastMonth.label}
          </div>
          <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>Generated {generated} · Confidential</div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{display:'flex',gap:14,marginBottom:20}}>
        {kpiTile('Total Leads', String(data.thisMonth.kpis.leadsTotal), data.thisMonth.kpis.leadsTotal, data.lastMonth.kpis.leadsTotal, '#7C3AED')}
        {kpiTile('Calls Made', String(data.thisMonth.kpis.callsTotal), data.thisMonth.kpis.callsTotal, data.lastMonth.kpis.callsTotal, '#3B82F6')}
        {kpiTile('Won', String(data.thisMonth.kpis.won), data.thisMonth.kpis.won, data.lastMonth.kpis.won, '#10B981')}
        {kpiTile('Conv Rate', `${data.thisMonth.kpis.convRate}%`, data.thisMonth.kpis.convRate, data.lastMonth.kpis.convRate, '#F59E0B')}
      </div>

      {/* ── Pipeline side-by-side ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div style={card}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>Pipeline</div>
            <span style={{fontSize:10,fontWeight:600,color:'#7C3AED',background:'rgba(124,58,237,0.08)',
              padding:'2px 10px',borderRadius:20,border:'1px solid rgba(124,58,237,0.2)'}}>
              {data.thisMonth.label}
            </span>
          </div>
          <PdfFunnelBars stages={data.thisMonth.funnel}
            maxOverride={Math.max(...data.thisMonth.funnel.map(s=>s.count), ...data.lastMonth.funnel.map(s=>s.count), 1)}/>
        </div>
        <div style={card}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>Pipeline</div>
            <span style={{fontSize:10,fontWeight:600,color:'#3B82F6',background:'rgba(59,130,246,0.08)',
              padding:'2px 10px',borderRadius:20,border:'1px solid rgba(59,130,246,0.2)'}}>
              {data.lastMonth.label}
            </span>
          </div>
          <PdfFunnelBars stages={data.lastMonth.funnel}
            maxOverride={Math.max(...data.thisMonth.funnel.map(s=>s.count), ...data.lastMonth.funnel.map(s=>s.count), 1)}/>
        </div>
      </div>

      {/* ── MoM grouped bar chart ── */}
      <div style={{...card, marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:14}}>Month-over-Month Comparison</div>
        <PdfGroupedBars thisStages={data.thisMonth.funnel} lastStages={data.lastMonth.funnel}/>
      </div>

      {/* ── Team table ── */}
      <div style={{...card, marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:14}}>
          Team Performance — {data.thisMonth.label}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>
              {['Agent','Calls Made','Leads Assigned','Won','Conv Rate'].map(h => (
                <th key={h} style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',
                  color:'#64748B',fontWeight:600,padding:'0 16px 10px 0',textAlign:'left',
                  borderBottom:'2px solid #E2E8F0'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.agents.length === 0
              ? <tr><td colSpan={5} style={{textAlign:'center',color:'#94A3B8',padding:20,fontSize:12}}>No agents found</td></tr>
              : data.agents.map((a, i) => (
                <tr key={a.id}>
                  <td style={{padding:'10px 16px 10px 0',borderBottom: i<data.agents.length-1?'1px solid #F1F5F9':'none',fontWeight:600,color:'#0F172A',fontSize:12}}>{a.name}</td>
                  <td style={{padding:'10px 16px 10px 0',borderBottom: i<data.agents.length-1?'1px solid #F1F5F9':'none',fontWeight:700,color:'#3B82F6',fontSize:12}}>{a.callsThisMonth}</td>
                  <td style={{padding:'10px 16px 10px 0',borderBottom: i<data.agents.length-1?'1px solid #F1F5F9':'none',color:'#334155',fontSize:12}}>{a.leadsAssigned}</td>
                  <td style={{padding:'10px 16px 10px 0',borderBottom: i<data.agents.length-1?'1px solid #F1F5F9':'none',fontWeight:700,color:'#10B981',fontSize:12}}>{a.won}</td>
                  <td style={{padding:'10px 16px 10px 0',borderBottom: i<data.agents.length-1?'1px solid #F1F5F9':'none',fontWeight:600,color:a.convRate>0?'#7C3AED':'#94A3B8',fontSize:12}}>{a.convRate}%</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* ── Sources + Outcomes ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:14}}>Lead Sources</div>
          {data.thisMonth.sources.length === 0
            ? <p style={{color:'#94A3B8',fontSize:12}}>No data</p>
            : <PdfBarList color items={data.thisMonth.sources.map(s=>({label:s.label,count:s.count}))}/>}
        </div>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:14}}>Call Outcomes</div>
          {data.thisMonth.callOutcomes.length === 0
            ? <p style={{color:'#94A3B8',fontSize:12}}>No calls this month</p>
            : <PdfBarList items={data.thisMonth.callOutcomes.map(o=>({label:o.outcome,count:o.count}))}/>}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{borderTop:'1px solid #E2E8F0',paddingTop:10,display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:'#94A3B8'}}>AlgoLend · algolend.co.za · Internal use only</span>
        <span style={{fontSize:10,color:'#94A3B8'}}>{generated}</span>
      </div>
    </div>
  );
}

// ─── PDF download ─────────────────────────────────────────────────────────────

async function downloadPDF(el: HTMLElement, label: string, setLoading: (v:boolean)=>void) {
  setLoading(true);
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1120,
      windowWidth: 1120,
    });

    const img  = canvas.toDataURL('image/jpeg', 0.93);
    const pdf  = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const pw   = pdf.internal.pageSize.getWidth();
    const ph   = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height / canvas.width) * pw;

    let y = 0, page = 0;
    while (y < imgH) {
      if (page > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, -y, pw, imgH);
      y += ph;
      page++;
    }

    pdf.save(`algolend-report-${label.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  } finally {
    setLoading(false);
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(data: ReportData, label: string) {
  const rows: string[][] = [];
  rows.push([`Weekly Report — ${label}`], []);
  rows.push(['KPIs','This Month','Last Month']);
  rows.push(['Leads', String(data.thisMonth.kpis.leadsTotal), String(data.lastMonth.kpis.leadsTotal)]);
  rows.push(['Calls Made', String(data.thisMonth.kpis.callsTotal), String(data.lastMonth.kpis.callsTotal)]);
  rows.push(['Won', String(data.thisMonth.kpis.won), String(data.lastMonth.kpis.won)]);
  rows.push(['Conv Rate', `${data.thisMonth.kpis.convRate}%`, `${data.lastMonth.kpis.convRate}%`]);
  rows.push([]);
  rows.push(['Pipeline (This Month)'], ['Stage','Count','%']);
  data.thisMonth.funnel.forEach(f => rows.push([f.label, String(f.count), `${f.pct}%`]));
  rows.push([]);
  rows.push(['Pipeline (Last Month)'], ['Stage','Count','%']);
  data.lastMonth.funnel.forEach(f => rows.push([f.label, String(f.count), `${f.pct}%`]));
  rows.push([]);
  rows.push(['Team Performance'], ['Name','Calls','Leads','Won','Conv Rate']);
  data.agents.forEach(a => rows.push([a.name, String(a.callsThisMonth), String(a.leadsAssigned), String(a.won), `${a.convRate}%`]));
  rows.push([]);
  rows.push(['Lead Sources'], ['Source','Count']);
  data.thisMonth.sources.forEach(s => rows.push([s.label, String(s.count)]));

  const csv  = rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `algolend-${label.toLowerCase().replace(/\s+/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function monthParam(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data,       setData]       = useState<ReportData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [offset,     setOffset]     = useState(0);
  const pdfRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?month=${monthParam(offset)}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">

      {/* Hidden PDF render zone */}
      {data && <PdfZone data={data} innerRef={pdfRef}/>}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{color:'var(--color-text)'}}>Weekly Report</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text3)'}}>
            Pipeline & team performance — {data?.thisMonth.label ?? '…'} vs {data?.lastMonth.label ?? '…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl px-1 py-1"
            style={{background:'var(--color-surface2)',border:'1px solid var(--color-border2)'}}>
            <button onClick={() => setOffset(o => o-1)}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{color:'var(--color-text3)'}}>
              <ChevronLeft size={14}/>
            </button>
            <span className="text-xs font-semibold px-2 tabular-nums" style={{color:'var(--color-text)'}}>
              {data?.thisMonth.label ?? '—'}
            </span>
            <button onClick={() => setOffset(o => Math.min(o+1, 0))} disabled={offset===0}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
              style={{color:'var(--color-text3)'}}>
              <ChevronRight size={14}/>
            </button>
          </div>

          {data && (
            <>
              <button onClick={() => exportCSV(data, data.thisMonth.label)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:-translate-y-px transition-all"
                style={{background:'rgba(167,139,250,0.08)',color:'#A78BFA',border:'1px solid rgba(167,139,250,0.2)'}}>
                <Download size={13}/> CSV
              </button>

              <button
                onClick={() => pdfRef.current && downloadPDF(pdfRef.current, data.thisMonth.label, setPdfLoading)}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:-translate-y-px transition-all disabled:opacity-60"
                style={{background:'rgba(96,165,250,0.1)',color:'#60A5FA',border:'1px solid rgba(96,165,250,0.25)'}}>
                {pdfLoading
                  ? <><Loader2 size={13} className="animate-spin"/> Generating…</>
                  : <><Download size={13}/> Save as PDF</>}
              </button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{borderColor:'var(--color-violet)',borderTopColor:'transparent'}}/>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Users size={14}/>}     label="Leads"       thisVal={data.thisMonth.kpis.leadsTotal} lastVal={data.lastMonth.kpis.leadsTotal}/>
            <KpiCard icon={<Phone size={14}/>}     label="Calls Made"  thisVal={data.thisMonth.kpis.callsTotal} lastVal={data.lastMonth.kpis.callsTotal}/>
            <KpiCard icon={<Trophy size={14}/>}    label="Won"         thisVal={data.thisMonth.kpis.won}        lastVal={data.lastMonth.kpis.won}/>
            <KpiCard icon={<BarChart2 size={14}/>} label="Conv Rate"   thisVal={data.thisMonth.kpis.convRate}   lastVal={data.lastMonth.kpis.convRate} fmt={v=>`${v}%`}/>
          </div>

          {/* Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { period: data.thisMonth, color:'#A78BFA', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.2)' },
              { period: data.lastMonth, color:'#60A5FA', bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.2)'  },
            ].map(({ period, color, bg, border }) => (
              <div key={period.label} className="bento-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-bold" style={{color:'var(--color-text)'}}>Pipeline</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{background:bg, color, border:`1px solid ${border}`}}>
                    {period.label}
                  </span>
                </div>
                <ScreenFunnelBar stages={period.funnel}/>
              </div>
            ))}
          </div>

          {/* Team table */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-bold mb-4" style={{color:'var(--color-text)'}}>
              Team Performance — {data.thisMonth.label}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{borderBottom:'1px solid var(--color-border2)'}}>
                    {['Agent','Calls Made','Leads Assigned','Won','Conv Rate'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold pr-4 last:pr-0"
                        style={{color:'var(--color-text3)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a, i) => (
                    <tr key={a.id} style={{borderBottom: i<data.agents.length-1?'1px solid var(--color-border2)':'none'}}>
                      <td className="py-3 pr-4 font-semibold" style={{color:'var(--color-text)'}}>{a.name}</td>
                      <td className="py-3 pr-4 tabular-nums font-bold" style={{color:'#60A5FA'}}>{a.callsThisMonth}</td>
                      <td className="py-3 pr-4 tabular-nums" style={{color:'var(--color-text2)'}}>{a.leadsAssigned}</td>
                      <td className="py-3 pr-4 tabular-nums font-bold" style={{color:'#34D399'}}>{a.won}</td>
                      <td className="py-3 tabular-nums" style={{color:a.convRate>0?'#A78BFA':'var(--color-text3)'}}>{a.convRate}%</td>
                    </tr>
                  ))}
                  {data.agents.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center" style={{color:'var(--color-text3)'}}>No agents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sources + Call outcomes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bento-card p-5">
              <h2 className="text-sm font-bold mb-4" style={{color:'var(--color-text)'}}>Lead Sources</h2>
              <div className="space-y-3">
                {data.thisMonth.sources.map((s, i) => {
                  const max = data.thisMonth.sources[0]?.count ?? 1;
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium" style={{color:'var(--color-text2)'}}>{s.label}</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{color:'var(--color-text)'}}>{s.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{background:'var(--color-surface2)'}}>
                        <div className="h-1.5 rounded-full" style={{width:`${(s.count/max)*100}%`,background:C[i%C.length]}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bento-card p-5">
              <h2 className="text-sm font-bold mb-4" style={{color:'var(--color-text)'}}>Call Outcomes</h2>
              <div className="space-y-2.5">
                {data.thisMonth.callOutcomes.map((o, i) => {
                  const max = data.thisMonth.callOutcomes[0]?.count ?? 1;
                  return (
                    <div key={o.outcome} className="flex items-center gap-3">
                      <span className="text-[11px] w-28 truncate font-medium" style={{color:'var(--color-text2)'}}>{o.outcome}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{background:'var(--color-surface2)'}}>
                        <div className="h-1.5 rounded-full" style={{width:`${(o.count/max)*100}%`,background:C[i%C.length]}}/>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{color:'var(--color-text)'}}>{o.count}</span>
                    </div>
                  );
                })}
                {data.thisMonth.callOutcomes.length === 0 && (
                  <p className="text-xs py-4 text-center" style={{color:'var(--color-text3)'}}>No calls this month</p>
                )}
              </div>
            </div>
          </div>

          {/* MoM summary */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-bold mb-4" style={{color:'var(--color-text)'}}>Month-over-Month Summary</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {data.thisMonth.funnel.map((stage, i) => {
                const last = data.lastMonth.funnel.find(s => s.key === stage.key);
                const d = last ? pct(stage.count, last.count) : null;
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center rounded-xl px-3 py-2.5 min-w-[90px]"
                      style={{background:'var(--color-surface2)',border:'1px solid var(--color-border2)'}}>
                      <span className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{color:'var(--color-text3)'}}>{stage.label}</span>
                      <span className="text-base font-bold tabular-nums" style={{color:C[i%C.length]}}>{stage.count}</span>
                      {d !== null && (
                        <span className="text-[9px] mt-0.5 font-semibold"
                          style={{color:d>0?'#34D399':d<0?'#F87171':'#94A3B8'}}>
                          {d>0?'+':''}{d}%
                        </span>
                      )}
                    </div>
                    {i < data.thisMonth.funnel.length-1 && <ArrowRight size={12} style={{color:'var(--color-text3)'}}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
