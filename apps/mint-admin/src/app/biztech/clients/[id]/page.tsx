'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import {
  ArrowLeft, Building2, Globe, MapPin, Plus, X, Loader2,
  User, Mail, Phone, Star, Trash2, FileText, Upload, Download,
  FolderKanban, AlertTriangle, Pencil, Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ClientStatus = 'lead' | 'active' | 'paused' | 'archived';

interface BizClient {
  id: string; name: string; industry: string | null; status: ClientStatus;
  website: string | null; address: string | null; notes: string | null;
}

interface Contact {
  id: string; name: string; email: string | null; phone: string | null;
  role: string | null; is_primary: boolean;
}

interface Doc {
  id: string; name: string; type: string | null; created_at: string; signed_url: string | null;
}

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

interface Project {
  id: string; name: string; status: ProjectStatus; due_date: string | null;
}

const DOC_TYPES = ['Contract', 'Proposal', 'Invoice', 'Other'] as const;

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning:  { label: 'Planning',  color: 'var(--color-amber)' },
  active:    { label: 'Active',    color: '#5C3BCF' },
  on_hold:   { label: 'On hold',   color: 'var(--color-sky)' },
  completed: { label: 'Completed', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: 'var(--color-text3)' },
};

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  lead:     { label: 'Lead',     color: 'var(--color-amber)' },
  active:   { label: 'Active',   color: '#5C3BCF' },
  paused:   { label: 'Paused',   color: 'var(--color-sky)' },
  archived: { label: 'Archived', color: 'var(--color-text3)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function AddContactModal({ clientId, contact, onClose, onAdded }: { clientId: string; contact?: Contact; onClose: () => void; onAdded: () => void }) {
  const [form, setForm]     = useState({
    name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', role: contact?.role ?? '',
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!contact;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (isEdit) {
      await fetch(`/api/biztech/contacts/${contact!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(`/api/biztech/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-7" style={PANEL}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{isEdit ? 'Edit contact' : 'Add contact'}</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Name</label>
            <input type="text" required className="field-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Email</label>
            <input type="email" className="field-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Phone</label>
            <input type="text" className="field-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Role</label>
            <input type="text" className="field-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : isEdit ? <Save size={13} /> : <Plus size={13} />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditClientModal({ client, onClose, onSaved }: { client: BizClient; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: client.name, industry: client.industry ?? '', website: client.website ?? '',
    address: client.address ?? '', notes: client.notes ?? '', status: client.status,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/biztech/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(92,59,207,0.22)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(92,59,207,0.16), 0 0 60px rgba(92,59,207,0.12)',
          animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg, #5C3BCF, #DDC357)' }} />
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Edit client info</h3>
            <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
          </div>
          <form onSubmit={submit} className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Company name</label>
              <input type="text" required className="field-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Industry</label>
                <input type="text" className="field-input" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Website</label>
                <input type="text" className="field-input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Status</label>
              <select className="field-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ClientStatus }))}>
                {(Object.keys(STATUS_CONFIG) as ClientStatus[]).filter(s => s !== 'lead' || s === client.status).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Address</label>
              <input type="text" className="field-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Notes</label>
              <textarea className="field-input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteClientModal({ clientName, onClose, onConfirm, deleting, error }: {
  clientName: string; onClose: () => void; onConfirm: () => void; deleting: boolean; error: string | null;
}) {
  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6" style={PANEL}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(248,113,113,0.12)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-red)' }} />
          </div>
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Delete {clientName}?</h3>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text2)' }}>
          This permanently removes the client, their contacts, and their documents. This can&apos;t be undone.
        </p>
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={deleting} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: 'var(--color-red)' }}
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {deleting ? 'Deleting…' : 'Delete client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BizTechClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient]     = useState<BizClient | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab]           = useState<'overview' | 'contacts' | 'documents'>('overview');
  const [loading, setLoading]   = useState(true);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('Contract');
  const [toast, setToast]       = useState<{ kind: ToastKind; message: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editOpen, setEditOpen]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, dRes, pRes] = await Promise.all([
      fetch(`/api/biztech/clients/${id}`),
      fetch(`/api/biztech/clients/${id}/contacts`),
      fetch(`/api/biztech/clients/${id}/documents`),
      fetch(`/api/biztech/projects?client_id=${id}`),
    ]);
    if (cRes.ok) setClient((await cRes.json()).client);
    if (ctRes.ok) setContacts((await ctRes.json()).contacts ?? []);
    if (dRes.ok) setDocs((await dRes.json()).documents ?? []);
    if (pRes.ok) setProjects((await pRes.json()).projects ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function removeContact(contactId: string) {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    const res = await fetch(`/api/biztech/contacts/${contactId}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to remove contact' }); load(); }
  }

  async function deleteClient() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/biztech/clients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/biztech/clients');
    } else {
      const json = await res.json().catch(() => ({}));
      const raw = json.error ?? '';
      const friendly = /foreign key|violates|restrict/i.test(raw)
        ? 'This client still has quotes, invoices, or projects attached. Remove those first, then delete the client.'
        : raw || 'Failed to delete client';
      setDeleteError(friendly);
      setDeleting(false);
    }
  }

  async function removeDoc(docId: string) {
    setDocs(prev => prev.filter(d => d.id !== docId));
    const res = await fetch(`/api/biztech/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to remove document' }); load(); }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', uploadType);
    const res = await fetch(`/api/biztech/clients/${id}/documents`, { method: 'POST', body: fd });
    setUploading(false);
    if (res.ok) { load(); } else { setToast({ kind: 'error', message: 'Upload failed' }); }
  }

  if (loading && !client) {
    return (
      <div className="p-12 flex items-center justify-center" style={PANEL}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center" style={PANEL}>
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Client not found.</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[client.status];

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addContactOpen && (
        <AddContactModal clientId={id} onClose={() => setAddContactOpen(false)} onAdded={load} />
      )}
      {editContact && (
        <AddContactModal clientId={id} contact={editContact} onClose={() => setEditContact(null)} onAdded={load} />
      )}
      {deleteOpen && (
        <DeleteClientModal
          clientName={client.name}
          onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
          onConfirm={deleteClient}
          deleting={deleting}
          error={deleteError}
        />
      )}
      {editOpen && (
        <EditClientModal client={client} onClose={() => setEditOpen(false)} onSaved={load} />
      )}

      <button
        onClick={() => router.push('/biztech/clients')}
        className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        style={{ color: 'var(--color-text3)' }}
      >
        <ArrowLeft size={13} /> Back to clients
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{client.name}</h1>
            <StatusDot label={cfg.label} color={cfg.color} />
          </div>
          <div className="flex items-center gap-4 text-xs mt-2 flex-wrap" style={{ color: 'var(--color-text3)' }}>
            {client.industry && <span className="inline-flex items-center gap-1.5"><Building2 size={11} />{client.industry}</span>}
            {client.website && <span className="inline-flex items-center gap-1.5"><Globe size={11} />{client.website}</span>}
            {client.address && <span className="inline-flex items-center gap-1.5"><MapPin size={11} />{client.address}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            <Pencil size={14} /> Edit info
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ border: '1px solid rgba(248,113,113,0.3)', color: 'var(--color-red)' }}
          >
            <Trash2 size={14} /> Delete client
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--color-border2)' }}>
        {(['overview', 'contacts', 'documents'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium capitalize cursor-pointer transition-colors"
            style={{
              color: tab === t ? '#5C3BCF' : 'var(--color-text3)',
              borderBottom: tab === t ? '2px solid #5C3BCF' : '2px solid transparent',
            }}
          >
            {t === 'contacts' ? `Contacts (${contacts.length})` : t === 'documents' ? `Documents & Contracts (${docs.length})` : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="p-6" style={PANEL}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <FolderKanban size={14} style={{ color: '#5C3BCF' }} /> Projects we&apos;re working on
              </h3>
              <button onClick={() => router.push('/biztech/projects')} className="text-xs font-medium cursor-pointer" style={{ color: '#5C3BCF' }}>
                View all
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No projects for this client yet.</p>
            ) : (
              <div className="space-y-2">
                {projects.map(p => {
                  const pcfg = PROJECT_STATUS_CONFIG[p.status];
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/biztech/projects/${p.id}`)}
                      className="biztech-row cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid var(--color-border2)' }}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                      <div className="flex items-center gap-3">
                        {p.due_date && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                            Due {new Date(p.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <StatusDot label={pcfg.label} color={pcfg.color} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6" style={PANEL}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Notes</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text2)' }}>
              {client.notes || <span style={{ color: 'var(--color-text3)' }} className="italic">No notes yet.</span>}
            </p>
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setAddContactOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: '#5C3BCF' }}
            >
              <Plus size={14} /> Add contact
            </button>
          </div>
          {contacts.length === 0 ? (
            <div className="p-10 text-center" style={PANEL}>
              <User size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No contacts added yet.</p>
            </div>
          ) : (
            <div style={{ ...PANEL, overflow: 'hidden' }}>
              {contacts.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                      {c.is_primary && <Star size={11} fill="#FBBF24" style={{ color: '#FBBF24' }} />}
                      {c.role && <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>· {c.role}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
                      {c.email && <span className="inline-flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditContact(c)} className="cursor-pointer p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => removeContact(c.id)} className="cursor-pointer p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (() => {
        const contracts = docs.filter(d => d.type === 'Contract');
        const other     = docs.filter(d => d.type !== 'Contract');

        const DocList = ({ items }: { items: Doc[] }) => (
          <div style={{ ...PANEL, overflow: 'hidden' }}>
            {items.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="min-w-0 flex items-center gap-3">
                  <FileText size={16} style={{ color: '#5C3BCF' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{d.name}</p>
                      {d.type && d.type !== 'Contract' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>{d.type}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {d.signed_url && (
                    <a href={d.signed_url} target="_blank" rel="noreferrer" className="cursor-pointer p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                      <Download size={14} />
                    </a>
                  )}
                  <button onClick={() => removeDoc(d.id)} className="cursor-pointer p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

        return (
          <div className="space-y-6">
            <div className="flex justify-end items-center gap-2">
              <select
                className="field-input w-auto text-sm"
                value={uploadType}
                onChange={e => setUploadType(e.target.value)}
                disabled={uploading}
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" className="sr-only" onChange={uploadFile} disabled={uploading} />
              </label>
            </div>

            {docs.length === 0 ? (
              <div className="p-10 text-center" style={PANEL}>
                <FileText size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No documents or contracts uploaded yet.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>Contracts ({contracts.length})</h3>
                  {contracts.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No contracts uploaded yet.</p>
                  ) : (
                    <DocList items={contracts} />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>Other documents ({other.length})</h3>
                  {other.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No other documents uploaded yet.</p>
                  ) : (
                    <DocList items={other} />
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
