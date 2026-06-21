import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTenant } from '@/contexts/TenantContext';
import { Palette, Building2, Bell, Check, AlertCircle, Sparkles } from 'lucide-react';

type Status = { kind: 'success' | 'error'; text: string } | null;

const DEFAULT_NOTIFICATIONS = {
  'New application submitted':      true,
  'Application status change':      true,
  'Payment received':               true,
  'Loan in arrears (30d+)':         true,
  'Weekly portfolio digest':        false,
  'SACRRA submission reminder':     true,
};

export function SettingsPage() {
  const { name, primaryColor, secondaryColor } = useTenant();

  // Company form
  const [company, setCompany] = useState({
    name:    name || 'AlgoLend',
    ncr:     'NCRCP12345',
    email:   'info@algolend.co.za',
    phone:   '+27 10 276 0531',
  });
  const [companyStatus, setCompanyStatus] = useState<Status>(null);

  // Branding form
  const [branding, setBranding] = useState({
    primary:   primaryColor,
    secondary: secondaryColor,
    logoUrl:   '',
  });
  const [brandingStatus, setBrandingStatus] = useState<Status>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
  const [notifStatus, setNotifStatus] = useState<Status>(null);

  function saveCompany() {
    if (!company.name.trim() || !company.email.trim()) {
      setCompanyStatus({ kind: 'error', text: 'Name and email are required.' });
      return;
    }
    setCompanyStatus({ kind: 'success', text: 'Company details saved.' });
    window.setTimeout(() => setCompanyStatus(null), 3000);
  }

  function saveBranding() {
    // Live-apply primary colour so the user can see the change immediately
    document.documentElement.style.setProperty('--color-brand', branding.primary);
    setBrandingStatus({ kind: 'success', text: 'Branding queued for next deploy · primary colour applied live in this session.' });
    window.setTimeout(() => setBrandingStatus(null), 4000);
  }

  function toggleNotification(label: string) {
    setNotifications((prev) => ({ ...prev, [label]: !prev[label] }));
    setNotifStatus({ kind: 'success', text: 'Preferences updated.' });
    window.setTimeout(() => setNotifStatus(null), 1500);
  }

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">Tenant configuration, branding, and notification preferences.</p>
      </div>

      {/* Company */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-semibold text-[var(--color-ink)]">Company details</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Company name"            value={company.name}  onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} />
          <Input label="NCR registration number" value={company.ncr}   onChange={(e) => setCompany((p) => ({ ...p, ncr: e.target.value }))} hint="Required if you extend credit under the National Credit Act." />
          <Input label="Support email"           value={company.email} onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))} type="email" />
          <Input label="Support phone"           value={company.phone} onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))} type="tel" />

          {companyStatus ? (
            <StatusBanner status={companyStatus} />
          ) : null}

          <Button size="md" onClick={saveCompany}>Save changes</Button>
        </CardBody>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-semibold text-[var(--color-ink)]">Branding</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink-2)] mb-1.5 block">Primary colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primary}
                  onChange={(e) => setBranding((p) => ({ ...p, primary: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-[var(--color-border)] cursor-pointer"
                />
                <span className="text-sm text-[var(--color-ink-soft)] font-mono">{branding.primary}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-ink-2)] mb-1.5 block">Secondary colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.secondary}
                  onChange={(e) => setBranding((p) => ({ ...p, secondary: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-[var(--color-border)] cursor-pointer"
                />
                <span className="text-sm text-[var(--color-ink-soft)] font-mono">{branding.secondary}</span>
              </div>
            </div>
          </div>

          <Input
            label="Company logo URL"
            placeholder="https://…"
            value={branding.logoUrl}
            onChange={(e) => setBranding((p) => ({ ...p, logoUrl: e.target.value }))}
            hint="Recommend SVG or 512×512 PNG with transparent background."
          />

          {/* Live preview */}
          <div className="border border-[var(--color-border)] rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] mb-3">Live preview</p>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${branding.primary}15` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: branding.primary }}>
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{company.name}</p>
                <p className="text-xs" style={{ color: branding.primary }}>Primary CTA · 4640 ZAR</p>
              </div>
              <button className="ml-auto px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: branding.primary }}>
                Apply now
              </button>
            </div>
          </div>

          {brandingStatus ? (
            <StatusBanner status={brandingStatus} />
          ) : null}

          <div className="flex items-center gap-2">
            <Button size="md" onClick={saveBranding}>
              <Sparkles size={14} /> Save &amp; deploy
            </Button>
            <p className="text-xs text-[var(--color-ink-muted)]">Branding changes are applied on next deployment (~60s).</p>
          </div>
        </CardBody>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-semibold text-[var(--color-ink)]">Notifications</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {Object.entries(notifications).map(([label, enabled]) => (
            <label key={label} className="flex items-center justify-between cursor-pointer py-1.5 hover:bg-[var(--color-surface-2)]/60 rounded-lg px-2 -mx-2 transition-colors">
              <span className="text-sm text-[var(--color-ink-2)]">{label}</span>
              <button
                role="switch"
                aria-checked={enabled}
                onClick={() => toggleNotification(label)}
                className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[var(--color-brand)]' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-[var(--color-surface)] rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}

          {notifStatus ? (
            <StatusBanner status={notifStatus} />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusBanner({ status }: { status: NonNullable<Status> }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
        status.kind === 'success'
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          : 'bg-red-50 border border-red-200 text-red-700'
      }`}
    >
      {status.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {status.text}
    </div>
  );
}
