const DEFAULT_AUTH_OVERLAY_COLOR = '#7C3AED';

const DEFAULT_COMPANY_NAME = 'AlgoLend';

const DEFAULT_CAROUSEL_SLIDES = [
  {
    title: 'End-to-End\nCredit Management',
    text: 'A fully branded digital lending platform, built around your credit policy and client journey.'
  },
  {
    title: 'Built for Business Lending',
    text: 'Purpose-built underwriting, compliance, and portfolio management for corporate credit providers.'
  },
  {
    title: 'White-Label Ready',
    text: 'Deploy under your brand with your colors, your workflows, and your risk appetite — in weeks, not years.'
  }
];

const DEFAULT_SYSTEM_SETTINGS = {
  id: 'global',
  company_name: DEFAULT_COMPANY_NAME,
  primary_color: '#7C3AED',
  secondary_color: '#1A1F36',
  tertiary_color: '#A78BFA',
  theme_mode: 'light',
  company_logo_url: null,
  auth_background_url: null,
  auth_background_flip: false,
  auth_overlay_color: DEFAULT_AUTH_OVERLAY_COLOR,
  auth_overlay_enabled: true,
  carousel_slides: DEFAULT_CAROUSEL_SLIDES.map((slide) => ({ ...slide }))
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const SETTINGS_ENDPOINT = '/api/system-settings';

let cachedTheme = null;
let lastFetchedAt = 0;
let isFetching = null;

const clamp = (value, min = 0, max = 255) => Math.max(min, Math.min(max, value));

const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map((char) => char + char).join('');
  }
  const intVal = parseInt(normalized, 16);
  if (Number.isNaN(intVal)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
};

const rgbToHex = (r, g, b) => {
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(clamp(Math.round(r)))}${toHex(clamp(Math.round(g)))}${toHex(clamp(Math.round(b)))}`.toUpperCase();
};

const adjustColor = (hex, amount = 0) => {
  const { r, g, b } = hexToRgb(hex);
  const delta = (channel) => amount >= 0
    ? channel + (255 - channel) * amount
    : channel * (1 + amount);
  return rgbToHex(delta(r), delta(g), delta(b));
};

const getContrastColor = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0F172A' : '#FFFFFF';
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

const normalizeCompanyName = (value) => {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || DEFAULT_SYSTEM_SETTINGS.company_name;
};

const normalizeHexColor = (value, fallback) => {
  if (!value) return fallback;
  let hex = `${value}`.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return fallback;
  }
  return `#${hex.toUpperCase()}`;
};

const sanitizeSlide = (slide = {}, fallback = {}) => {
  const safeTitle = typeof slide.title === 'string' ? slide.title.trim() : '';
  const safeText = typeof slide.text === 'string' ? slide.text.trim() : '';
  return {
    title: safeTitle || fallback.title,
    text: safeText || fallback.text
  };
};

const normalizeCarouselSlides = (slides) => {
  const incoming = Array.isArray(slides) ? slides : [];
  return DEFAULT_CAROUSEL_SLIDES.map((fallback, index) => sanitizeSlide(incoming[index] || {}, fallback));
};

const normalizeTheme = (theme = {}) => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...theme,
  company_name: normalizeCompanyName(theme?.company_name),
  auth_background_flip: normalizeBoolean(theme?.auth_background_flip, DEFAULT_SYSTEM_SETTINGS.auth_background_flip),
  auth_overlay_color: normalizeHexColor(theme?.auth_overlay_color, DEFAULT_SYSTEM_SETTINGS.auth_overlay_color),
  auth_overlay_enabled: normalizeBoolean(theme?.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled),
  carousel_slides: normalizeCarouselSlides(theme.carousel_slides)
});

