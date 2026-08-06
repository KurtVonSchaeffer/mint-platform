'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Upload, FileSpreadsheet, ChevronRight,
  CheckCircle2, AlertTriangle, Loader2, X, Users2, SkipForward,
} from 'lucide-react';

type ColMap = { name: string; email: string; company: string; phone: string; message: string };
type ParsedRow = Record<string, string>;

interface ImportResult {
  inserted:        number;
  duplicates:      number;
  duplicateEmails: string[];
  byAgent:         Record<string, number>;
}

const FIELD_LABELS: { key: keyof ColMap; label: string; required: boolean }[] = [
  { key: 'name',    label: 'Full Name / Company',  required: true  },
  { key: 'email',   label: 'Email',                required: false },
  { key: 'company', label: 'Company',              required: true  },
  { key: 'phone',   label: 'Phone',                required: false },
  { key: 'message', label: 'Notes / Message',      required: false },
];

function guessMapping(headers: string[]): ColMap {
  const lc = headers.map(h => h.toLowerCase().trim());
  function pick(candidates: string[]): string {
    for (const c of candidates) {
      const idx = lc.findIndex(h => h.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return '';
  }
  return {
    name:    pick(['full name', 'contact name', 'contact', 'name', 'company name', 'company']),
    email:   pick(['email', 'e-mail', 'mail']),
    company: pick(['company name', 'company', 'organisation', 'organization', 'business', 'firm']),
    phone:   pick(['phone', 'mobile', 'cell', 'tel']),
    message: pick(['note', 'message', 'comment', 'description', 'remark']),
  };
}

export default function LeadImportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging,  setDragging]  = useState(false);
  const [fileName,  setFileName]  = useState<string | null>(null);
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [rows,      setRows]      = useState<ParsedRow[]>([]);
  const [colMap,    setColMap]    = useState<ColMap>({ name: '', email: '', company: '', phone: '', message: '' });
  const [parseErr,  setParseErr]  = useState<string | null>(null);
  const [importing,    setImporting]    = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [result,       setResult]       = useState<ImportResult | null>(null);
  const [importErr,    setImportErr]    = useState<string | null>(null);

  function parseFile(file: File) {
    setParseErr(null); setResult(null); setImportErr(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });

        // Pick the sheet with the most rows (cover/readme sheets always have fewer rows than data sheets)
        let json: ParsedRow[] = [];
        for (const name of wb.SheetNames) {
          const candidate = XLSX.utils.sheet_to_json<ParsedRow>(wb.Sheets[name], { defval: '', raw: false });
          if (candidate.length > json.length) json = candidate;
        }

        if (json.length === 0) { setParseErr('Spreadsheet appears empty.'); return; }

        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        setColMap(guessMapping(hdrs));
      } catch {
        setParseErr("Could not parse the file. Make sure it's a valid .xlsx or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  // Require name + company + at least one of email or phone
  const validRows = rows.filter(r =>
    colMap.name    && r[colMap.name]?.trim()    &&
    colMap.company && r[colMap.company]?.trim() &&
    (
      (colMap.email && r[colMap.email]?.trim()) ||
      (colMap.phone && r[colMap.phone]?.trim())
    ),
  );

  const BATCH = 500;

  async function runImport() {
    if (validRows.length === 0) return;
    setImporting(true); setImportErr(null); setImportProgress({ done: 0, total: validRows.length });

    const payload = validRows.map(r => ({
      name:    r[colMap.name]?.trim()    ?? '',
      email:   colMap.email   ? r[colMap.email]?.trim()   || null : null,
      company: r[colMap.company]?.trim() ?? '',
      phone:   colMap.phone   ? r[colMap.phone]?.trim()   || null : null,
      message: colMap.message ? r[colMap.message]?.trim() || null : null,
      source:  'manual',
    }));

    const combined: ImportResult = { inserted: 0, duplicates: 0, duplicateEmails: [], byAgent: {} };

    try {
      for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH);
        const res   = await fetch('/api/leads/bulk', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ leads: batch }),
        });
        const data = await res.json();
        if (!res.ok) { setImportErr(data.error ?? 'Import failed'); return; }

        combined.inserted       += data.inserted       ?? 0;
        combined.duplicates     += data.duplicates     ?? 0;
        combined.duplicateEmails = [...combined.duplicateEmails, ...(data.duplicateEmails ?? [])];
        for (const [agent, count] of Object.entries(data.byAgent ?? {})) {
          combined.byAgent[agent] = (combined.byAgent[agent] ?? 0) + (count as number);
        }
        setImportProgress({ done: Math.min(i + BATCH, payload.length), total: payload.length });
      }
      setResult(combined);
    } catch {
      setImportErr('Network error — import failed');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  function reset() {
    setFileName(null); setHeaders([]); setRows([]);
    setColMap({ name: '', email: '', company: '', phone: '', message: '' });
    setResult(null); setParseErr(null); setImportErr(null); setImportProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  /* ── Result screen ─────────────────────────────────────── */
  if (result) {
    return (
      <div className="space-y-6 page-enter max-w-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leads')}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)', background: 'var(--color-surface)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <p className="eyebrow mb-0.5">Leads</p>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Import complete</h1>
          </div>
        </div>

        {/* Success banner */}
        <div className="bento-card p-6 text-center space-y-2" style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.04)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <CheckCircle2 size={26} style={{ color: '#34D399' }} />
          </div>
          <p className="text-3xl font-black" style={{ color: '#34D399', letterSpacing: '-0.04em' }}>
            {result.inserted} <span className="text-base font-semibold" style={{ color: 'var(--color-text2)' }}>leads imported</span>
          </p>
          {result.duplicates > 0 && (
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
                <SkipForward size={12} className="inline mr-1 -mt-px" />
                {result.duplicates} duplicate{result.duplicates > 1 ? 's' : ''} skipped
              </p>
              {result.duplicateEmails?.length > 0 && (
                <details className="mt-2 text-left">
                  <summary className="text-xs cursor-pointer select-none" style={{ color: 'var(--color-text3)', opacity: 0.7 }}>
                    Show skipped emails
                  </summary>
                  <div className="mt-2 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto"
                    style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                    {result.duplicateEmails.map(email => (
                      <p key={email} className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>{email}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {result.inserted > 0 && (
          <div className="bento-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.04)' }}>
            <Users2 size={14} style={{ color: 'var(--color-violet)', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'var(--color-text2)' }}>
              Leads are <strong>unassigned</strong> — go to the leads page to assign them to telemarketers.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={reset}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            Import another file
          </button>
          <button onClick={() => router.push('/leads')}
            className="flex-1 btn-purple btn-shine px-4 py-2.5 text-sm">
            View leads
          </button>
        </div>
      </div>
    );
  }

  /* ── Main import flow ──────────────────────────────────── */
  return (
    <div className="space-y-6 page-enter max-w-4xl">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()}
          className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)', background: 'var(--color-surface)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.35)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="eyebrow">Leads</p>
            <ChevronRight size={11} style={{ color: 'var(--color-text3)', opacity: 0.4 }} />
            <p className="eyebrow" style={{ color: 'var(--color-violet)', opacity: 1 }}>Bulk import</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
            Import leads from Excel
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            Upload a .xlsx or .csv file — duplicates are skipped automatically; leads are imported unassigned.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!rows.length && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className="bento-card flex flex-col items-center justify-center py-16 gap-4 cursor-pointer transition-all"
          style={{
            borderStyle: 'dashed',
            borderColor: dragging ? 'var(--color-violet)' : 'var(--color-border2)',
            background:  dragging ? 'rgba(124,58,237,0.05)' : undefined,
          }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: dragging ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
            {dragging
              ? <Upload size={28} style={{ color: 'var(--color-violet)' }} />
              : <FileSpreadsheet size={28} style={{ color: 'var(--color-violet)' }} />}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              {dragging ? 'Drop to import' : 'Drag & drop your spreadsheet here'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              or <span style={{ color: 'var(--color-violet)' }}>browse files</span> — .xlsx, .xls, .csv supported
            </p>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
        </div>
      )}

      {parseErr && (
        <div className="bento-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
          <AlertTriangle size={14} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{parseErr}</p>
        </div>
      )}

      {/* File loaded — column mapper + preview */}
      {rows.length > 0 && (
        <>
          {/* File chip + clear */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', color: '#34D399' }}>
              <FileSpreadsheet size={12} />
              {fileName} — <strong>{rows.length}</strong> rows detected
            </div>
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F87171'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
              <X size={11} /> Clear
            </button>
          </div>

          {/* Column mapper */}
          <div className="bento-card p-5">
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text3)' }}>
              Map spreadsheet columns
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELD_LABELS.map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text3)' }}>
                    {label} {required && <span style={{ color: '#F87171' }}>*</span>}
                  </label>
                  <select
                    value={colMap[key]}
                    onChange={e => setColMap(prev => ({ ...prev, [key]: e.target.value }))}
                    className="field-input w-full text-sm"
                  >
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Validation hint */}
            {(colMap.name && colMap.company && (colMap.email || colMap.phone)) ? (
              <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#34D399' }}>
                <CheckCircle2 size={11} />
                <strong>{validRows.length}</strong> valid rows ready to import
                {rows.length - validRows.length > 0 && (
                  <span style={{ color: 'var(--color-text3)' }}>
                    ({rows.length - validRows.length} will be skipped — missing required fields)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs mt-3" style={{ color: '#FBBF24' }}>
                Map Name, Company, and at least Phone or Email to continue
              </p>
            )}
          </div>

          {/* Preview table */}
          {validRows.length > 0 && (
            <div className="bento-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                  Preview — first {Math.min(validRows.length, 8)} of {validRows.length} rows
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border2)', background: 'rgba(0,0,0,0.15)' }}>
                      {(['name', 'email', 'company', 'phone', 'message'] as (keyof ColMap)[])
                        .filter(k => colMap[k])
                        .map(k => (
                          <th key={k} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--color-text3)', fontSize: 10, whiteSpace: 'nowrap' }}>
                            {FIELD_LABELS.find(f => f.key === k)?.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 8).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-row-border)' }}>
                        {(['name', 'email', 'company', 'phone', 'message'] as (keyof ColMap)[])
                          .filter(k => colMap[k])
                          .map(k => (
                            <td key={k} className="px-4 py-2.5 truncate max-w-[180px]"
                              style={{ color: k === 'name' ? 'var(--color-text)' : 'var(--color-text2)', fontWeight: k === 'name' ? 600 : 400 }}>
                              {row[colMap[k]] || <span style={{ color: 'var(--color-text3)', fontStyle: 'italic' }}>—</span>}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 8 && (
                  <p className="text-center text-xs py-2.5" style={{ color: 'var(--color-text3)', borderTop: '1px solid var(--color-border2)' }}>
                    + {validRows.length - 8} more rows
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import error */}
          {importErr && (
            <div className="bento-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
              <AlertTriangle size={14} style={{ color: '#F87171', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#F87171' }}>{importErr}</p>
            </div>
          )}

          {/* Import button */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              Duplicates (matched by email or phone) are skipped automatically.
            </p>
            <button
              onClick={runImport}
              disabled={importing || validRows.length === 0 || !colMap.name || !colMap.company}
              className="btn-purple btn-shine inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              style={{ opacity: importing || validRows.length === 0 ? 0.6 : 1 }}
            >
              {importing
                ? <><Loader2 size={14} className="animate-spin" />
                    {importProgress
                      ? `${importProgress.done} / ${importProgress.total}…`
                      : 'Importing…'}
                  </>
                : <><Upload size={14} /> Import {validRows.length} lead{validRows.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
