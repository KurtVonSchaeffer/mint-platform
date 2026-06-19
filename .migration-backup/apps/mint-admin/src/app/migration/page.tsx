'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import type { MigrationSummary, MigrationRowResult } from '@/lib/migration';
import {
  Upload, Download, CheckCircle, AlertCircle, SkipForward,
  Loader2, ArrowRight, RefreshCw, FileSpreadsheet, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
interface Client { id: string; name: string; slug: string; }
type Stage = 'setup' | 'preview' | 'importing' | 'done';

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}
void fmt; // used in column docs tooltip only

function actionBadge(action: MigrationRowResult['action']) {
  if (action === 'create') return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}
    >
      <CheckCircle size={9} /> Create
    </span>
  );
  if (action === 'skip') return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(75,80,128,0.15)', color: 'var(--color-text3)', border: '1px solid rgba(75,80,128,0.25)' }}
    >
      <SkipForward size={9} /> Skip
    </span>
  );
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-red)', border: '1px solid rgba(248,113,113,0.2)' }}
    >
      <AlertCircle size={9} /> Error
    </span>
  );
}

/* ─── Result table ────────────────────────────────────────────────── */
function ResultTable({ summary, label }: { summary: MigrationSummary; label: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors"
        style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text2)' }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
      >
        <span>{label} — {summary.total} rows</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border2)', background: 'var(--color-faint-bg)' }}>
                {['#', 'Reference', 'Borrower', 'Action', 'Schedule rows', 'Note'].map((h, i) => (
                  <th
                    key={h}
                    className="px-4 py-2 font-semibold text-left"
                    style={{ color: 'var(--color-text3)', width: i === 0 ? '40px' : undefined }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr
                  key={r.rowIndex}
                  style={{
                    borderBottom: '1px solid var(--color-row-border)',
                    background: r.action === 'error' ? 'rgba(248,113,113,0.04)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-2 font-mono" style={{ color: 'var(--color-text3)' }}>{r.rowIndex}</td>
                  <td className="px-4 py-2 font-mono font-semibold" style={{ color: 'var(--color-text)' }}>{r.legacyReference}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--color-text2)' }}>{r.borrowerEmail}</td>
                  <td className="px-4 py-2">{actionBadge(r.action)}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--color-text3)' }}>{r.scheduleRows ?? '—'}</td>
                  <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--color-text3)' }} title={r.reason ?? undefined}>{r.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Stat chip ──────────────────────────────────────────────────── */
function Stat({ value, label, color, bg, border }: { value: number; label: string; color: string; bg: string; border: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-70" style={{ color }}>{label}</p>
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────── */
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0"
      style={done ? {
        background: 'var(--color-green)',
        color: 'white',
      } : {
        background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
        color: 'white',
        boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
      }}
    >
      {done ? <CheckCircle size={12} /> : n}
    </span>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function MigrationPage() {
  const [clients, setClients]           = useState<Client[]>([]);
  const [clientId, setClientId]         = useState('');
  const [stage, setStage]               = useState<Stage>('setup');
  const [file, setFile]                 = useState<File | null>(null);
  const [parseErrors, setParseErrors]   = useState<string[]>([]);
  const [preview, setPreview]           = useState<MigrationSummary | null>(null);
  const [result, setResult]             = useState<MigrationSummary | null>(null);
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleFile = useCallback((picked: File | null) => {
    setFile(picked); setParseErrors([]); setPreview(null); setError(null);
    if (picked) setStage('setup');
  }, []);

  async function runPreview() {
    if (!file || !clientId) return;
    setBusy(true); setError(null); setParseErrors([]);
    try {
      const body = new FormData(); body.append('file', file);
      const res  = await fetch(`/api/migration/loans?clientId=${clientId}&dryRun=true`, { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) { if (json.parseErrors) setParseErrors(json.parseErrors); else setError(json.error ?? 'Unknown error'); return; }
      setPreview(json as MigrationSummary); setStage('preview');
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setBusy(false); }
  }

  async function runImport() {
    if (!file || !clientId || !preview) return;
    setBusy(true); setError(null); setStage('importing');
    try {
      const body = new FormData(); body.append('file', file);
      const res  = await fetch(`/api/migration/loans?clientId=${clientId}&dryRun=false`, { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Import failed'); setStage('preview'); return; }
      setResult(json as MigrationSummary); setStage('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); setStage('preview'); }
    finally { setBusy(false); }
  }

  function reset() {
    setFile(null); setParseErrors([]); setPreview(null); setResult(null); setError(null); setStage('setup');
    if (fileRef.current) fileRef.current.value = '';
  }

  const selectedClient = clients.find((c) => c.id === clientId);
  const canPreview     = !!file && !!clientId && !busy;
  const hasErrors      = preview ? preview.errors > 0 : false;

  return (
    <Shell>
      <div className="max-w-4xl space-y-8 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Data Migration</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Import Loan Book</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Upload a client's existing loan portfolio. Validates first — no data is written until you confirm.
            </p>
          </div>
          {stage !== 'setup' ? (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <RefreshCw size={14} /> Start over
            </button>
          ) : null}
        </div>

        {/* ── Step 1: Setup ── */}
        <div className="bento-card p-6 space-y-6">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StepBadge n={1} />
            Client &amp; File
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Client picker */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>
                Select client <span style={{ color: 'var(--color-red)' }}>*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="field-input w-full cursor-pointer"
                disabled={stage === 'done'}
              >
                <option value="">— choose a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Template download */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>Download template</label>
              <a
                href="/api/migration/loans"
                download="loanbook-import-template.csv"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Download size={14} /> loanbook-import-template.csv
              </a>
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>
              CSV file <span style={{ color: 'var(--color-red)' }}>*</span>
            </label>
            <label
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all"
              style={file ? {
                borderColor: 'rgba(52,211,153,0.4)',
                background: 'rgba(52,211,153,0.05)',
              } : {
                borderColor: 'var(--color-border2)',
              }}
              onMouseEnter={(e) => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; }}
              onMouseLeave={(e) => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                disabled={stage === 'done'}
              />
              {file ? (
                <div className="flex items-center gap-3" style={{ color: 'var(--color-green)' }}>
                  <FileSpreadsheet size={20} />
                  <div>
                    <p className="text-sm font-semibold">{file.name}</p>
                    <p className="text-xs opacity-70">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--color-text3)' }}>
                  <Upload size={20} className="mx-auto mb-2" />
                  <p className="text-sm">Click to choose a CSV file</p>
                  <p className="text-xs mt-0.5">or drag and drop</p>
                </div>
              )}
            </label>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 ? (
            <div
              className="rounded-xl p-4 space-y-1"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-red)' }}>
                <AlertCircle size={14} /> CSV format errors — fix the file and re-upload
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {parseErrors.map((e, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--color-red)' }}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-xl p-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          ) : null}

          {stage !== 'done' ? (
            <div className="flex justify-end">
              <button
                onClick={runPreview}
                disabled={!canPreview}
                className="btn-purple btn-shine flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy && stage === 'setup' ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Validate &amp; Preview
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Step 2: Preview ── */}
        {(stage === 'preview' || stage === 'importing' || stage === 'done') && preview ? (
          <div className="bento-card p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <StepBadge n={2} />
              Preview — {selectedClient?.name}
            </h2>

            <div className="grid grid-cols-4 gap-3">
              <Stat value={preview.total}   label="Total rows"   color="var(--color-text2)"  bg="rgba(255,255,255,0.02)" border="var(--color-border2)" />
              <Stat value={preview.created} label="Will create"  color="var(--color-green)"  bg="rgba(52,211,153,0.06)"  border="rgba(52,211,153,0.2)" />
              <Stat value={preview.skipped} label="Already exist" color="var(--color-text3)" bg="rgba(255,255,255,0.02)" border="var(--color-border2)" />
              <Stat
                value={preview.errors}
                label="Errors"
                color={preview.errors > 0 ? 'var(--color-red)' : 'var(--color-text3)'}
                bg={preview.errors > 0 ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)'}
                border={preview.errors > 0 ? 'rgba(248,113,113,0.2)' : 'var(--color-border2)'}
              />
            </div>

            {hasErrors ? (
              <div
                className="rounded-xl p-3 text-sm flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--color-amber)' }}
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  <strong>{preview.errors} row{preview.errors !== 1 ? 's' : ''}</strong> have errors and will be skipped during import.
                  Fix the CSV and re-upload to import them, or proceed to import the valid rows now.
                </span>
              </div>
            ) : null}

            {preview.created === 0 ? (
              <div
                className="rounded-xl p-3 text-sm text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
              >
                Nothing to import — all rows already exist or have errors.
              </div>
            ) : null}

            <ResultTable summary={preview} label="Row-by-row preview" />

            {stage === 'preview' && preview.created > 0 ? (
              <div
                className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid var(--color-border2)' }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
                  This will create{' '}
                  <strong style={{ color: 'var(--color-text)' }}>{preview.created} loan{preview.created !== 1 ? 's' : ''}</strong>
                  {' '}for{' '}
                  <strong style={{ color: 'var(--color-text)' }}>{selectedClient?.name}</strong>.
                  {hasErrors ? ` ${preview.errors} row${preview.errors !== 1 ? 's' : ''} with errors will be skipped.` : ''}
                </p>
                <button
                  onClick={runImport}
                  disabled={busy}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #34d399)',
                    boxShadow: '0 4px 16px rgba(52,211,153,0.3)',
                  }}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Confirm Import
                </button>
              </div>
            ) : null}

            {stage === 'importing' ? (
              <div className="flex items-center justify-center gap-3 py-4 text-sm" style={{ color: 'var(--color-text2)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-green)' }} />
                Importing loans — do not close this page…
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 3: Done ── */}
        {stage === 'done' && result ? (
          <div
            className="bento-card p-6 space-y-6"
            style={{ borderColor: 'rgba(52,211,153,0.25)', boxShadow: '0 0 30px rgba(52,211,153,0.08)' }}
          >
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <StepBadge n={3} done />
              Import complete
            </h2>

            <div className="grid grid-cols-4 gap-3">
              <Stat value={result.total}   label="Processed"  color="var(--color-text2)"  bg="rgba(255,255,255,0.02)" border="var(--color-border2)" />
              <Stat value={result.created} label="Imported"   color="var(--color-green)"  bg="rgba(52,211,153,0.06)"  border="rgba(52,211,153,0.2)" />
              <Stat value={result.skipped} label="Skipped"    color="var(--color-text3)"  bg="rgba(255,255,255,0.02)" border="var(--color-border2)" />
              <Stat
                value={result.errors}
                label="Failed"
                color={result.errors > 0 ? 'var(--color-red)' : 'var(--color-text3)'}
                bg={result.errors > 0 ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)'}
                border={result.errors > 0 ? 'rgba(248,113,113,0.2)' : 'var(--color-border2)'}
              />
            </div>

            {result.errors > 0 ? (
              <ResultTable summary={result} label="Import results" />
            ) : (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--color-green)' }}
              >
                All {result.created} loan{result.created !== 1 ? 's' : ''} imported successfully with no errors.
                Borrower accounts have been created and the repayment schedules are live.
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Upload size={14} /> Import another file
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Column reference ── */}
        <div
          className="bento-card p-6"
          style={{ background: 'var(--color-faint-bg)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>CSV column reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  {['Column', 'Required', 'Notes'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 font-semibold" style={{ color: 'var(--color-text3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COLUMN_DOCS.map(([col, req, note]) => (
                  <tr key={col} style={{ borderBottom: '1px solid var(--color-row-border)' }}>
                    <td className="py-2 pr-4 font-mono" style={{ color: 'var(--color-text)' }}>{col}</td>
                    <td className="py-2 pr-4">
                      {req === 'yes'
                        ? <span className="font-semibold" style={{ color: 'var(--color-red)' }}>Yes</span>
                        : <span style={{ color: 'var(--color-text3)' }}>No</span>}
                    </td>
                    <td className="py-2" style={{ color: 'var(--color-text3)' }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Shell>
  );
}

const COLUMN_DOCS: [string, string, string][] = [
  ['legacy_reference',    'yes', 'Unique ID from your old system. Prefixed with MIG- in the new system.'],
  ['borrower_email',      'yes', 'Borrower email — used to match or create their portal account.'],
  ['borrower_name',       'yes', 'Full name of the borrower.'],
  ['borrower_id_number',  'no',  'SA ID number (13 digits).'],
  ['borrower_mobile',     'no',  'Mobile number e.g. 0821234567.'],
  ['business_name',       'no',  'Trading / company name.'],
  ['purpose',             'no',  'Loan purpose description. Defaults to "Migrated loan".'],
  ['principal',           'yes', 'Original disbursement amount (ZAR, no currency symbol).'],
  ['outstanding_balance', 'yes', 'Current outstanding balance today (ZAR).'],
  ['total_paid',          'yes', 'Total amount repaid to date (ZAR).'],
  ['interest_rate_pct',   'yes', 'Annual interest rate as a percentage e.g. 20.5 for 20.5% p.a.'],
  ['term_months',         'yes', 'Original loan term in months.'],
  ['monthly_instalment',  'yes', 'Fixed monthly instalment (ZAR).'],
  ['disbursed_date',      'yes', 'Date loan was disbursed. Format: YYYY-MM-DD.'],
  ['next_due_date',       'yes', 'First upcoming repayment date. Format: YYYY-MM-DD.'],
  ['loan_status',         'yes', 'One of: active | arrears | closed | settled | written_off.'],
];
