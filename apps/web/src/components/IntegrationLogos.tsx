/**
 * Integration partner brand marks.
 *
 * File-based (public/logos/):
 *   Sure Systems — suresystems.png (RGBA transparent, vendor-supplied)
 *   SACRRA       — sacrra.png      (RGBA transparent, vendor-supplied)
 *
 * Inline SVG (colour-safe, no file dependency):
 *   TruID    — lime-green [ ] bracket mark from vendor SVG
 *   DocuSeal — blue document + signature mark
 *
 * Inline SVG icon marks:
 *   Vercel, Supabase, Resend — simple-icons paths (MIT)
 *   Experian                 — five-square brand mark from official SVG
 *   OpenPGP                  — simple-icons path (MIT)
 */

import Image from 'next/image';

type LogoProps = { size?: number; className?: string };

/* ─── Vercel ───────────────────────────────────────────────────────── */
export function VercelLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="Vercel">
      <path d="m12 1.608 12 20.784H0Z" fill="currentColor" />
    </svg>
  );
}

/* ─── Supabase ─────────────────────────────────────────────────────── */
export function SupabaseLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="Supabase">
      <defs>
        <linearGradient id="sb-g" x1="14.5" y1="0" x2="6" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#249361" />
          <stop offset="100%" stopColor="#3ECF8E" />
        </linearGradient>
      </defs>
      <path
        d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"
        fill="url(#sb-g)"
      />
    </svg>
  );
}

/* ─── Resend ───────────────────────────────────────────────────────── */
export function ResendLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="Resend">
      <path
        d="M14.679 0c4.648 0 7.413 2.765 7.413 6.434s-2.765 6.434-7.413 6.434H12.33L24 24h-8.245l-8.88-8.44c-.636-.588-.93-1.273-.93-1.86 0-.831.587-1.565 1.713-1.883l4.574-1.224c1.737-.465 2.936-1.81 2.936-3.572 0-2.153-1.761-3.4-3.939-3.4H0V0z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ─── Experian ─────────────────────────────────────────────────────── */
/* Five-square brand mark — faithful recreation from the official SVG   */
export function ExperianLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="Experian">
      {/* Top-right blue square */}
      <rect x="15" y="3"  width="5" height="5" rx="0.8" fill="#407EC9" />
      {/* Centre-left large purple square */}
      <rect x="7"  y="7"  width="7" height="7" rx="0.8" fill="#632E8C" />
      {/* Below-purple magenta square */}
      <rect x="9"  y="15" width="4" height="4" rx="0.8" fill="#C63B8E" />
      {/* Top-centre small pink square */}
      <rect x="14" y="9"  width="3" height="3" rx="0.6" fill="#C63B8E" />
      {/* Bottom-right small pink square */}
      <rect x="17" y="15" width="3" height="3" rx="0.6" fill="#C63B8E" />
    </svg>
  );
}

/* ─── TruID ─────────────────────────────────────────────────────────── */
/* Vendor SVG — white paths recoloured to #1a1a1a, lime brackets intact  */
export function TruIDLogo({ size = 22, className }: LogoProps) {
  return (
    <Image
      src="/logos/truid.svg"
      alt="TruID"
      width={size * 3.3}
      height={size}
      className={className}
      style={{ height: size, width: 'auto' }}
      unoptimized
    />
  );
}

/* ─── SACRRA ─────────────────────────────────────────────────────────── */
/* Green pixel-bowl mark — SVG recreation, transparent, works any bg     */
export function SacrraLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="SACRRA">
      <defs>
        <linearGradient id="sacrra-bowl" x1="12" y1="23" x2="12" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2d6b1e" />
          <stop offset="100%" stopColor="#6ab040" />
        </linearGradient>
      </defs>
      {/* Bowl — gradient semicircle */}
      <path d="M4 14 Q4 23 12 23 Q20 23 20 14 Z" fill="url(#sacrra-bowl)" />
      {/* White highlight pixels inside bowl */}
      <rect x="9"  y="16.5" width="2" height="2" rx="0.2" fill="rgba(255,255,255,0.3)" />
      <rect x="13" y="15.5" width="2" height="2" rx="0.2" fill="rgba(255,255,255,0.2)" />
      {/* Pixel scatter above — dark green */}
      <rect x="12" y="10" width="2" height="2" rx="0.2" fill="#2d6b1e" />
      <rect x="15" y="8"  width="2" height="2" rx="0.2" fill="#2d6b1e" />
      {/* Medium green */}
      <rect x="10" y="8"  width="2" height="2" rx="0.2" fill="#5a9e30" />
      <rect x="14" y="6"  width="2" height="2" rx="0.2" fill="#5a9e30" />
      {/* Light green */}
      <rect x="12" y="6"  width="2"   height="2"   rx="0.2" fill="#8bc540" />
      <rect x="16" y="6"  width="1.5" height="1.5" rx="0.2" fill="#8bc540" />
      <rect x="11" y="4"  width="1.5" height="1.5" rx="0.2" fill="#8bc540" />
    </svg>
  );
}

