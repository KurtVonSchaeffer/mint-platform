import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — AlgoLend',
  description: 'Terms of service for AlgoLend and Mint Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/terms' },
};

const LAST_UPDATED = '31 May 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]">
        <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-[15px] text-[var(--color-ink)]">
            ← algolend.co.za
          </Link>
          <span className="text-xs text-[var(--color-ink-soft)]">Updated {LAST_UPDATED}</span>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
          Terms of Service
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-12">
          Mint Platforms (Pty) Ltd, operating as AlgoLend — last updated {LAST_UPDATED}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Agreement">
            <p>
              By accessing or using the AlgoLend platform or algolend.co.za, you agree to be bound by these Terms of Service and our Privacy Policy. These terms form the entire agreement between you and Mint Platforms (Pty) Ltd (&ldquo;Mint Platforms&rdquo;).
            </p>
          </Section>

          <Section title="2. The service">
            <p>
              AlgoLend is a B2B white-label lending platform provided to corporate credit providers (&ldquo;Lenders&rdquo;). Mint Platforms grants Lenders a non-exclusive, non-transferable licence to use the platform subject to a separate commercial agreement.
            </p>
            <p>
              The platform includes a credit management system, borrower portal, credit engine, integrations (Experian, TruID, e-contracts, SureSystems), and reporting tools. Features available depend on the Lender&apos;s selected tier and commercial agreement.
            </p>
          </Section>

          <Section title="3. Lender obligations">
            <p>Lenders are responsible for:</p>
            <ul>
              <li>Maintaining a valid NCR registration and compliance with the National Credit Act (NCA)</li>
              <li>Configuring the credit engine to comply with their approved credit policy</li>
              <li>Obtaining necessary consent from borrowers for credit bureau enquiries</li>
              <li>SACRRA bureau reporting obligations</li>
              <li>Safeguarding their administrator credentials</li>
              <li>Ensuring their use of borrower data complies with POPIA</li>
            </ul>
          </Section>

          <Section title="4. Acceptable use">
            <p>You may not use the platform to:</p>
            <ul>
              <li>Violate any applicable South African law or regulation</li>
              <li>Process personal information without lawful basis under POPIA</li>
              <li>Attempt to circumvent platform security or access controls</li>
              <li>Reverse-engineer, copy, or resell any part of the platform without written permission</li>
            </ul>
          </Section>

          <Section title="5. Intellectual property">
            <p>
              The AlgoLend platform, all software, designs, and documentation are the exclusive intellectual property of Mint Platforms. The Lender&apos;s custom branding, credit policy configuration, and borrower data remain the Lender&apos;s property.
            </p>
          </Section>

          <Section title="6. Service availability">
            <p>
              Mint Platforms targets 99.9% monthly uptime for the platform. Planned maintenance is communicated with at least 48 hours notice. We are not liable for downtime caused by third-party providers (Supabase, Vercel, Experian, TruID, SureSystems).
            </p>
          </Section>

          <Section title="7. Limitation of liability">
            <p>
              To the maximum extent permitted by South African law, Mint Platforms is not liable for any indirect, incidental, or consequential damages arising from use of the platform. Our total liability in any 12-month period shall not exceed the fees paid by the Lender during that period.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              Either party may terminate the commercial agreement with 30 days written notice. Upon termination, the Lender&apos;s data will be made available for export for 30 days, after which it will be deleted from Mint Platforms&apos; systems.
            </p>
          </Section>

          <Section title="9. Governing law">
            <p>
              These terms are governed by the laws of the Republic of South Africa. Disputes shall be resolved in the High Court of South Africa, Gauteng Division.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Legal enquiries: <a href="mailto:legal@mintplatforms.co.za" className="underline">legal@mintplatforms.co.za</a>
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
