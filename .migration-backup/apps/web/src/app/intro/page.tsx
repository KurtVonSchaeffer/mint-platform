import type { Metadata } from 'next';
import { SplashScene } from '@/components/SplashScene';

export const metadata: Metadata = {
  title: 'AlgoLend — Enter the platform',
  description: 'The lending platform for corporate credit providers in South Africa.',
};

export default function IntroPage() {
  return <SplashScene />;
}
