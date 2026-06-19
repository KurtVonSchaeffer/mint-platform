import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const OUT = new URL('../screenshots', import.meta.url).pathname;
if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

const BASE = 'http://localhost:3001';

const PAGES = [
  { name: '01-dashboard',   path: '/'           },
  { name: '02-clients',     path: '/clients'     },
  { name: '03-leads',       path: '/leads'       },
  { name: '04-pricing',     path: '/pricing'     },
  { name: '05-quotes',      path: '/quotes'      },
  { name: '06-invoices',    path: '/invoices'    },
  { name: '07-billing',     path: '/billing'     },
  { name: '08-marketplace', path: '/marketplace' },
  { name: '09-features',    path: '/features'    },
  { name: '10-usage',       path: '/usage'       },
  { name: '11-migration',   path: '/migration'   },
  { name: '12-users',       path: '/users'       },
  { name: '13-settings',    path: '/settings'    },
  { name: '14-login',       path: '/login'       },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Set dark color scheme
await page.emulateMedia({ colorScheme: 'dark' });

for (const { name, path } of PAGES) {
  console.log(`📸  ${name}  →  ${path}`);
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() =>
    page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  );

  // Wait briefly for animations and data to settle
  await page.waitForTimeout(1200);

  // Full-page screenshot
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    fullPage: true,
  });
  console.log(`   ✓ saved ${name}.png`);
}

await browser.close();
console.log(`\n✅  All screenshots saved to: ${OUT}`);
