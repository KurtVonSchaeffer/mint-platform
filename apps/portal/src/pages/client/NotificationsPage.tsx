import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Bell, CheckCircle, AlertCircle, MessageSquare, FileSignature,
  CreditCard, ShieldCheck, Clock, Check,
} from 'lucide-react';

type Notification = {
  id: string;
  type: 'approval' | 'document' | 'payment' | 'message' | 'kyc' | 'reminder';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
};

const initialNotifications: Notification[] = [
  { id: 'n1', type: 'approval', title: 'Application approved', body: 'Your business loan application APP-2026-014 for R 50,000 has been approved. A signed agreement is now available for review.', timestamp: '2026-05-22 14:32', read: false },
  { id: 'n2', type: 'document', title: 'E-contract ready to sign', body: 'Your loan agreement is ready. Please review and sign by 25 May 2026 to disburse funds.', timestamp: '2026-05-22 14:33', read: false },
  { id: 'n3', type: 'kyc', title: 'Identity verification complete', body: 'Your director KYC check passed. PEP and sanctions screening cleared.', timestamp: '2026-05-22 11:08', read: false },
  { id: 'n4', type: 'message', title: 'New message from your consultant', body: 'Nomvula has sent you a message about additional supporting documents for your application.', timestamp: '2026-05-21 16:14', read: true },
  { id: 'n5', type: 'payment', title: 'Payment received', body: 'We received your monthly instalment of R 4,640 for loan LN-2025-0892. Thank you.', timestamp: '2026-05-20 09:00', read: true },
  { id: 'n6', type: 'reminder', title: 'Upcoming payment', body: 'Your next instalment of R 4,640 is due on 1 June 2026. We will debit your nominated account automatically.', timestamp: '2026-05-19 08:00', read: true },
];

const typeConfig: Record<Notification['type'], { icon: typeof Bell; bg: string; color: string }> = {
  approval:  { icon: CheckCircle,   bg: 'bg-emerald-50',  color: 'text-emerald-600' },
  document:  { icon: FileSignature, bg: 'bg-purple-50',   color: 'text-purple-600' },
  payment:   { icon: CreditCard,    bg: 'bg-blue-50',     color: 'text-blue-600' },
  message:   { icon: MessageSquare, bg: 'bg-slate-100',   color: 'text-slate-600' },
  kyc:       { icon: ShieldCheck,   bg: 'bg-emerald-50',  color: 'text-emerald-600' },
  reminder:  { icon: Clock,         bg: 'bg-amber-50',    color: 'text-amber-600' },
};

export function NotificationsPage() {
  const [items, setItems] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((all) => all.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setItems((all) => all.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0
              ? <>You have <strong>{unreadCount}</strong> unread {unreadCount === 1 ? 'notification' : 'notifications'}</>
              : 'You are all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <Check size={14} /> Mark all read
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-[var(--color-brand)] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 opacity-80">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
            <Bell size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No notifications</p>
          <p className="text-xs text-slate-400 mt-1">You're all caught up.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  className={`w-full text-left px-5 py-4 flex items-start gap-4 transition-colors hover:bg-slate-50 ${!n.read ? 'bg-[var(--color-brand-muted)]/15' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{n.body}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-brand)] shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Channel preferences hint */}
      <Card className="p-5 flex items-start gap-3 bg-slate-50/50">
        <AlertCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-500 leading-relaxed">
          Notification delivery channels (email, in-app, WhatsApp) can be managed under
          <strong className="text-slate-700"> Profile → Preferences</strong>.
        </div>
      </Card>
    </div>
  );
}
