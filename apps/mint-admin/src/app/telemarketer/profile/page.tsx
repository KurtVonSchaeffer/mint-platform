import dynamic from 'next/dynamic';

// Skip SSR — createBrowserClient requires env vars only available at runtime
const ProfileContent = dynamic(() => import('./ProfileContent'), { ssr: false });

export default function TelemarketerProfilePage() {
  return <ProfileContent />;
}