/* ─── DocuSeal ─────────────────────────────────────────────────────── */
/* Vendor-supplied orange seal icon (AVIF)                               */
export function DocuSealLogo({ size = 22, className }: LogoProps) {
  return (
    <Image
      src="/logos/docuseal.avif"
      alt="DocuSeal"
      width={size}
      height={size}
      className={className}
      style={{ height: size, width: size, objectFit: 'contain', borderRadius: '20%' }}
      unoptimized
    />
  );
}

/* ─── OpenPGP ──────────────────────────────────────────────────────── */
export function OpenPGPLogo({ size = 22, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="OpenPGP">
      <path
        d="M2.968 11.583h1.274v-3.82A7.76 7.76 0 0 1 12.005 0a7.76 7.76 0 0 1 7.762 7.763v3.783c-.018.01-.037.028-.056.037l-.01.01-.008.009h-.01l-.01.01-.009.009H19.636l-.018.018h-.02l-.018.01h-.01l-.009.01-.009.009h-.01l-.009.009-.009.01-.01.009-.009.009-.028.019-.019.01-.028.018-.018.01-.02.009-.027.018-.019.01-.01.009-.027.019-.02.01-.046.027-.019.01-.018.009-.02.01h-.008l-.057.027h-.019c-.018.01-.037.02-.065.038h-.01l-.009.01-.028.018-.018.01-.029.018-.018.01h-.01l-.028.018-.018.01-.02.009c-.018.01-.046.019-.065.028l-.018.01-.02.009-.037.018-.037.02-.047.018-.047.019-.019.009-.037.019-.019.01c-1.545.739-4.017 1.516-8.708 1.853-3.362.244-5.403 1.723-6.724 3.502zm4.842 0h8.371v-3.82a4.184 4.184 0 0 0-4.186-4.186A4.184 4.184 0 0 0 7.81 7.763zm13.222 1.461V24H5.572c1.704-.946 2.968-.852 5.075-.787 2.865.094 6.03-1.105 7.585-2.696 1.554-1.592-.14-.375-1.901.074-1.76.45-5.17.497-7.454-.103 7.173.094 9.973-2.219 11.555-4.307 1.583-2.079-.683-.365-2.153.356-1.47.72-4.036 1.227-6.864.852 4.27-.01 7.52-2.144 9.607-4.345z"
        fill="#0093DD"
      />
    </svg>
  );
}

/* ─── Sure Systems ───────────────────────────────────────────────────── */
/* Vendor-supplied PNG — transparent background (RGBA), 406×64           */
export function SureSystemsLogo({ size = 22, className }: LogoProps) {
  return (
    <Image
      src="/logos/suresystems.png"
      alt="Sure Systems"
      width={size * 6.3}
      height={size}
      className={className}
      style={{ height: size, width: 'auto' }}
      unoptimized
    />
  );
}

/* Sanlam — vendor SVG from public/logos/sanlam.svg */
export function SanlamLogo({ size = 22, className }: LogoProps) {
  return (
    <Image
      src="/logos/sanlam.svg"
      alt="Sanlam"
      width={size}
      height={size}
      className={className}
      style={{ height: size, width: 'auto' }}
      unoptimized
    />
  );
}

/* ─── Lookup ──────────────────────────────────────────────────────── */
export const LOGO_MAP: Record<string, React.ComponentType<LogoProps>> = {
  TruID:           TruIDLogo,
  Experian:        ExperianLogo,
  SACRRA:          SacrraLogo,
  'E-Contracts':   DocuSealLogo,
  'Sure Systems':  SureSystemsLogo,
  Sanlam:          SanlamLogo,
  Resend:          ResendLogo,
  OpenPGP:         OpenPGPLogo,
  Supabase:        SupabaseLogo,
  Vercel:          VercelLogo,
};

export function IntegrationLogo({ name, size = 22, className }: LogoProps & { name: string }) {
  const Mark = LOGO_MAP[name];
  return Mark ? <Mark size={size} className={className} /> : null;
}
