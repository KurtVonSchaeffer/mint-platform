export interface FeatureSet {
  isEnabled:  (flag: string) => boolean;
  isDisabled: (flag: string) => boolean;
  all:        () => Record<string, boolean>;
  enabled:    () => string[];
}

/** Fetch (and cache) all feature flags for this client deployment. */
export function getFeatures(): Promise<FeatureSet>;

/** Synchronous check — only reliable after getFeatures() has resolved once. */
export function isEnabled(flag: string): boolean;

/** Force the next getFeatures() call to re-fetch from the database. */
export function invalidateCache(): void;

/**
 * Express middleware — returns 403 if the flag is disabled.
 *   app.use('/api/truid', requireFeature('open_banking'));
 */
export function requireFeature(flag: string): (
  req: import('express').Request & { features?: FeatureSet },
  res: import('express').Response,
  next: import('express').NextFunction,
) => Promise<void>;

/**
 * Express middleware — attaches all features to req.features.
 *   app.use(attachFeatures());
 */
export function attachFeatures(): (
  req: import('express').Request & { features?: FeatureSet },
  res: import('express').Response,
  next: import('express').NextFunction,
) => Promise<void>;
