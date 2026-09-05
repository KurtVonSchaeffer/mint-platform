'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Key, Globe, Bell, Shield, Plug, ExternalLink, Check, AlertCircle, Percent } from 'lucide-react';

const DEFAULT_NOTIFICATIONS = {
  'New client onboarded':     true,
  'Client invoice overdue':   true,
  'API quota >80% consumed':  true,
  'Kill switch activated':    true,
  'Feature flag changed':     false,
};

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div
      className="bento-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--color-violet)' }}>{icon}</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);

  function toggleNotification(label: string) {
    setNotifications((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <Shell>
      <div className="space-y-6 max-w-2xl page-enter">

        {/* Header */}
        <div>
          <p className="eyebrow mb-2">Configuration</p>
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Settings</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
            Integrations, domain configuration, and platform-wide preferences.
          </p>
        </div>

        {/* Vercel Integration */}
        <SectionCard icon={<Key size={16} />} title="Vercel Integration">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Vercel API Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  defaultValue="vercel_tok_••••••••••••••••••••••••"
                  className="field-input flex-1 font-mono"
                  readOnly
                />
                <button
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => {
                    if (window.confirm('Rotate the Vercel API token? Existing deployments using the old token will need to be re-authenticated.')) {
                      // POST /api/integrations/vercel/rotate-token
                    }
                  }}
                >
                  Rotate
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>
                Used to update VITE_FEATURES env vars and trigger redeployments via Vercel API
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Vercel Team ID</label>
              <input
                defaultValue="team_algolend"
                className="field-input font-mono"
                readOnly
              />
            </div>
          </div>
        </SectionCard>

        {/* Domain */}
        <SectionCard icon={<Globe size={16} />} title="Platform Domains">
          <div className="space-y-1">
            {[
              { label: 'Admin Console',     value: 'admin.mintplatforms.co.za' },
              { label: 'Marketing Site',    value: 'algolend.co.za' },
              { label: 'Client Portal Base', value: '{slug}.algolend.co.za' },
            ].map((d) => (
              <div
                key={d.label}
                className="flex justify-between items-center py-2.5"
                style={{ borderBottom: '1px solid var(--color-border2)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-text3)' }}>{d.label}</span>
                <span
                  className="font-mono text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={<Bell size={16} />} title="Alert Notifications">
          <div className="space-y-3">
            {Object.entries(notifications).map(([label, enabled]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text2)' }}>{label}</span>
                <button
                  role="switch"
                  aria-checked={enabled}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: enabled ? 'var(--color-purple)' : 'var(--color-track-off)' }}
                  onClick={() => toggleNotification(label)}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* External integrations */}
        <SectionCard icon={<Plug size={16} />} title="External integrations">
          <div className="space-y-2">
            {[
              {
                name: 'Attio CRM',
                purpose: 'Forward marketing-site enquiries to your sales team',
                docs: 'https://developers.attio.com/reference/post_v2-objects-object-records',
                envVars: ['ATTIO_API_KEY', 'ATTIO_PEOPLE_OBJECT (optional, default: people)', 'ATTIO_NOTES_OBJECT (optional)'],
                where: 'apps/web (marketing form → /api/leads → Attio)',
              },
              {
                name: 'Sure Systems',
                purpose: 'EFT, debit-order, and bulk-payment processing for client deployments',
                docs: 'https://www.suresystems.co.za',
                envVars: ['SURESYSTEMS_MERCHANT_ID', 'SURESYSTEMS_API_KEY', 'SURESYSTEMS_API_BASE', 'SURESYSTEMS_PGP_KEY_FINGERPRINT'],
                where: 'ZwaneOfficial/services/sureSystemsService.js',
              },
              {
                name: 'TruID',
                purpose: 'Open banking — bank statement retrieval + affordability metrics',
                docs: 'https://truid.co.za/docs',
                envVars: ['TRUID_CLIENT_ID', 'TRUID_CLIENT_SECRET', 'TRUID_REDIRECT_URI'],
                where: 'ZwaneOfficial/services/truidService.js',
              },
              {
                name: 'Experian',
                purpose: 'Consumer credit bureau pulls + risk scoring',
                docs: 'https://www.experian.co.za',
                envVars: ['EXPERIAN_USERNAME', 'EXPERIAN_PASSWORD', 'EXPERIAN_PRODUCT_CODE'],
                where: 'ZwaneOfficial/services/creditCheckService.js',
              },
              {
                name: 'SACRRA',
                purpose: 'Monthly bureau reporting in SACRRA layout 700 format',
                docs: 'https://sacrra.org.za',
                envVars: ['SACRRA_MEMBER_ID', 'SACRRA_NCA_REF', 'SACRRA_SFTP_HOST'],
                where: 'ZwaneOfficial/public/admin/src/modules/sacrra.js',
              },
              {
                name: 'Resend',
                purpose: 'Transactional email — notifications, magic links, statements',
                docs: 'https://resend.com/docs',
                envVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
                where: 'apps/mint-admin — via @resend/mail',
              },
            ].map((integration) => (
              <details
                key={integration.name}
                className="group rounded-xl overflow-hidden transition-colors"
                style={{ border: '1px solid var(--color-border2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.25)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}
              >
                <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--color-green)', boxShadow: '0 0 6px var(--color-green)' }}
                    />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{integration.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{integration.purpose}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium group-open:rotate-180 transition-transform" style={{ color: 'var(--color-text3)' }}>▾</span>
                </summary>
                <div
                  className="px-4 pb-4 pt-1 space-y-3"
                  style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-faint-bg)' }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text3)' }}>Required env vars</p>
                    <ul className="space-y-1">
                      {integration.envVars.map((v) => (
                        <li key={v} className="font-mono text-xs flex items-center gap-2" style={{ color: 'var(--color-text2)' }}>
                          <Check size={11} style={{ color: 'var(--color-green)' }} className="shrink-0" />
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text3)' }}>Where it lives</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>{integration.where}</p>
                  </div>
                  <a
                    href={integration.docs}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                    style={{ color: 'var(--color-violet)' }}
                  >
                    Provider docs <ExternalLink size={11} />
                  </a>
                </div>
              </details>
            ))}
          </div>

          <div
            className="rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-amber)' }}>
              Env vars must be set per-deployment (Vercel project settings → Environment Variables).
              Each client deployment uses its own credentials. MINT Platforms never stores client API
              keys centrally.
            </p>
          </div>
        </SectionCard>

        {/* Commission Config */}
        <SectionCard icon={<Percent size={16} />} title="Commission Config">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text2)' }}>Commission per conversion</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                Commission is automatically calculated as <strong style={{ color: 'var(--color-text2)' }}>25% of the plan the client chose</strong> during onboarding.
                When a telemarketer converts a lead, the commission amount is calculated from the selected subscription tier and applied to their record.
              </p>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                Example: Starter plan (R 1,999/month) → R 499.75 commission. Enterprise plan (R 14,999/month) → R 3,749.75 commission.
                The amount can still be edited manually in the Payroll page if needed.
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border2)', paddingTop: 12 }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text2)' }}>Demo booking notifications</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                Set <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>ADMIN_EMAIL</code> in Vercel to receive
                an email alert whenever a telemarketer marks a lead as <strong>Demo Booked</strong>.
                Telemarketers are also automatically emailed when their commission is approved or paid.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard icon={<Shield size={16} />} title="Security">
          <div className="space-y-1">
            {[
              { label: 'Admin 2FA',       value: <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}>Enabled</span> },
              { label: 'Session timeout', value: <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>8 hours</span> },
              { label: 'Allowed IP ranges', value: <span className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>0.0.0.0/0</span> },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-2.5"
                style={{ borderBottom: '1px solid var(--color-border2)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-text3)' }}>{row.label}</span>
                {row.value}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </Shell>
  );
}
