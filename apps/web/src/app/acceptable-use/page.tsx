import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — AlgoLend',
  description: 'Acceptable Use Policy for AlgoLend and MINT Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/acceptable-use' },
};

const VERSION = '1.0';
const EFFECTIVE_DATE = '1 July 2026';

export default function AcceptableUsePage() {
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
          Acceptable Use Policy
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-1">
          AlgoLend, a product of MINT Platforms (Pty) Ltd
        </p>
        <p className="text-[var(--color-ink-soft)] mb-12">
          issued by MINT PLATFORMS PROPRIETARY LIMITED (Registration No. 2024/644796/07) — Effective {EFFECTIVE_DATE}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Purpose and Application">
            <p>
              1.1. This Acceptable Use Policy governs access to and use of AlgoLend, the credit management platform operated by MINT Platforms (Pty) Ltd (Registration Number 2024/644796/07) (&ldquo;MINT&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), and the website at algolend.co.za (the &ldquo;Site&rdquo;). AlgoLend is a product and business unit of MINT and has no separate legal personality.
            </p>
            <p>
              1.2. This Policy applies to every Corporate Client and to every individual accessing the Platform on a Corporate Client&apos;s behalf, including its directors, employees, contractors and other authorised users, each a &ldquo;User&rdquo;. This Policy is incorporated by reference into, and forms part of, the Platform Services Agreement concluded between MINT and each Corporate Client. In the event of a conflict between this Policy and the Platform Services Agreement, the Platform Services Agreement prevails.
            </p>
          </Section>

          <Section title="2. Definitions">
            <ul>
              <li><strong>&ldquo;Credentials&rdquo;</strong> means the username, password, multi-factor authentication token or other means by which a User authenticates to the Platform.</li>
              <li><strong>&ldquo;Platform&rdquo;</strong> means AlgoLend, including its credit engine, KYC and verification module, open banking integration, electronic contracting functionality, SACRRA reporting capability, and the Site.</li>
              <li><strong>&ldquo;User&rdquo;</strong> means as defined in clause 1.2.</li>
            </ul>
          </Section>

          <Section title="3. Lawful and Authorised Use">
            <p>
              3.1. A User must use the Platform only for lawful purposes connected with the Corporate Client&apos;s business, in accordance with the Platform Services Agreement, this Policy, and all applicable law, including the National Credit Act 34 of 2005, FICA, POPIA, the Consumer Protection Act 68 of 2008 and the Electronic Communications and Transactions Act 25 of 2002.
            </p>
            <p>
              3.2. A Corporate Client is responsible for the acts and omissions of every User accessing the Platform under its account, and for ensuring that only authorised individuals are granted access.
            </p>
          </Section>

          <Section title="4. Credential Security">
            <p>
              A User must keep their Credentials confidential, must not share Credentials with any other person, and must notify MINT immediately on becoming aware of any unauthorised access to, or use of, their account.
            </p>
          </Section>

          <Section title="5. Prohibited Conduct">
            <p>A User must not:</p>
            <ul>
              <li>Submit false, misleading or fraudulent information, including in support of a credit application or KYC verification process, or permit or assist a third party to do so</li>
              <li>Use the Platform to facilitate money laundering, terrorist financing, sanctions evasion or other financial crime</li>
              <li>Attempt to gain unauthorised access to the Platform, to another Corporate Client&apos;s data, or to a system or network connected to the Platform</li>
              <li>Probe, scan or test the vulnerability of the Platform, or conduct security or penetration testing, save with MINT&apos;s prior written consent</li>
              <li>Reverse engineer, decompile, disassemble or otherwise attempt to derive the source code, underlying algorithms or credit models of the Platform, save to the extent such restriction is not permitted by applicable law</li>
              <li>Scrape, harvest or extract data from the Platform using automated means, save where expressly authorised through an application programming interface made available for that purpose</li>
              <li>Introduce a virus, worm, malicious code or other harmful or disruptive component to the Platform</li>
              <li>Interfere with or disrupt the integrity, security or performance of the Platform, or any data or transactions processed through it</li>
              <li>Use the Platform to infringe the intellectual property, privacy or other rights of a third party</li>
              <li>Use the Platform in a manner that breaches, or causes MINT to breach, applicable law or a regulatory requirement</li>
            </ul>
          </Section>

          <Section title="6. Monitoring and Enforcement">
            <p>
              6.1. MINT may monitor use of the Platform to detect and prevent breaches of this Policy, fraud and other financial crime, and to maintain the security and performance of the Platform, in accordance with the{' '}
              <Link href="/privacy" className="underline">AlgoLend Privacy Policy</Link>.
            </p>
            <p>
              6.2. A breach of this Policy may result in the suspension or termination of a User&apos;s access to the Platform, or of the Corporate Client&apos;s access under the Platform Services Agreement, and, where applicable, a report to the FIC or another competent authority. MINT may take such action without prior notice where necessary to protect the security or integrity of the Platform or to comply with a legal obligation.
            </p>
          </Section>

          <Section title="7. General">
            <p>
              <strong>7.1. Reporting Concerns.</strong> Suspected misuse of the Platform, security vulnerabilities or breaches of this Policy may be reported to MINT&apos;s Legal, Risk and Compliance Function by email to{' '}
              <a href="mailto:legal@mymint.co.za" className="underline">legal@mymint.co.za</a>.
            </p>
            <p>
              <strong>7.2. Amendment.</strong> MINT may amend this Policy from time to time in accordance with the amendment provisions of the Platform Services Agreement. Continued use of the Platform following notice of an amendment constitutes acceptance of the amended Policy.
            </p>
            <p>
              <strong>7.3. Related Policies and Documents.</strong> This Policy should be read together with the Platform Services Agreement, the{' '}
              <Link href="/privacy" className="underline">AlgoLend Privacy Policy</Link>, and the{' '}
              <Link href="/aml" className="underline">AlgoLend AML and Financial Crime Statement</Link>.
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
