import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Send } from 'lucide-react';

interface Message {
  id:   string;
  from: 'consultant' | 'me';
  text: string;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  { id: 'm1', from: 'consultant', text: 'Welcome to your client portal. Your application has been received and is in review.', time: '09:12' },
  { id: 'm2', from: 'me',         text: 'Thank you. When can I expect a decision?', time: '09:35' },
  { id: 'm3', from: 'consultant', text: 'Our credit team is reviewing your documents. We aim to have a decision within 48 hours. I will message you here as soon as it lands.', time: '09:48' },
  { id: 'm4', from: 'consultant', text: 'In the meantime, please make sure your May bank statement is uploaded under Documents — it speeds the affordability check considerably.', time: '09:49' },
];

// Canned consultant replies — picked at random for demo realism.
const CANNED_REPLIES = [
  'Got it — thanks for the update. I have logged this on your file.',
  'Noted. Let me check with the credit team and come back to you shortly.',
  'Perfect. That helps speed things up — your affordability assessment is now in the queue.',
  'Thanks, that is helpful context. I will flag it for the reviewer.',
];

function timeOfDay() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const id = `m-${Date.now()}`;
    setMessages((prev) => [...prev, { id, from: 'me', text, time: timeOfDay() }]);
    setDraft('');

    // Simulate consultant typing + reply after 1.4s
    window.setTimeout(() => {
      const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
      setMessages((prev) => [...prev, { id: `m-${Date.now() + 1}`, from: 'consultant', text: reply, time: timeOfDay() }]);
    }, 1400);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h1>
        <p className="text-slate-500 text-sm mt-1">Direct line to your assigned consultant.</p>
      </div>

      <Card className="flex flex-col p-0 overflow-hidden" style={{ height: '70vh' }}>
        {/* Conversation header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-10 h-10 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center text-sm font-bold shrink-0">
            NK
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Nomvula Khumalo</p>
            <p className="text-[11px] text-emerald-600 font-semibold">● Online · usually replies within 15 min</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                msg.from === 'me'
                  ? 'bg-[var(--color-brand)] text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/60' : 'text-slate-400'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-slate-100 flex gap-3">
          <Input
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1"
          />
          <Button size="md" onClick={send} disabled={!draft.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Messages are end-to-end encrypted. Consultant responses typically arrive within one business hour.
      </p>
    </div>
  );
}
