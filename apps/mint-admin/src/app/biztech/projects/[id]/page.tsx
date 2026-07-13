'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface ProjectDetail {
  id: string; name: string; description: string | null; status: ProjectStatus;
  start_date: string | null; due_date: string | null;
  biztech_clients: { id: string; name: string } | null;
}
interface Task { id: string; title: string; status: TaskStatus; due_date: string | null; }

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
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/biztech/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
      setTasks(data.tasks ?? []);
    } else {
      setToast({ kind: 'error', message: 'Failed to load project' });
    }
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

      {project.description && (
        <div className="p-6" style={PANEL}>
          <p className="text-sm" style={{ color: 'var(--color-text2)' }}>{project.description}</p>
        </div>
      )}

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
    </div>
  );
}
