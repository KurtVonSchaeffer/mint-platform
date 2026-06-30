import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — AlgoLend',
  description: 'Privacy policy for AlgoLend and MINT Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/privacy' },
};

const LAST_UPDATED = '31 May 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]">
        <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-[15px] text-[var(--color-ink)]">
            ← algolend.co.za
          </Link>
          <span className="text-xs text-[var(--color-ink-soft)]">Updated {LAST_UPDATED}</span>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-[860px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
          Privacy Policy
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-12">
          MINT Platforms (Pty) Ltd, operating as AlgoLend — last updated {LAST_UPDATED}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Who we are">
            <p>
              MINT Platforms (Pty) Ltd (&ldquo;MINT Platforms&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a South African company that develops and operates the AlgoLend white-label lending platform. Our registered address is South Africa.
            </p>
            <p>
              This policy applies to our marketing website (algolend.co.za) and the AlgoLend platform operated on behalf of our clients (&ldquo;Lenders&rdquo;).
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>We collect the following categories of personal information:</p>
            <ul>
              <li><strong>Contact enquiries</strong> — name, email address, company name, and any message you submit through our contact form.</li>
              <li><strong>Platform usage</strong> — when you use the AlgoLend platform as a Lender administrator, we collect login credentials, usage logs, and configuration data.</li>
              <li><strong>Borrower data (on behalf of Lenders)</strong> — when a Lender deploys AlgoLend for their borrowers, we process borrower personal and financial information as a data operator on behalf of the Lender (the responsible party).</li>
            </ul>
          </Section>

          <Section title="3. How we use your information">
            <p>We use personal information to:</p>
            <ul>
              <li>Respond to enquiries and provide our services</li>
              <li>Operate, maintain, and improve the AlgoLend platform</li>
              <li>Send transactional communications (invoices, service updates)</li>
              <li>Meet legal and regulatory obligations</li>
            </ul>
            <p>We do not sell, rent, or share personal information with third parties for marketing purposes.</p>
          </Section>

          <Section title="4. POPIA compliance">
            <p>
              We are committed to compliance with the Protection of Personal Information Act (POPIA), Act 4 of 2013. We process personal information lawfully, with a legitimate purpose, and only to the minimum extent necessary.
            </p>
            <p>
              Each Lender client operates their own dedicated Supabase database instance. Borrower data is tenant-isolated and encrypted at rest. MINT Platforms accesses Lender data only as necessary to provide platform support.
            </p>
          </Section>

          <Section title="5. Data retention">
            <p>
              Contact enquiry data is retained for 36 months or until you request deletion. Platform usage logs are retained for 12 months. Borrower data retention is governed by the Lender&apos;s own data retention policy, subject to NCA and POPIA requirements.
            </p>
          </Section>

          <Section title="6. Third-party processors">
            <p>We use the following sub-processors to deliver the platform:</p>
            <ul>
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Vercel</strong> — application hosting and infrastructure</li>
              <li><strong>Resend</strong> — transactional email</li>
              <li><strong>Experian SA</strong> — credit bureau data (Lender deployments only)</li>
              <li><strong>TruID</strong> — open banking and affordability (Lender deployments only)</li>
              <li><strong>E-contract provider</strong> — e-contract signing (Lender deployments only)</li>
            </ul>
          </Section>

          <Section title="7. Your rights">
            <p>Under POPIA, you have the right to:</p>
            <ul>
              <li>Request access to personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information (subject to legal retention requirements)</li>
              <li>Object to processing of your personal information</li>
              <li>Lodge a complaint with the Information Regulator of South Africa</li>
            </ul>
          </Section>

          <Section title="8. Contact">
            <p>
              For privacy enquiries or to exercise your rights, contact our Information Officer at:{' '}
              <a href="mailto:privacy@mintplatforms.co.za" className="underline">privacy@mintplatforms.co.za</a>
            </p>
            <p>
              Information Regulator of South Africa:{' '}
              <a href="https://www.inforegulator.org.za" target="_blank" rel="noopener" className="underline">inforegulator.org.za</a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