const ALGOLEND_INLINE_SVG = (primary, secondary) => {
  const uid = Math.random().toString(36).slice(2, 8);
  const dark = secondary || '#1A1F36';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 160" fill="none" style="height:100%;width:auto;max-height:40px;display:block">
  <defs>
    <linearGradient id="arch-${uid}" x1="96" y1="14" x2="96" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#C4B5FD"/>
      <stop offset="55%"  stop-color="${primary}"/>
      <stop offset="100%" stop-color="${primary}"/>
    </linearGradient>
  </defs>
  <path d="M 48 148 L 48 62 Q 48 14 96 14 Q 144 14 144 62 L 144 96"
        stroke="url(#arch-${uid})" stroke-width="13" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="96" cy="112" r="40" fill="${dark}"/>
  <text x="178" y="116"
        font-family="-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Helvetica,Arial,sans-serif"
        font-size="74" font-weight="300" fill="${dark}" letter-spacing="-1.5">AlgoLend</text>
</svg>`;
};

const applyBrandLogo = (theme) => {
  if (typeof document === 'undefined') return;
  const primary   = theme.primary_color   || '#7C3AED';
  const secondary = theme.secondary_color || '#1A1F36';
  const logoUrl   = theme.company_logo_url;

  document.querySelectorAll('[data-brand-logo]').forEach(el => {
    if (logoUrl) {
      // Client has their own logo — swap to it
      if (el.tagName === 'IMG') {
        el.src = logoUrl;
      } else {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = theme.company_name || 'Logo';
        img.style.cssText = 'height:40px;width:auto;object-fit:contain;max-width:160px;display:block';
        img.setAttribute('data-brand-logo', '');
        el.replaceWith(img);
      }
    } else {
      // No custom logo — inject inline SVG so CSS vars work
      const svgHtml = ALGOLEND_INLINE_SVG(primary, secondary);
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-brand-logo', '');
      wrapper.style.cssText = el.style.cssText || 'height:40px;display:flex;align-items:center';
      wrapper.innerHTML = svgHtml;
      el.replaceWith(wrapper);
    }
  });
};

const applyDocumentBranding = (companyName) => {
  if (typeof document === 'undefined') return;
  const safeName = normalizeCompanyName(companyName);
  if (!safeName) return;
  const currentTitle = document.title || '';
  if (!currentTitle) return;
  const nextTitle = currentTitle.replace(/algolend/gi, safeName);
  if (nextTitle !== currentTitle) {
    document.title = nextTitle;
  }
};

const applyCssVariables = (theme, persistCache) => {
  const normalized = normalizeTheme(theme);
  const root = document.documentElement;
  const primaryRgb = hexToRgb(normalized.primary_color);
  const secondaryRgb = hexToRgb(normalized.secondary_color);
  const tertiaryRgb = hexToRgb(normalized.tertiary_color);

  root.style.setProperty('--color-primary', normalized.primary_color);
  root.style.setProperty('--color-primary-rgb', `${primaryRgb.r} ${primaryRgb.g} ${primaryRgb.b}`);
  root.style.setProperty('--color-primary-hover', adjustColor(normalized.primary_color, -0.15));
  root.style.setProperty('--color-primary-soft', adjustColor(normalized.primary_color, 0.2));
  root.style.setProperty('--color-primary-strong', adjustColor(normalized.primary_color, -0.35));
  root.style.setProperty('--color-secondary', normalized.secondary_color);
  root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r} ${secondaryRgb.g} ${secondaryRgb.b}`);
  root.style.setProperty('--color-secondary-soft', adjustColor(normalized.secondary_color, 0.15));
  root.style.setProperty('--color-tertiary', normalized.tertiary_color);
  root.style.setProperty('--color-tertiary-rgb', `${tertiaryRgb.r} ${tertiaryRgb.g} ${tertiaryRgb.b}`);
  root.style.setProperty('--gradient-brand', `linear-gradient(120deg, ${normalized.primary_color}, ${normalized.secondary_color}, ${normalized.tertiary_color})`);
  root.style.setProperty('--color-primary-contrast', getContrastColor(normalized.primary_color));
  root.style.setProperty('--auth-overlay-color', normalized.auth_overlay_color);
  root.style.setProperty('--auth-overlay-enabled', normalized.auth_overlay_enabled ? '1' : '0');

  const mode = normalized.theme_mode === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', mode);

  applyDocumentBranding(normalized.company_name);
  applyBrandLogo(normalized);

  if (persistCache) {
    cachedTheme = normalized;
    lastFetchedAt = Date.now();
  }

  return normalized;
};

const fetchFromApi = async (force) => {
  if (!force && cachedTheme && Date.now() - lastFetchedAt < CACHE_TTL_MS) {
    return cachedTheme;
  }

  if (isFetching) {
    return isFetching;
  }

  isFetching = (async () => {
    try {
      const response = await fetch(SETTINGS_ENDPOINT, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to load theme (${response.status})`);
      }
      const payload = await response.json();
      const data = payload?.data || payload;
      return applyCssVariables(data, true);
    } catch (error) {
      console.error('Theme load failed:', error);
      const fallback = cachedTheme || { ...DEFAULT_SYSTEM_SETTINGS };
      return applyCssVariables(fallback, true);
    } finally {
      isFetching = null;
    }
  })();

  return isFetching;
};

export const getCachedTheme = () => cachedTheme;

export const getCompanyName = (theme) => normalizeCompanyName(theme?.company_name);

export async function ensureThemeLoaded(options = {}) {
  const force = options.force === true;
  return fetchFromApi(force);
}

export function previewTheme(partialTheme = {}) {
  const base = cachedTheme || DEFAULT_SYSTEM_SETTINGS;
  return applyCssVariables({ ...base, ...partialTheme }, false);
}

export function persistTheme(theme) {
  return applyCssVariables(theme, true);
}

export function resetThemePreview() {
  if (cachedTheme) {
    applyCssVariables(cachedTheme, false);
  }
}

export { DEFAULT_SYSTEM_SETTINGS };
