'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import {
  ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, Circle,
  FileText, Upload, Download, Pencil, Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface ProjectDetail {
  id: string; name: string; description: string | null; status: ProjectStatus;
  start_date: string | null; due_date: string | null;
  biztech_clients: { id: string; name: string } | null;
}
interface Task { id: string; title: string; status: TaskStatus; due_date: string | null; }
interface Doc { id: string; name: string; type: string | null; created_at: string; signed_url: string | null; }

const DOC_TYPES = ['Spec', 'Design', 'Deliverable', 'Other'] as const;

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning:  { label: 'Planning',  color: 'var(--color-text3)' },
  active:    { label: 'Active',    color: '#5C3BCF' },
  on_hold:   { label: 'On hold',   color: 'var(--color-amber)' },
  completed: { label: 'Completed', color: 'var(--color-sky)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-red)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

const NEXT_STATUS: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

export default function BizTechProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [editingSpec, setEditingSpec] = useState(false);
  const [specDraft, setSpecDraft] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('Spec');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      fetch(`/api/biztech/projects/${id}`),
      fetch(`/api/biztech/projects/${id}/documents`),
    ]);
    if (pRes.ok) {
      const data = await pRes.json();
      setProject(data.project);
      setTasks(data.tasks ?? []);
    } else {
      setToast({ kind: 'error', message: 'Failed to load project' });
    }
    if (dRes.ok) setDocs((await dRes.json()).documents ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status: ProjectStatus) {
    const res = await fetch(`/api/biztech/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load(); else setToast({ kind: 'error', message: 'Failed to update status' });
  }

  function startEditSpec() {
    setSpecDraft(project?.description ?? '');
    setEditingSpec(true);
  }

  async function saveSpec() {
    setSavingSpec(true);
    const res = await fetch(`/api/biztech/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: specDraft }),
    });
    setSavingSpec(false);
    if (res.ok) { setEditingSpec(false); load(); } else { setToast({ kind: 'error', message: 'Failed to save specification' }); }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', uploadType);
    const res = await fetch(`/api/biztech/projects/${id}/documents`, { method: 'POST', body: fd });
    setUploading(false);
    if (res.ok) { load(); } else { setToast({ kind: 'error', message: 'Upload failed' }); }
  }

  async function removeDoc(docId: string) {
    setDocs(prev => prev.filter(d => d.id !== docId));
    const res = await fetch(`/api/biztech/project-documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to remove document' }); load(); }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAddingTask(true);
    await fetch(`/api/biztech/projects/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask }),
    });
    setNewTask('');
    setAddingTask(false);
    load();
  }

  async function toggleTask(task: Task) {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    const res = await fetch(`/api/biztech/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to update task' }); load(); }
  }

  async function removeTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const res = await fetch(`/api/biztech/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to remove task' }); load(); }
  }

  if (loading && !project) {
    return <div className="p-12 flex items-center justify-center" style={PANEL}><Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} /></div>;
  }
  if (!project) {
    return <div className="p-12 text-center" style={PANEL}><p className="text-sm" style={{ color: 'var(--color-text3)' }}>Project not found.</p></div>;
  }

  const cfg = STATUS_CONFIG[project.status];
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <button onClick={() => router.push('/biztech/projects')} className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: 'var(--color-text3)' }}>
        <ArrowLeft size={13} /> Back to projects
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{project.name}</h1>
            <StatusDot label={cfg.label} color={cfg.color} />
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text2)' }}>{project.biztech_clients?.name ?? '—'}</p>
        </div>
        <select
          value={project.status}
          onChange={e => setStatus(e.target.value as ProjectStatus)}
          className="field-input w-40"
        >
          {NEXT_STATUS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
      </div>

      {/* ── Specification ── */}
      <div className="p-6" style={PANEL}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Specification</span>
          {!editingSpec && (
            <button onClick={startEditSpec} className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: '#5C3BCF' }}>
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
        {editingSpec ? (
          <div className="space-y-3">
            <textarea
              className="field-input w-full"
              rows={8}
              placeholder="Scope, deliverables, acceptance criteria, technical notes…"
              value={specDraft}
              onChange={e => setSpecDraft(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingSpec(false)} className="px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
              <button onClick={saveSpec} disabled={savingSpec} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                {savingSpec ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {savingSpec ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text2)' }}>
            {project.description || <span className="italic" style={{ color: 'var(--color-text3)' }}>No specification written yet. Click Edit to add scope, deliverables, or technical notes.</span>}
          </p>
        )}
      </div>

      {/* ── Tasks ── */}
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
            Tasks · {doneCount}/{tasks.length} done
          </span>
        </div>
        {tasks.map(t => (
          <div key={t.id} className="px-6 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <button onClick={() => toggleTask(t)} className="cursor-pointer shrink-0" style={{ color: t.status === 'done' ? '#5C3BCF' : 'var(--color-text3)' }}>
              {t.status === 'done' ? <CheckCircle2 size={17} /> : <Circle size={17} />}
            </button>
            <p className="text-sm flex-1" style={{ color: t.status === 'done' ? 'var(--color-text3)' : 'var(--color-text)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
              {t.title}
            </p>
            <button onClick={() => removeTask(t.id)} className="cursor-pointer p-1" style={{ color: 'var(--color-text3)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <form onSubmit={addTask} className="px-6 py-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a task…"
            className="field-input flex-1"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
          />
          <button type="submit" disabled={addingTask} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer shrink-0" style={{ background: '#5C3BCF' }}>
            {addingTask ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </button>
        </form>
      </div>

      {/* ── Documents ── */}
      <div style={{ ...PANEL, overflow: 'hidden' }}>
        <div className="px-6 py-3 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
            Documents ({docs.length})
          </span>
          <div className="flex items-center gap-2">
            <select
              className="field-input w-auto text-xs"
              value={uploadType}
              onChange={e => setUploadType(e.target.value)}
              disabled={uploading}
            >
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" className="sr-only" onChange={uploadFile} disabled={uploading} />
            </label>
          </div>
        </div>
        {docs.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FileText size={18} className="mx-auto mb-2" style={{ color: 'var(--color-text3)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No documents uploaded yet.</p>
          </div>
        ) : (
          docs.map(d => (
            <div key={d.id} className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="min-w-0 flex items-center gap-3">
                <FileText size={15} style={{ color: '#5C3BCF' }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{d.name}</p>
                    {d.type && (
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
          ))
        )}
      </div>
    </div>
  );
}
