'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileUp, CheckCircle2, Clock, X, Upload, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';

interface LeadDoc {
  id: string;
  lead_id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  leads: { name: string; company: string } | null;
}

interface AgentLead {
  id: string;
  name: string;
  company: string;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPageInner() {
  const searchParams      = useSearchParams();
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const [docs,     setDocs]     = useState<LeadDoc[]>([]);
  const [leads,    setLeads]    = useState<AgentLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>(searchParams.get('lead') ?? '');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [agentId,  setAgentId]  = useState<string>('');

  const loadDocs = useCallback(async (aid: string) => {
    const res = await fetch(`/api/telemarketer/documents?agent_id=${aid}`);
    if (res.ok) {
      const { documents } = await res.json();
      setDocs(documents ?? []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const aid = await getAgentId();
      setAgentId(aid);
      const [docsRes, leadsRes] = await Promise.all([
        fetch(`/api/telemarketer/documents?agent_id=${aid}`),
        fetch(`/api/leads?assigned_to=${aid}`),
      ]);
      if (docsRes.ok) {
        const { documents } = await docsRes.json();
        setDocs(documents ?? []);
      }
      if (leadsRes.ok) {
        const { leads: rawLeads } = await leadsRes.json();
        setLeads((rawLeads ?? []).map((l: Record<string, string>) => ({ id: l.id, name: l.name, company: l.company ?? '' })));
      }
      setLoading(false);
    }
    init();
  }, [loadDocs]);

  async function handleFiles(files: FileList) {
    if (!selectedLead) {
      alert('Please select a client before uploading.');
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('lead_id', selectedLead);
      fd.append('agent_id', agentId);
      await fetch('/api/telemarketer/documents', { method: 'POST', body: fd });
    }
    await loadDocs(agentId);
    setUploading(false);
  }

  async function handleDelete(docId: string, storagePath: string) {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/telemarketer/documents?id=${docId}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== docId));
    void storagePath;
  }

  const filteredDocs = selectedLead ? docs.filter(d => d.lead_id === selectedLead) : docs;
  const selectedLeadObj = leads.find(l => l.id === selectedLead);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Client documents</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Documents</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            Upload client documents to progress their onboarding through compliance
          </p>
        </div>
        <button onClick={() => loadDocs(agentId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Client selector */}
      <div className="bento-card p-5">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text3)' }}>Select client to upload for</p>
        {loading ? (
          <div className="flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-violet)' }} /></div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedLead}
              onChange={e => setSelectedLead(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-sm appearance-none"
              style={{
                background: 'var(--color-surface2)',
                border: '1px solid var(--color-border2)',
                color: selectedLead ? 'var(--color-text)' : 'var(--color-text3)',
                minWidth: 200,
              }}>
              <option value="">— All clients —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} · {l.company}</option>
              ))}
            </select>
            {selectedLead && (
              <button onClick={() => setSelectedLead('')}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg"
                style={{ color: 'var(--color-text3)', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div
        className="rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer"
        style={{
          borderColor: !selectedLead ? 'var(--color-border2)' : dragOver ? 'var(--color-violet)' : 'rgba(124,58,237,0.3)',
          background: dragOver ? 'rgba(124,58,237,0.04)' : 'var(--color-surface2)',
          opacity: !selectedLead ? 0.5 : 1,
        }}
        onDragOver={e => { if (!selectedLead) return; e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => selectedLead && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: dragOver ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', color: 'var(--color-violet)' }}>
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <FileUp size={24} />}
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {uploading ? 'Uploading…' : dragOver ? 'Drop files here' : selectedLead ? 'Drop files or click to upload' : 'Select a client above first'}
          </p>
          {selectedLead && !uploading && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              For: <strong style={{ color: selectedLeadObj?.name ? 'var(--color-text)' : 'var(--color-text3)' }}>{selectedLeadObj?.name ?? ''}</strong> · PDF, JPG, PNG — max 10 MB
            </p>
          )}
        </div>
        {selectedLead && !uploading && (
          <button className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-sm mt-2" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <Upload size={14} /> Browse Files
          </button>
        )}
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bento-card p-10 text-center">
          <Clock size={22} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            {selectedLead ? 'No documents uploaded for this client yet.' : 'No documents uploaded yet.'}
          </p>
          {!selectedLead && leads.length === 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-text3)' }}>
              You have no leads assigned yet. <Link href="/telemarketer/leads" style={{ color: 'var(--color-violet)' }}>Go to My Leads →</Link>
            </p>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <CheckCircle2 size={14} style={{ color: '#34D399' }} />
            {selectedLead ? `Documents for ${selectedLeadObj?.name ?? 'client'}` : 'All Documents'}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
              {filteredDocs.length}
            </span>
          </h2>
          <div className="space-y-2">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="bento-card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)' }}>
                  <FileUp size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{doc.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                    {doc.leads?.name ?? ''}{doc.leads?.company ? ` · ${doc.leads.company}` : ''}
                    {doc.file_type ? ` · ${doc.file_type.split('/').pop()}` : ''}
                    {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                    {' · '}{new Date(doc.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => handleDelete(doc.id, '')}
                  className="p-1.5 rounded-lg transition-colors shrink-0"
                  style={{ color: 'var(--color-text3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsPageInner />
    </Suspense>
  );
}
