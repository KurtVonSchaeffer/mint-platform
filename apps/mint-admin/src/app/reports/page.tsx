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

// ─── PDF chart helpers (div-based for reliable html2canvas rendering) ─────────

// Square-root scale so skewed data (e.g. 7700 vs 42) still renders visible bars.
// Returns a pixel width for a 380px track.
const TRACK = 380;
function sqrtW(count: number, max: number): number {
  if (max === 0 || count === 0) return 0;
  return Math.max(Math.round((Math.sqrt(count) / Math.sqrt(max)) * TRACK), 8);
}

function PdfHBar({ label, count, sqrtMax, pct: pctVal, color }: {
  label: string; count: number; sqrtMax: number; pct: number; color: string;
}) {
  const w = sqrtW(count, sqrtMax);
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:11,color:'#374151',fontWeight:500,flex:1,paddingRight:8}}>{label}</span>
        <span style={{fontSize:12,color:'#111827',fontWeight:800,minWidth:40,textAlign:'right'}}>{count.toLocaleString()}</span>
        <span style={{fontSize:10,color:'#9CA3AF',minWidth:34,textAlign:'right',paddingLeft:4}}>{pctVal}%</span>
      </div>
      <div style={{background:'#E5E7EB',borderRadius:6,height:13,width:TRACK,position:'relative',overflow:'hidden'}}>
        {w > 0 && <div style={{background:color,height:13,width:w,borderRadius:6}}/>}
      </div>
    </div>
  );
}

function PdfFunnelBars({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div>
      {stages.map((s, i) => (
        <PdfHBar key={s.key} label={s.label} count={s.count} sqrtMax={max} pct={s.pct} color={C[i%C.length]}/>
      ))}
    </div>
  );
}

