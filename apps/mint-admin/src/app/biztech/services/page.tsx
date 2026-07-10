import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { Wrench } from 'lucide-react';

export default function BizTechServicesPage() {
  return (
    <BizTechComingSoon
      title="Services"
      icon={Wrench}
      description="Manage service offerings — software development, AI solutions, ERP consulting, and more — with pricing and categories."
    />
  );
}
