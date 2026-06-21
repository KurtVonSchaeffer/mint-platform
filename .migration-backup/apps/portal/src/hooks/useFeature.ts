import { useTenant } from '@/contexts/TenantContext';
import type { FeatureFlag } from '@/lib/features';

export function useFeature(flag: FeatureFlag): boolean {
  const { features } = useTenant();
  return features[flag] ?? false;
}

export function useFeatures(...flags: FeatureFlag[]): Record<FeatureFlag, boolean> {
  const { features } = useTenant();
  return Object.fromEntries(
    flags.map((f) => [f, features[f] ?? false])
  ) as Record<FeatureFlag, boolean>;
}
