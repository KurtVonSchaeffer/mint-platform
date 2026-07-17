import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AML & Financial Crime Statement — AlgoLend',
  description: 'Anti-Money Laundering & Financial Crime Statement for AlgoLend and MINT Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/aml' },
};

const VERSION = '1.0';
const EFFECTIVE_DATE = '1 July 2026';

export default function AmlPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]">
        <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-[15px] text-[var(--color-ink)]">
            ← algolend.co.za
          </Link>
          <span className="text-xs text-[var(--color-ink-soft)]">Effective {EFFECTIVE_DATE} · v{VERSION}</span>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
          Anti-Money Laundering &amp; Financial Crime Statement
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-1">
          AlgoLend, a product of MINT Platforms (Pty) Ltd
        </p>
        <p className="text-[var(--color-ink-soft)] mb-12">
          issued by MINT PLATFORMS PROPRIETARY LIMITED (Registration No. 2024/644796/07) — Effective {EFFECTIVE_DATE}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Purpose and Status of this Statement">
            <p>
              1.1. MINT Platforms (Pty) Ltd (Registration Number 2024/644796/07) (&ldquo;MINT&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is registered as a credit provider under the National Credit Act 34 of 2005 (NCR Registration Number NCRCP22892) and as a Financial Services Provider under the Financial Advisory and Intermediary Services Act 37 of 2002 (FSP Licence Number 55118). This Statement explains MINT&apos;s approach to combating money laundering, terrorist financing, proliferation financing, fraud and other financial crime in connection with AlgoLend, MINT&apos;s credit management platform. AlgoLend is a product and business unit of MINT and has no separate legal personality.
            </p>
            <p>
              1.2. This is a public-facing summary. It does not disclose MINT&apos;s internal Anti-Money Laundering, Counter-Terrorist Financing and Proliferation Financing Policy, or the detailed systems, risk models or thresholds MINT applies, disclosure of which could undermine their effectiveness. It should be read together with the Platform Services Agreement concluded with each Corporate Client and MINT&apos;s{' '}
              <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </Section>

          <Section title="2. Regulatory Basis">
            <p>
              2.1. As a registered credit provider, MINT is subject to the Financial Intelligence Centre Act 38 of 2001, as amended (&ldquo;FICA&rdquo;), and to the guidance issued by the Financial Intelligence Centre (&ldquo;FIC&rdquo;) from time to time. MINT is accordingly subject to obligations regarding customer due diligence, record-keeping, ongoing monitoring and the reporting of suspicious and unusual transactions. MINT&apos;s compliance with FICA is overseen by its Legal, Risk and Compliance Function and reported to the Board of Directors.
            </p>
            <p>
              2.2. MINT&apos;s commitment to financial crime prevention is further informed by the Prevention of Organised Crime Act 121 of 1998, the Protection of Constitutional Democracy Against Terrorist and Related Activities Act 33 of 2004, and the Prevention and Combating of Corrupt Activities Act 12 of 2004.
            </p>
          </Section>

          <Section title="3. Customer Due Diligence">
            <p>
              3.1. Before onboarding a Corporate Client to AlgoLend, and on an ongoing basis thereafter, MINT applies customer due diligence measures proportionate to the assessed risk, including verification of the Corporate Client&apos;s identity and registration, the identity of its directors and beneficial owners, and the nature and purpose of the intended business relationship and credit facility.
            </p>
            <p>
              3.2. MINT applies enhanced due diligence to relationships or transactions assessed as presenting a higher risk of money laundering, terrorist financing or other financial crime, including relationships involving prominent influential persons as defined in FICA.
            </p>
          </Section>

          <Section title="4. Risk-Based Approach">
            <p>
              MINT applies a risk-based approach to financial crime prevention, calibrating the intensity of its due diligence, monitoring and controls to the level of risk presented by a given Corporate Client, product, transaction pattern or jurisdiction, consistent with FIC guidance.
            </p>
          </Section>

          <Section title="5. Sanctions Compliance">
            <p>
              MINT screens Corporate Clients and their directors and beneficial owners against applicable targeted financial sanctions lists, including those maintained pursuant to United Nations Security Council resolutions as domesticated in South African law, before onboarding and on an ongoing basis. MINT will not knowingly establish or maintain a business relationship with a person subject to applicable sanctions.
            </p>
          </Section>

          <Section title="6. Monitoring and Reporting of Suspicious Activity">
            <p>
              6.1. AlgoLend incorporates monitoring functionality designed to assist in identifying transactions or patterns of activity that may indicate money laundering, terrorist financing or fraud. Where MINT identifies a suspicious or unusual transaction, it will assess that transaction and, where required, report it to the FIC in accordance with sections 28 and 29 of FICA.
            </p>
            <p>
              6.2. MINT does not disclose to a Corporate Client, or to any other person, the fact that a report has been made or is contemplated in respect of that person or a related transaction, where to do so would constitute an offence under FICA.
            </p>
          </Section>

          <Section title="7. Record-Keeping">
            <p>
              MINT retains records relating to customer due diligence, transactions and reports for the periods prescribed by FICA, being generally not less than five years from the date on which the relevant business relationship terminates or the transaction is concluded, as applicable.
            </p>
          </Section>

          <Section title="8. Cooperation with Regulators and Law Enforcement">
            <p>
              MINT cooperates with the FIC, the Financial Sector Conduct Authority, the National Credit Regulator, the South African Reserve Bank, the South African Police Service and other competent authorities in the investigation and prevention of financial crime, and responds to lawful requests for information within the timeframes required by law.
            </p>
          </Section>

          <Section title="9. Fraud Prevention">
            <p>
              AlgoLend incorporates identity verification, document authentication and behavioural monitoring controls designed to detect and prevent fraudulent applications and account takeover. A Corporate Client that suspects fraud in connection with the Platform is encouraged to report it promptly using the contact details at clause 12.2.
            </p>
          </Section>

          <Section title="10. Responsibilities of Corporate Clients">
            <p>
              A Corporate Client that extends credit to its own customers using AlgoLend remains responsible for its own compliance with FICA and other applicable financial crime legislation in respect of that credit, including conducting its own customer due diligence and, where it is itself an accountable institution, filing its own reports with the FIC. AlgoLend&apos;s KYC and monitoring functionality assists Corporate Clients in meeting these obligations but does not relieve a Corporate Client of its own statutory responsibilities.
            </p>
          </Section>

          <Section title="11. Consequences of Non-Compliance">
            <p>
              A Corporate Client that provides false or misleading information during onboarding, that is found to be involved in money laundering, terrorist financing, sanctions evasion or fraud, or that fails to cooperate with a legitimate request for information from MINT, is liable to have its access to AlgoLend suspended or terminated in accordance with the Platform Services Agreement, without prejudice to any report MINT is obliged to make to the FIC or another competent authority.
            </p>
          </Section>

          <Section title="12. General">
            <p>
              <strong>12.1. Related Policies and Documents.</strong> This Statement should be read together with the Platform Services Agreement, the{' '}
              <Link href="/privacy" className="underline">AlgoLend Privacy Policy</Link>, the{' '}
              <Link href="/acceptable-use" className="underline">AlgoLend Acceptable Use Policy</Link>, and MINT&apos;s internal Anti-Money Laundering, Counter-Terrorist Financing and Proliferation Financing Policy, which governs MINT&apos;s internal controls and is not published externally.
            </p>
            <p>
              <strong>12.2. Contact Details.</strong> Queries regarding this Policy, or requests to exercise a right described at clause 9, may be directed to MINT&apos;s Information Officer, Lonwabo Damane, by email to{' '}
              <a href="mailto:info@algolend.co.za" className="underline">info@algolend.co.za</a> or in writing to 3 Gwen Lane, Sandown, Johannesburg, 2031.
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
