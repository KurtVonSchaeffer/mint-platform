import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { count: clientsCount, error: clientsError },
    { data: projects, error: projectsError },
    { data: quotes, error: quotesError },
    { data: invoices, error: invoicesError },
    { data: tasks, error: tasksError },
    { data: activities, error: activitiesError },
  ] = await Promise.all([
    supabaseAdmin.from('biztech_clients').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('biztech_projects').select('status'),
    supabaseAdmin.from('biztech_quotes').select('status, created_at'),
    supabaseAdmin.from('biztech_invoices').select('status, total_cents, paid_at'),
    supabaseAdmin
      .from('biztech_project_tasks')
      .select('id, title, due_date, status, biztech_projects(name)')
      .neq('status', 'done')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(5),
    supabaseAdmin
      .from('biztech_activities')
      .select('id, type, summary, occurred_at, biztech_clients(name)')
      .order('occurred_at', { ascending: false })
      .limit(5),
  ]);

  const err = clientsError ?? projectsError ?? quotesError ?? invoicesError ?? tasksError ?? activitiesError;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const activeProjects = (projects ?? []).filter(p => p.status === 'active' || p.status === 'planning').length;

  const quotesSentThisMonth = (quotes ?? []).filter(
    q => q.status === 'sent' && new Date(q.created_at) >= monthStart
  ).length;

  const outstandingCents = (invoices ?? [])
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total_cents, 0);

  const revenueMtdCents = (invoices ?? [])
    .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at) >= monthStart)
    .reduce((sum, i) => sum + i.total_cents, 0);

  return NextResponse.json({
    clients: clientsCount ?? 0,
    activeProjects,
    quotesSentThisMonth,
    outstandingCents,
    revenueMtdCents,
    upcomingTasks: tasks ?? [],
    recentActivities: activities ?? [],
  });
}
