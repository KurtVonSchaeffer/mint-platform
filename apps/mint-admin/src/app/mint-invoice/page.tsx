'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Trash2, ArrowLeft, Printer } from 'lucide-react';

/* ── Mint Platforms constants ─────────────────────────────────── */
const FROM = {
  company: 'Mint Platforms (Pty) Ltd',
  address: ['3 Gwen Lane, Sandown', 'Sandton, 2031, South Africa'],
  reg:     '2024/123456/07',
  email:   'info@mymint.co.za',
};

const BANKING = {
  bank:   'Capitec Bank',
  name:   'Lonwabo N Damane',
  number: '1392511168',
  branch: '470010',
  type:   'Savings',
};

/* ── Types ───────────────────────────────────────────────────── */
interface LineItem {
  id:   number;
  desc: string;
  sub:  string;
  qty:  number;
  rate: number;
}

/* ── Helpers ─────────────────────────────────────────────────── */
let nextId = 2;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function today() { return toISO(new Date()); }
function defaultDue() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return toISO(d);
}
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function invoiceNo(client: string, seq: number) {
  const d   = new Date();
  const mon = d.toLocaleString('default', { month: 'short' }).toUpperCase();
  const yr  = d.getFullYear();
  const tag = client ? client.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : 'CLIENT';
  const num = String(seq).padStart(3, '0');
  return `MP-${tag}-${mon}${yr}-${num}`;
}
function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Component ───────────────────────────────────────────────── */
export default function MintInvoicePage() {
  const [clientName,  setClientName]  = useState('');
  const [clientAddr,  setClientAddr]  = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate,     setDueDate]     = useState(defaultDue());
  const [invoiceSeq,  setInvoiceSeq]  = useState(1);
  const [vatEnabled,  setVatEnabled]  = useState(false);
  const [notes,       setNotes]       = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, desc: '', sub: '', qty: 1, rate: 0 },
  ]);

  function addItem() {
    setItems(p => [...p, { id: nextId++, desc: '', sub: '', qty: 1, rate: 0 }]);
  }
  function removeItem(id: number) {
    setItems(p => p.filter(i => i.id !== id));
  }
  function update(id: number, field: keyof LineItem, val: string | number) {
    setItems(p => p.map(i => (i.id === id ? { ...i, [field]: val } : i)));
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const vat      = vatEnabled ? subtotal * 0.15 : 0;
  const total    = subtotal + vat;
  const invNo    = invoiceNo(clientName, invoiceSeq);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .print-root {
            display: block !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
          }
          @page { margin: 12mm; }
        }
        .inv-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px; }
        .inv-td { padding: 14px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; vertical-align: top; }
        .inv-th { padding: 10px 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #9ca3af; border-bottom: 2px solid #e5e7eb; }
        .inv-no { white-space: nowrap; overflow-wrap: anywhere; }
      `}</style>

      <div className="min-h-screen" style={{ background: '#f1f5f9' }}>

        {/* Top bar */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between px-8 h-14 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-purple-600 transition-colors">
              <ArrowLeft size={13} /> Back to Admin
            </Link>
            <span className="text-gray-200">|</span>
            <p className="text-sm font-semibold text-gray-800">Mint Platforms — Invoice Creator</p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#4c1d95,#7C3AED)', boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>

        <div className="print-root max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── INVOICE PREVIEW ───────────────────────────────── */}
          <div className="invoice-card bg-white rounded-2xl shadow-lg overflow-hidden">

            {/* Header */}
            <div className="px-10 pt-10 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <Image src="/mint-logo.svg" alt="Mint Platforms" width={160} height={44} unoptimized style={{ height: 44, width: 'auto' }} />
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-bold whitespace-nowrap" style={{ color: '#4c1d95' }}>Tax Invoice</h1>
                  <p className="text-sm font-bold mt-1 inv-no" style={{ color: '#7C3AED' }}>{invNo}</p>
                </div>
              </div>
              <div className="mt-6" style={{ height: 2, background: 'linear-gradient(90deg,#4c1d95,#a78bfa)' }} />
            </div>

            {/* FROM / BILL TO */}
            <div className="px-10 pb-8 grid grid-cols-2 gap-10">
              <div>
                <p className="inv-label">From</p>
                <p className="text-base font-bold text-gray-900 mb-1">{FROM.company}</p>
                {FROM.address.map(a => <p key={a} className="text-sm text-gray-500">{a}</p>)}
              </div>
              <div>
                <p className="inv-label">Bill to</p>
                <p className="text-base font-bold text-gray-900 mb-1">
                  {clientName || <span className="text-gray-300">Client name</span>}
                </p>
                {clientAddr.split('\n').filter(Boolean).map((l, i) => <p key={i} className="text-sm text-gray-500">{l}</p>)}
                {clientPhone && <p className="text-sm text-gray-500">{clientPhone}</p>}
                {clientEmail && <p className="text-sm text-gray-500">{clientEmail}</p>}
              </div>
            </div>

            {/* Invoice meta box */}
            <div className="mx-10 mb-8 rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              <div className="grid grid-cols-3">
                {[
                  { label: 'Invoice Number', value: invNo },
                  { label: 'Invoice Date',   value: fmtDate(invoiceDate) },
                  { label: 'Due Date',       value: fmtDate(dueDate) },
                ].map((m, i) => (
                  <div key={m.label} className="px-5 py-4" style={{ borderRight: i < 2 ? '1px solid #e5e7eb' : 'none' }}>
                    <p className="inv-label">{m.label}</p>
                    <p className="text-sm font-bold text-gray-900 inv-no">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Line items table */}
            <div className="px-10 mb-6">
              <p className="inv-label mb-3">Services</p>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="inv-th text-left">Service</th>
                    <th className="inv-th text-right" style={{ width: 60 }}>Qty</th>
                    <th className="inv-th text-right" style={{ width: 128 }}>Rate (excl. VAT)</th>
                    <th className="inv-th text-right" style={{ width: 112 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="inv-td">
                        <p className="text-gray-800">{item.desc || <span className="text-gray-300">Service description</span>}</p>
                        {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                      </td>
                      <td className="inv-td text-right text-gray-600">{item.qty}</td>
                      <td className="inv-td text-right text-gray-600">{fmt(item.rate)}</td>
                      <td className="inv-td text-right font-bold text-gray-900">{fmt(item.qty * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-10 mb-8 flex justify-end">
              <div style={{ width: 280 }} className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{vatEnabled ? 'VAT (15%)' : 'VAT (0% — not a registered VAT vendor)'}</span>
                  <span>{fmt(vat)}</span>
                </div>
                <div className="flex justify-between pt-3" style={{ borderTop: '2px solid #e5e7eb' }}>
                  <span className="text-base font-bold text-gray-900">Total Due</span>
                  <span className="text-base font-bold text-gray-900">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {notes && (
              <div className="mx-10 mb-8 p-4 rounded-xl text-sm text-gray-600 leading-relaxed"
                style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <strong className="text-gray-700">Note: </strong>{notes}
              </div>
            )}

            {/* Banking details */}
            <div className="px-10 mb-8">
              <p className="inv-label mb-3">Payment Details</p>
              <div className="rounded-xl p-5 grid grid-cols-3 gap-x-6 gap-y-4" style={{ border: '1px solid #e5e7eb' }}>
                {[
                  { l: 'Bank Name',       v: BANKING.bank   },
                  { l: 'Account Name',    v: BANKING.name   },
                  { l: 'Account Number',  v: BANKING.number },
                  { l: 'Branch Code',     v: BANKING.branch },
                  { l: 'Account Type',    v: BANKING.type   },
                  { l: 'Reference',       v: invNo          },
                ].map(d => (
                  <div key={d.l}>
                    <p className="inv-label">{d.l}</p>
                    <p className="text-sm font-bold text-gray-900 inv-no">{d.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-4 rounded-xl text-sm text-gray-600" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <strong className="text-gray-700">Note: </strong>
                Please use <strong>{invNo}</strong> as your payment reference. Thank you for your business.
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-5 text-center text-xs text-gray-400" style={{ borderTop: '1px solid #f3f4f6' }}>
              {FROM.company} · Reg. No. {FROM.reg} · {FROM.email}
            </div>
          </div>

          {/* ── INPUT PANEL ────────────────────────────────────── */}
          <div className="no-print space-y-4">

            {/* Dates */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Invoice #</label>
                <input
                  type="number"
                  min={1}
                  value={invoiceSeq}
                  onChange={e => setInvoiceSeq(Math.max(1, Number(e.target.value)))}
                  className="field-input w-full text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">{invNo}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="field-input w-full text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="field-input w-full text-sm" />
              </div>
            </div>

            {/* Bill to */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Bill to</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Company / Name *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Zwane Official" className="field-input w-full text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Address</label>
                <textarea value={clientAddr} onChange={e => setClientAddr(e.target.value)} rows={3}
                  placeholder={"2nd Floor, Northlands Corner\nJohannesburg, 2169"} className="field-input w-full text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Phone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="010 500 0978" className="field-input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Email</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="admin@client.co.za" className="field-input w-full text-sm" />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Line Items</p>
                <button
                  onClick={() => setVatEnabled(v => !v)}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-colors"
                  style={{
                    background: vatEnabled ? 'rgba(124,58,237,0.1)' : '#f9fafb',
                    color: vatEnabled ? '#7C3AED' : '#9ca3af',
                    border: `1px solid ${vatEnabled ? 'rgba(124,58,237,0.25)' : '#e5e7eb'}`,
                  }}
                >
                  VAT {vatEnabled ? '15%' : '0%'}
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={item.id} className="pb-3 space-y-2" style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-300 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                    <input
                      value={item.desc}
                      onChange={e => update(item.id, 'desc', e.target.value)}
                      placeholder="Service name"
                      className="field-input flex-1 text-sm"
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    value={item.sub}
                    onChange={e => update(item.id, 'sub', e.target.value)}
                    placeholder="Sub-description (optional)"
                    className="field-input w-full text-xs ml-6"
                  />
                  <div className="flex gap-2 pl-6">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Qty</label>
                      <input
                        type="number" min={1}
                        value={item.qty || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => update(item.id, 'qty', e.target.value === '' ? 1 : Number(e.target.value))}
                        className="field-input w-full text-sm"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Rate (R)</label>
                      <input
                        type="number" min={0} step={0.01}
                        value={item.rate || ''}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => update(item.id, 'rate', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="field-input w-full text-sm"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Amount</label>
                      <div className="field-input text-sm font-semibold" style={{ color: '#7C3AED' }}>{fmt(item.qty * item.rate)}</div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-400 transition-colors hover:text-purple-600 hover:border-purple-300"
                style={{ border: '1px dashed #e5e7eb' }}
              >
                <Plus size={12} /> Add line item
              </button>

              <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>VAT</span><span>{fmt(vat)}</span></div>
                <div className="flex justify-between text-sm font-bold pt-1.5" style={{ borderTop: '1px solid #e5e7eb', color: '#111827' }}>
                  <span>Total Due</span><span style={{ color: '#7C3AED' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes for the client…"
                className="field-input w-full text-sm resize-none"
              />
            </div>

            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#4c1d95,#7C3AED)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
