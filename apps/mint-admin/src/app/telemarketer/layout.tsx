import { TelemarketerShell } from '@/components/TelemarketerShell';

export default function TelemarketerLayout({ children }: { children: React.ReactNode }) {
  return <TelemarketerShell>{children}</TelemarketerShell>;
}
