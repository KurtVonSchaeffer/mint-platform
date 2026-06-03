import { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  FileText, Download, Upload, CheckCircle, Clock, Trash2,
} from 'lucide-react';

interface Document {
  id:       string;
  name:     string;
  category: 'identity' | 'financial' | 'bank' | 'contract' | 'other';
  size:     number;
  uploaded: string;
  status:   'uploaded' | 'verified' | 'pending';
}

const INITIAL_DOCS: Document[] = [
  { id: 'd1', name: 'CIPC_Certificate_2024.pdf',  category: 'identity', size: 482_133,   uploaded: '2026-04-12', status: 'verified' },
  { id: 'd2', name: 'Director_ID_Nkosi.pdf',      category: 'identity', size: 218_904,   uploaded: '2026-04-12', status: 'verified' },
  { id: 'd3', name: 'Bank_Statement_Mar2026.pdf', category: 'bank',     size: 1_204_811, uploaded: '2026-04-20', status: 'verified' },
  { id: 'd4', name: 'Bank_Statement_Apr2026.pdf', category: 'bank',     size: 1_180_440, uploaded: '2026-05-12', status: 'verified' },
  { id: 'd5', name: 'Bank_Statement_May2026.pdf', category: 'bank',     size: 1_320_011, uploaded: '2026-05-22', status: 'pending' },
  { id: 'd6', name: 'Loan_Agreement_LN-001.pdf',  category: 'contract', size: 89_120,    uploaded: '2026-05-08', status: 'verified' },
];

const categoryLabel: Record<Document['category'], string> = {
  identity:  'Identity',
  financial: 'Financials',
  bank:      'Bank',
  contract:  'Contracts',
  other:     'Other',
};

const statusConfig: Record<Document['status'], { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle, label: 'Verified' },
  pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Clock,       label: 'Pending' },
  uploaded: { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Upload,      label: 'Uploaded' },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>(INITIAL_DOCS);
  const [filter, setFilter] = useState<'all' | Document['category']>('all');
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newDocs: Document[] = Array.from(files).map((f, i) => ({
      id:       `d-${Date.now()}-${i}`,
      name:     f.name,
      category: 'other',
      size:     f.size,
      uploaded: new Date().toISOString().slice(0, 10),
      status:   'pending',
    }));
    setDocs((prev) => [...newDocs, ...prev]);
    showToast(`${newDocs.length} file${newDocs.length === 1 ? '' : 's'} uploaded.`);
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(id: string) {
    const doc = docs.find((d) => d.id === id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    showToast(`${doc?.name ?? 'Document'} removed.`);
  }

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.category === filter);

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-lg" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Documents</h1>
          <p className="text-[var(--color-ink-soft)] text-sm mt-1">All files securely stored. Encrypted at rest.</p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload size={14} /> Upload
        </Button>
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'identity', 'bank', 'financial', 'contract', 'other'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : categoryLabel[f]}
            {f !== 'all' ? <span className="ml-1.5 opacity-60">{docs.filter((d) => d.category === f).length}</span> : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={28} className="mx-auto text-[var(--color-ink-muted)] mb-3" />
          <p className="text-sm font-semibold text-[var(--color-ink-2)] mb-1">No documents</p>
          <p className="text-xs text-[var(--color-ink-soft)] mb-5">Upload your first document to get started.</p>
          <Button onClick={() => inputRef.current?.click()}><Upload size={14} /> Upload</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-slate-100">
            {filtered.map((doc, i) => {
              const cfg = statusConfig[doc.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={doc.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-[var(--color-surface-2)]/60 transition-colors"
                  style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-3)] flex items-center justify-center shrink-0">
                    <FileText size={17} className="text-[var(--color-ink-soft)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{doc.name}</p>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                      {categoryLabel[doc.category]} · {fmtSize(doc.size)} · Uploaded {doc.uploaded}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                    <Icon size={10} />
                    {cfg.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button title="Download" onClick={() => showToast(`${doc.name} download started.`)} className="p-2 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-3)] transition-colors">
                      <Download size={14} />
                    </button>
                    <button title="Remove" onClick={() => remove(doc.id)} className="p-2 rounded-lg text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-muted)]/20 transition-colors cursor-pointer" onClick={() => inputRef.current?.click()}>
        <Upload size={20} className="mx-auto text-[var(--color-ink-muted)] mb-2" />
        <p className="text-sm font-semibold text-[var(--color-ink-2)]">Drop files here or click to upload</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-1">PDF, JPG, PNG up to 10 MB each</p>
      </div>
    </div>
  );
}
