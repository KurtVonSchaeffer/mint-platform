import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { HelpCircle, Mail, Phone, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  { q: 'How long does a loan decision take?', a: 'We aim to provide a credit decision within 24–48 business hours of receiving all required documents.' },
  { q: 'Will you ever ask for an upfront fee?', a: 'No. We will never ask for an upfront fee. If anyone requests this, please contact us immediately.' },
  { q: 'How do I track my application?', a: 'Log in to your portal and view real-time status updates under "My Loans". You will also receive notifications for every status change.' },
  { q: 'How do I lodge a complaint?', a: 'Send a message via the in-platform messaging system or contact us directly — we respond within 1 business day.' },
];

export function SupportPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">Support</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-muted)] flex items-center justify-center">
            <Mail size={18} className="text-[var(--color-brand)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-ink-muted)]">Email Us</p>
            <p className="text-sm font-semibold text-[var(--color-ink)]">info@algolend.co.za</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-muted)] flex items-center justify-center">
            <Phone size={18} className="text-[var(--color-brand)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-ink-muted)]">Call Us</p>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Use in-app messaging</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-semibold text-[var(--color-ink)]">Frequently Asked Questions</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[var(--color-border-soft)] last:border-0">
              <button
                className="flex items-center justify-between w-full px-6 py-4 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {faq.q}
                <ChevronDown size={16} className={`text-[var(--color-ink-muted)] transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <p className="px-6 pb-4 text-sm text-[var(--color-ink-soft)]">{faq.a}</p>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
