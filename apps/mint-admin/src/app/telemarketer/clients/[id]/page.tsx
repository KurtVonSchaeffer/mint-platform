'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CheckCircle2, Loader2, FileUp, Phone, Mail, Building2 } from 'lucide-react';

type ClientStage =
  | 'Converted' | 'Documents Uploaded' | 'Compliance Review'
  | 'Compliance Approved' | 'First Deduction Scheduled'
  | 'First Deduction Successful' | 'Client Live';

const PIPELINE: { stage: ClientStage; color: string }[] = [
  { stage: 'Converted',                  color: '#A78BFA' },
  { stage: 'Documents Uploaded',         color: '#60A5FA' },
  { stage: 'Compliance Review',          color: '#FBBF24' },
  { stage: 'Compliance Approved',        color: '#34D399' },
  { stage: 'First Deduction Scheduled',  color: '#34D399' },
  { stage: 'First Deduction Successful', color: '#10B981' },
  { stage: 'Client Live',                color: '#10B981' },
];

interface LeadDoc { id: string; name: string; file_type: string | null; created_at: string }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead,    setLead]    = useState<Record<string, string> | null>(null);
  const [docs,    setDocs]    = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [leadRes, docsRes] = await Promise.all([
        fetch(`/api/leads/${id}`).then(r => r.json()),
        fetch(`/api/telemarketer/documents?lead_id=${id}`).then(r => r.json()),
      ]);
      if (leadRes.lead) setLead(leadRes.lead);
      setDocs(docsRes.documents ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
    </div>
  );

  if (!lead) return (
    <div className="bento-card p-12 text-center">
      <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Client not found.</p>
      <Link href="/telemarketer/clients" className="text-xs mt-2 inline-block" style={{ color: 'var(--color-violet)' }}>← Back</Link>
    </div>
  );

  const currentStage = (lead.client_stage as ClientStage) ?? 'Converted';
  const currentIdx   = PIPELINE.findIndex(p => p.stage === currentStage);

  return (
    <div className="space-y-6 page-enter">
      <div>
        <Link href="/telemarketer/clients" className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
          style={{ color: 'var(--color-text3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
          <ChevronLeft size={13} /> My Clients
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
            {lead.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>{lead.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text3)' }}><Building2 size={12} /> {lead.company}</span>
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text3)' }}><Phone size={12} /> {lead.phone}</a>}
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text3)' }}><Mail size={12} /> {lead.email}</a>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline tracker */}
      <div className="bento-card p-6">
        <h2 className="text-sm font-bold mb-6" style={{ color: 'var(--color-text)' }}>Client Pipeline</h2>
        <div className="space-y-3">
          {PIPELINE.map(({ stage, color }, i) => {
            const done    = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: done ? (current ? color : `${color}20`) : 'var(--color-surface2)',
                    color:      done ? (current ? 'white' : color) : 'var(--color-text3)',
                    boxShadow:  current ? `0 0 16px ${color}60` : 'none',
                  }}>
                  {done && !current ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                <p className="text-sm font-medium" style={{ color: done ? (current ? 'var(--color-text)' : color) : 'var(--color-text3)' }}>
                  {stage}
                </p>
                {current && (
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                    CURRENT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents */}
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Documents</h2>
          <Link href={`/telemarketer/documents?lead=${id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}>
            <FileUp size={10} /> Upload
          </Link>
        </div>
        {docs.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text3)' }}>No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
                  <FileUp size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{doc.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
                    {doc.file_type ?? 'document'} · {new Date(doc.created_at).toLocaleDateString('en-ZA')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
