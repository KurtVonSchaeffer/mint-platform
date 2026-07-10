import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { BarChart3 } from 'lucide-react';

export default function BizTechReportsPage() {
  return (
    <BizTechComingSoon
      title="Reports"
      icon={BarChart3}
      description="Revenue, quotes, invoices, clients, projects, outstanding payments, and productivity reports — exportable to PDF, Excel, and CSV."
    />
  );
}
