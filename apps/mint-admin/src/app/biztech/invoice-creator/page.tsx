'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Toast, type ToastKind } from '@/components/Toast';
import { Plus, Trash2, Printer, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const FROM = {
  company: 'MINT PLATFORMS (PTY) LTD',
  address: ['3 Gwen Lane, Sandown', 'Sandton, 2031, South Africa'],
  reg:     '',
  email:   'info@mymint.co.za',
};

// Bank account is still held under Algohive (Pty) Ltd — only shown in the
// EFT banking details block, not as the invoicing/issuing company above.
const BANKING = {
  bank:   'Capitec Bank',
  name:   'ALGOHIVE PTY LTD',
  number: '1053045883',
  branch: '450105',
  type:   'Business Account',
};

interface LineItem { id: number; desc: string; sub: string; qty: number; rate: number; }
interface BizClient { id: string; name: string; address: string | null; }
interface Contact { name: string; email: string | null; phone: string | null; is_primary: boolean; }

let nextId = 2;

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return toISO(new Date()); }
function defaultDue() { const d = new Date(); d.setMonth(d.getMonth() + 1); return toISO(d); }
function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function invoiceNo(client: string, seq: number) {
  const d = new Date();
  const mon = d.toLocaleString('default', { month: 'short' }).toUpperCase();
  const tag = client ? client.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : 'CLIENT';
  return `MP-${tag}-${mon}${d.getFullYear()}-${String(seq).padStart(3, '0')}`;
}
function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Shared input style ──────────────────────────────────────────── */
const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 placeholder:text-gray-300';

