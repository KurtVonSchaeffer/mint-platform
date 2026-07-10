import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { Receipt } from 'lucide-react';

export default function BizTechInvoicesPage() {
  return (
    <BizTechComingSoon
      title="Invoices"
      icon={Receipt}
      description="Generate invoices from approved quotes with payment tracking, outstanding balances, recurring billing, and automated reminders."
    />
  );
}
