/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_COMPANY_NAME?: string;
  readonly VITE_PRIMARY_COLOR?: string;
  readonly VITE_SECONDARY_COLOR?: string;
  readonly VITE_LOGO_URL?: string;
  readonly VITE_COMPANY_NCR?: string;
  readonly VITE_PLATFORM_ACTIVE?: string;
  readonly VITE_FEATURES?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