export default function MintInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<BizClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [clientName,  setClientName]  = useState('');
  const [clientAddr,  setClientAddr]  = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate,     setDueDate]     = useState(defaultDue());
  const [invoiceSeq,  setInvoiceSeq]  = useState(() => {
    try {
      const last = parseInt(localStorage.getItem('mint_invoice_seq') ?? '0', 10);
      return (isNaN(last) ? 0 : last) + 1;
    } catch { return 1; }
  });
  const [vatEnabled,  setVatEnabled]  = useState(false);
  const [notes,       setNotes]       = useState('');
  const [items, setItems] = useState<LineItem[]>([{ id: 1, desc: '', sub: '', qty: 1, rate: 0 }]);

  // Load real BizTech clients for the "select client" dropdown.
  useEffect(() => {
    fetch('/api/biztech/clients')
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(({ clients }) => setClients(clients ?? []))
      .catch(() => {});
  }, []);

  // Selecting a client auto-fills Bill To from the client record + their
  // primary contact — fields stay editable afterwards for ad-hoc tweaks.
  const applyClient = useCallback(async (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientAddr(client.address ?? '');
    }
    try {
      const res = await fetch(`/api/biztech/clients/${clientId}/contacts`);
      if (res.ok) {
        const { contacts } = await res.json() as { contacts: Contact[] };
        const primary = contacts?.find(c => c.is_primary) ?? contacts?.[0];
        if (primary) {
          setClientPhone(primary.phone ?? '');
          setClientEmail(primary.email ?? '');
        }
      }
    } catch { /* non-critical — Bill To fields stay editable regardless */ }
  }, [clients]);

  // Auto-set document title → browser uses this as the default PDF filename
  useEffect(() => {
    const name = clientName.trim() || 'Invoice';
    const date = fmtDate(invoiceDate);
    document.title = `${name} — ${date}`;
    return () => { document.title = 'AlgoLend — Admin Console'; };
  }, [clientName, invoiceDate]);

  const addItem    = () => setItems(p => [...p, { id: nextId++, desc: '', sub: '', qty: 1, rate: 0 }]);
  const removeItem = (id: number) => setItems(p => p.filter(i => i.id !== id));
  const update     = (id: number, f: keyof LineItem, v: string | number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const vat      = vatEnabled ? subtotal * 0.15 : 0;
  const total    = subtotal + vat;
  const invNo    = invoiceNo(clientName, invoiceSeq);

  async function createInvoice() {
    if (!selectedClientId) {
      setToast({ kind: 'error', message: 'Select a BizTech client first' });
      return;
    }
    if (!items.some(i => i.desc.trim())) {
      setToast({ kind: 'error', message: 'Add at least one line item' });
      return;
    }
    setCreating(true);
    const res = await fetch('/api/biztech/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClientId,
        due_at: dueDate || null,
        notes: notes || null,
        items: items.filter(i => i.desc.trim()).map(i => ({
          description: i.sub ? `${i.desc} — ${i.sub}` : i.desc,
          quantity: i.qty,
          unit_price_cents: Math.round(i.rate * 100),
        })),
      }),
    });
    setCreating(false);
    if (res.ok) {
      const { invoice } = await res.json();
      setCreatedInvoiceId(invoice.id);
      setToast({ kind: 'success', message: `Invoice ${invoice.reference} created` });
    } else {
      setToast({ kind: 'error', message: 'Failed to create invoice' });
    }
  }

  return (
    <>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-root { display: block !important; padding: 0 !important; max-width: none !important; }
          .inv-card { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; }
          .inv-header { padding: 20px 32px !important; }
          .inv-header-meta { margin-top: 12px !important; padding-top: 12px !important; }
          .inv-section { padding: 16px 32px !important; }
          .inv-section-sm { padding: 10px 32px !important; }
          .inv-banking { margin: 0 32px 16px !important; }
          .inv-footer { padding: 10px 32px !important; }
          @page { margin: 8mm; size: A4; }
        }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="-m-6 lg:-m-10 min-h-screen" style={{ background: '#f1f5f9' }}>

        <div className="no-print max-w-6xl mx-auto px-6 pt-6">
          <button
            onClick={() => router.push('/biztech/invoices')}
            className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={13} /> Back to invoices
          </button>
        </div>

        <div className="print-root max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_310px] gap-8 items-start">

          {/* ── INVOICE PREVIEW ─────────────────────────────────── */}
          <div className="inv-card bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* ── Dark header band ── */}
            <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7C3AED 100%)' }} className="inv-header px-10 py-8">
              <div className="flex items-start justify-between">
                <div>
                  <Image src="/mint-logo-white.png" alt="MINT Platforms" width={140} height={36} unoptimized
                    style={{ height: 36, width: 'auto', opacity: 0.95 }} />
                  <p className="text-indigo-300 text-xs mt-2">{FROM.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-300 mb-1">Tax Invoice</p>
                  <p className="text-2xl font-bold text-white leading-tight">{invNo}</p>
                </div>
              </div>

              {/* Meta strip inside header */}
              <div className="inv-header-meta mt-6 pt-5 border-t border-indigo-700/60 grid grid-cols-3 gap-4">
                {[
                  { l: 'Invoice Date', v: fmtDate(invoiceDate) },
                  { l: 'Due Date',     v: fmtDate(dueDate) },
                  { l: 'Status',       v: 'Due' },
                ].map(m => (
                  <div key={m.l}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">{m.l}</p>
                    <p className="text-sm font-semibold text-white">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FROM / BILL TO ── */}
            <div className="inv-section px-10 py-8 grid grid-cols-2 gap-8" style={{ borderBottom: '1px solid #f0f0f5' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">From</p>
                <p className="text-sm font-bold text-gray-900">{FROM.company}</p>
                {FROM.address.map(a => <p key={a} className="text-sm text-gray-500 leading-relaxed">{a}</p>)}
                <p className="text-sm text-gray-500">{FROM.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
                {clientName
                  ? <p className="text-sm font-bold text-gray-900">{clientName}</p>
                  : <p className="text-sm font-bold text-gray-300">Client name</p>}
                {clientAddr.split('\n').filter(Boolean).map((l, i) =>
                  <p key={i} className="text-sm text-gray-500 leading-relaxed">{l}</p>)}
                {clientPhone && <p className="text-sm text-gray-500">{clientPhone}</p>}
                {clientEmail && <p className="text-sm text-gray-500">{clientEmail}</p>}
              </div>
            </div>

            {/* ── Line items table ── */}
            <div className="inv-section px-10 py-6">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8f7ff' }}>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3 rounded-l-lg">Description</th>
                    <th className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3" style={{ width: 60 }}>Qty</th>
                    <th className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3" style={{ width: 130 }}>Unit Price</th>
                    <th className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3 rounded-r-lg" style={{ width: 130 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">{item.desc || <span className="text-gray-300 font-normal">Service description</span>}</p>
                        {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600">{item.qty}</td>
                      <td className="px-4 py-4 text-right text-gray-600">{fmt(item.rate)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">{fmt(item.qty * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals ── */}
            <div className="inv-section-sm px-10 pb-8 flex justify-end">
              <div className="w-64">
                <div className="flex justify-between text-sm text-gray-500 py-1.5">
                  <span>Subtotal</span><span className="font-medium text-gray-700">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 py-1.5">
                  <span>{vatEnabled ? 'VAT (15%)' : 'VAT (0%)'}</span>
                  <span className="font-medium text-gray-700">{fmt(vat)}</span>
                </div>
                {!vatEnabled && (
                  <p className="text-[10px] text-gray-400 -mt-1 mb-1">Not a registered VAT vendor</p>
                )}
                <div className="mt-2 pt-3 flex justify-between items-center rounded-xl px-4 py-3"
                  style={{ background: 'linear-gradient(135deg,#4c1d95,#7C3AED)' }}>
                  <span className="text-sm font-bold text-indigo-200">Total Due</span>
                  <span className="text-lg font-bold text-white">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            {notes && (
              <div className="mx-10 mb-6 px-4 py-3 rounded-xl text-sm text-gray-600"
                style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                <span className="font-semibold text-gray-700">Note: </span>{notes}
              </div>
            )}

            {/* ── Payment details ── */}
            <div className="inv-banking mx-10 mb-8 rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              <div className="px-5 py-3" style={{ background: '#f8f7ff', borderBottom: '1px solid #e5e7eb' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Payment Details</p>
              </div>
              <div className="px-5 py-4 grid grid-cols-3 gap-x-8 gap-y-3">
                {[
                  { l: 'Bank',           v: BANKING.bank   },
                  { l: 'Account Name',   v: BANKING.name   },
                  { l: 'Account No.',    v: BANKING.number },
                  { l: 'Branch Code',    v: BANKING.branch },
                  { l: 'Account Type',   v: BANKING.type   },
                  { l: 'Reference',      v: invNo          },
                ].map(d => (
                  <div key={d.l}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{d.l}</p>
                    <p className="text-sm font-semibold text-gray-800">{d.v}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 text-sm text-gray-600" style={{ background: '#f0fdf4', borderTop: '1px solid #d1fae5' }}>
                Please use <strong className="text-gray-800">{invNo}</strong> as your payment reference.
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="inv-footer px-10 py-4 flex items-center justify-between text-xs text-gray-400"
              style={{ borderTop: '1px solid #f3f4f6' }}>
              <span>{FROM.company}{FROM.reg ? ` · Reg. ${FROM.reg}` : ''}</span>
              <span>{FROM.email}</span>
            </div>
          </div>

          {/* ── INPUT PANEL ─────────────────────────────────────── */}
          <div className="no-print space-y-4">

            {/* Invoice meta */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Invoice</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Number</label>
                <input type="number" min={1} value={invoiceSeq}
                  onChange={e => setInvoiceSeq(Math.max(1, Number(e.target.value)))}
                  onFocus={e => e.target.select()}
                  className={inp} />
                <p className="text-[10px] text-gray-400 mt-1">{invNo}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
              </div>
            </div>

            {/* Bill to */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Bill To</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">BizTech client</label>
                <select value={selectedClientId} onChange={e => applyClient(e.target.value)} className={inp}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Selecting a client auto-fills the fields below and lets you save this as a real invoice.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Company / Name</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Zwane Official" className={inp} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Address</label>
                <textarea value={clientAddr} onChange={e => setClientAddr(e.target.value)} rows={3}
                  placeholder={'2nd Floor, Northlands Corner\nJohannesburg, 2169'}
                  className={`${inp} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Phone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    placeholder="010 500 0978" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Email</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    placeholder="admin@client.co.za" className={inp} />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Line Items</p>
                <button
                  onClick={() => setVatEnabled(v => !v)}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all"
                  style={{
                    background: vatEnabled ? 'rgba(99,102,241,0.1)' : '#f9fafb',
                    color:      vatEnabled ? '#4f46e5' : '#9ca3af',
                    border:     `1px solid ${vatEnabled ? 'rgba(99,102,241,0.3)' : '#e5e7eb'}`,
                  }}
                >
                  VAT {vatEnabled ? '15%' : '0%'}
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={item.id} className="space-y-2 pb-3"
                  style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="flex gap-2">
                    <input value={item.desc} onChange={e => update(item.id, 'desc', e.target.value)}
                      placeholder="Service name" className={`${inp} flex-1`} />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input value={item.sub} onChange={e => update(item.id, 'sub', e.target.value)}
                    placeholder="Sub-description (optional)" className={`${inp} text-xs`} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Qty</label>
                      <input type="number" min={1} value={item.qty || ''} onFocus={e => e.target.select()}
                        onChange={e => update(item.id, 'qty', e.target.value === '' ? 1 : Number(e.target.value))}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Rate (R)</label>
                      <input type="number" min={0} step={0.01} value={item.rate || ''} placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => update(item.id, 'rate', e.target.value === '' ? 0 : Number(e.target.value))}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Amount</label>
                      <div className="rounded-lg px-3 py-2 text-sm font-bold text-indigo-600"
                        style={{ background: '#f5f3ff', border: '1px solid #e0d9ff' }}>
                        {fmt(item.qty * item.rate)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addItem}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-indigo-600 transition-colors"
                style={{ border: '1.5px dashed #e5e7eb' }}>
                <Plus size={12} /> Add line item
              </button>

              <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#f8f7ff', border: '1px solid #e0d9ff' }}>
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>VAT</span><span>{fmt(vat)}</span></div>
                <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid #e0d9ff' }}>
                  <span className="text-gray-800">Total Due</span>
                  <span className="text-indigo-600">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Notes</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Additional notes for the client…"
                className={`${inp} resize-none`} />
            </div>

            {createdInvoiceId ? (
              <div className="rounded-2xl p-4 space-y-2" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <CheckCircle2 size={15} /> Saved to Invoices
                </div>
                <button onClick={() => router.push(`/biztech/invoices/${createdInvoiceId}`)}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                  View invoice →
                </button>
              </div>
            ) : (
              <button onClick={createInvoice} disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                style={{ background: '#16a34a' }}>
                {creating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {creating ? 'Creating…' : 'Create Invoice'}
              </button>
            )}

            <button onClick={() => { try { localStorage.setItem('mint_invoice_seq', String(invoiceSeq)); } catch {} window.print(); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#4c1d95,#7C3AED)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