function PdfGroupedBars({ thisStages, lastStages }: { thisStages: FunnelStage[]; lastStages: FunnelStage[] }) {
  const max = Math.max(...thisStages.map(s=>s.count), ...lastStages.map(s=>s.count), 1);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:'#7C3AED'}}/>
          <span style={{fontSize:11,color:'#374151',fontWeight:600,fontFamily:FONT}}>This month</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:'#D1D5DB'}}/>
          <span style={{fontSize:11,color:'#9CA3AF',fontFamily:FONT}}>Last month</span>
        </div>
        <span style={{fontSize:10,color:'#9CA3AF',fontFamily:FONT,marginLeft:'auto'}}>√ scale — bars show relative size</span>
      </div>
      {thisStages.map((s, i) => {
        const last = lastStages.find(l => l.key === s.key);
        const color = C[i%C.length];
        const tw = sqrtW(s.count, max);
        const lw = last ? sqrtW(last.count, max) : 0;
        const d = last && last.count > 0 ? Math.round((s.count - last.count)/last.count*100) : null;
        const dColor = d === null ? '#9CA3AF' : d > 0 ? '#059669' : d < 0 ? '#DC2626' : '#9CA3AF';
        return (
          <div key={s.key} style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,color:'#374151',fontWeight:600,fontFamily:FONT}}>{s.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:dColor,fontFamily:FONT}}>
                {d !== null ? `${d>0?'+':''}${d}%` : '—'}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
              <span style={{width:54,fontSize:10,color:'#6B7280',textAlign:'right',flexShrink:0,fontFamily:FONT}}>{s.count.toLocaleString()}</span>
              <div style={{background:'#F3F4F6',borderRadius:4,height:11,width:TRACK,position:'relative',overflow:'hidden'}}>
                {tw > 0 && <div style={{background:color,height:11,width:tw,borderRadius:4}}/>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:54,fontSize:10,color:'#9CA3AF',textAlign:'right',flexShrink:0,fontFamily:FONT}}>{(last?.count ?? 0).toLocaleString()}</span>
              <div style={{background:'#F3F4F6',borderRadius:4,height:11,width:TRACK,position:'relative',overflow:'hidden'}}>
                {lw > 0 && <div style={{background:'#D1D5DB',height:11,width:lw,borderRadius:4}}/>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PdfBarList({ items, useColors }: { items:{label:string;count:number}[]; useColors?: boolean }) {
  const max = Math.max(...items.map(i=>i.count), 1);
  return (
    <div>
      {items.map((item, i) => {
        const w = sqrtW(item.count, max);
        const color = useColors ? C[i%C.length] : '#7C3AED';
        return (
          <div key={item.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,color:'#374151',fontWeight:500,fontFamily:FONT}}>{item.label}</span>
              <span style={{fontSize:12,color:'#111827',fontWeight:700,fontFamily:FONT}}>{item.count.toLocaleString()}</span>
            </div>
            <div style={{background:'#E5E7EB',borderRadius:5,height:11,width:TRACK,position:'relative',overflow:'hidden'}}>
              {w > 0 && <div style={{background:color,height:11,width:w,borderRadius:5}}/>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PDF render zone (captured by html2canvas) ────────────────────────────────

const FONT = '-apple-system,Segoe UI,Arial,sans-serif';

function PdfZone({ data, innerRef }: { data: ReportData; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const generated = new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });

  const card: React.CSSProperties = {
    background:'#ffffff', border:'1px solid #E5E7EB',
    borderRadius:12, padding:'16px 18px',
  };

  const kpis = [
    { label:'Total Leads', val:String(data.thisMonth.kpis.leadsTotal), curr:data.thisMonth.kpis.leadsTotal, prev:data.lastMonth.kpis.leadsTotal, accent:'#7C3AED' },
    { label:'Calls Made',  val:String(data.thisMonth.kpis.callsTotal), curr:data.thisMonth.kpis.callsTotal, prev:data.lastMonth.kpis.callsTotal, accent:'#2563EB' },
    { label:'Won',         val:String(data.thisMonth.kpis.won),        curr:data.thisMonth.kpis.won,        prev:data.lastMonth.kpis.won,        accent:'#059669' },
    { label:'Conv Rate',   val:`${data.thisMonth.kpis.convRate}%`,     curr:data.thisMonth.kpis.convRate,   prev:data.lastMonth.kpis.convRate,   accent:'#D97706' },
  ];

  return (
    <div
      ref={innerRef}
      style={{ position:'absolute', left:'-9999px', top:0, width:1120,
        background:'#F3F4F6', fontFamily:FONT, padding:'0 0 40px', boxSizing:'border-box' }}
    >
      {/* ── Header banner ── */}
      <div style={{ background:'#3B0764', padding:'26px 40px', marginBottom:24,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:28, fontWeight:900, color:'#ffffff', letterSpacing:'-0.5px', lineHeight:1 }}>AlgoLend</div>
          <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.14em', color:'#C4B5FD', marginTop:4 }}>Admin Console</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#A78BFA', marginBottom:5 }}>Weekly Performance Report</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#ffffff', lineHeight:1 }}>{data.thisMonth.label}</div>
          <div style={{ fontSize:11, color:'#C4B5FD', marginTop:5 }}>
            vs {data.lastMonth.label} &nbsp;·&nbsp; {generated} &nbsp;·&nbsp; Confidential
          </div>
        </div>
      </div>

      <div style={{ padding:'0 40px' }}>

        {/* ── KPIs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {kpis.map(k => {
            const d = k.prev > 0 ? Math.round((k.curr - k.prev)/k.prev*100) : null;
            const dColor = d === null ? '#6B7280' : d > 0 ? '#15803D' : d < 0 ? '#B91C1C' : '#6B7280';
            const arrow  = d === null ? '' : d > 0 ? '▲' : d < 0 ? '▼' : '→';
            return (
              <div key={k.label} style={{ background:'#ffffff', borderRadius:12, overflow:'hidden',
                border:'1px solid #E5E7EB' }}>
                <div style={{ background:k.accent, padding:'10px 16px' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.1em', color:'rgba(255,255,255,0.85)', fontFamily:FONT }}>{k.label}</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:38, fontWeight:900, color:'#111827', lineHeight:1,
                    letterSpacing:'-1.5px', fontFamily:FONT }}>{k.val}</div>
                  <div style={{ marginTop:8, fontSize:11, color:dColor, fontWeight:700, fontFamily:FONT }}>
                    {d !== null
                      ? `${arrow} ${Math.abs(d)}% vs last month`
                      : <span style={{ color:'#9CA3AF' }}>No prior data</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pipeline side-by-side ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          {[
            { period:data.thisMonth, accent:'#7C3AED', badgeColor:'#EDE9FE', badgeText:'#5B21B6' },
            { period:data.lastMonth, accent:'#1D4ED8', badgeColor:'#DBEAFE', badgeText:'#1E40AF' },
          ].map(({ period, accent, badgeColor, badgeText }) => (
            <div key={period.label} style={card}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:4, height:20, background:accent, borderRadius:2, flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Pipeline</span>
                <span style={{ fontSize:10, fontWeight:700, color:badgeText, background:badgeColor,
                  padding:'3px 10px', borderRadius:20, fontFamily:FONT }}>{period.label}</span>
              </div>
              <PdfFunnelBars stages={period.funnel}/>
            </div>
          ))}
        </div>

        {/* ── MoM comparison ── */}
        <div style={{ ...card, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:'#7C3AED', borderRadius:2 }}/>
            <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Month-over-Month Comparison</span>
          </div>
          <PdfGroupedBars thisStages={data.thisMonth.funnel} lastStages={data.lastMonth.funnel}/>
        </div>

        {/* ── Team table ── */}
        <div style={{ ...card, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:'#059669', borderRadius:2 }}/>
            <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Team Performance — {data.thisMonth.label}</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:FONT }}>
            <thead>
              <tr style={{ background:'#1E1B4B' }}>
                {[
                  { h:'Agent',          w:'30%' },
                  { h:'Calls Made',     w:'17%' },
                  { h:'Leads Assigned', w:'20%' },
                  { h:'Won',            w:'13%' },
                  { h:'Conv Rate',      w:'20%' },
                ].map(col => (
                  <th key={col.h} style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.07em',
                    color:'#C4B5FD', fontWeight:700, padding:'10px 14px', textAlign:'left',
                    width:col.w, fontFamily:FONT }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.agents.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', color:'#9CA3AF', padding:'20px', fontSize:12, fontFamily:FONT }}>No agents found</td></tr>
                : data.agents.map((a, i) => (
                  <tr key={a.id} style={{ background: i%2===0 ? '#ffffff' : '#F9FAFB' }}>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:'#111827', fontSize:13, fontFamily:FONT, borderBottom:'1px solid #F3F4F6' }}>{a.name}</td>
                    <td style={{ padding:'10px 14px', fontWeight:800, color:'#1D4ED8', fontSize:16, fontFamily:FONT, borderBottom:'1px solid #F3F4F6' }}>{a.callsThisMonth}</td>
                    <td style={{ padding:'10px 14px', color:'#374151', fontSize:13, fontFamily:FONT, borderBottom:'1px solid #F3F4F6' }}>{a.leadsAssigned}</td>
                    <td style={{ padding:'10px 14px', fontWeight:800, color:'#059669', fontSize:16, fontFamily:FONT, borderBottom:'1px solid #F3F4F6' }}>{a.won}</td>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:a.convRate>0?'#6D28D9':'#9CA3AF', fontSize:13, fontFamily:FONT, borderBottom:'1px solid #F3F4F6' }}>{a.convRate}%</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Sources + Outcomes ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:4, height:20, background:'#2563EB', borderRadius:2 }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Lead Sources</span>
            </div>
            {data.thisMonth.sources.length === 0
              ? <p style={{color:'#9CA3AF',fontSize:12,fontFamily:FONT}}>No data</p>
              : <PdfBarList useColors items={data.thisMonth.sources.map(s=>({label:s.label,count:s.count}))}/>}
          </div>
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:4, height:20, background:'#D97706', borderRadius:2 }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Call Outcomes</span>
            </div>
            {data.thisMonth.callOutcomes.length === 0
              ? <p style={{color:'#9CA3AF',fontSize:12,fontFamily:FONT}}>No calls this month</p>
              : <PdfBarList items={data.thisMonth.callOutcomes.map(o=>({label:o.outcome,count:o.count}))}/>}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          paddingTop:16, borderTop:'2px solid #DDD6FE' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#7C3AED' }}/>
            <span style={{ fontSize:11, color:'#6B7280', fontFamily:FONT }}>AlgoLend · algolend.co.za · Internal use only</span>
          </div>
          <span style={{ fontSize:11, color:'#6B7280', fontFamily:FONT }}>{generated}</span>
        </div>

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
