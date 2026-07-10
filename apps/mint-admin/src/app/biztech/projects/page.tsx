import { BizTechComingSoon } from '@/components/BizTechComingSoon';
import { FolderKanban } from 'lucide-react';

export default function BizTechProjectsPage() {
  return (
    <BizTechComingSoon
      title="Projects"
      icon={FolderKanban}
      description="Track milestones, tasks, files, deadlines, assigned team members, time tracking, and progress per client project."
    />
  );
}
