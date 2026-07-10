import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { Briefcase } from 'lucide-react';

export default function BizTechCrmPage() {
  return (
    <BizTechComingSoon
      title="CRM"
      icon={Briefcase}
      description="Notes, calls, meetings, emails, follow-ups, sales pipeline, and opportunities in one place."
    />
  );
}
