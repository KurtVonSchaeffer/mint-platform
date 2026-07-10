import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { FileText } from 'lucide-react';

export default function BizTechQuotesPage() {
  return (
    <BizTechComingSoon
      title="Quotes"
      icon={FileText}
      description="Generate branded quotations with line items, VAT, discounts, terms, PDF export, email delivery, and version history."
    />
  );
}
