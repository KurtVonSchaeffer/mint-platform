import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PAIA Manual Access Notice — AlgoLend',
  description: 'PAIA Manual Access Notice for AlgoLend and MINT Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/paia' },
};

const VERSION = '1.0';
const EFFECTIVE_DATE = '1 July 2026';

export default function PaiaPage() {
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
          PAIA Manual Access Notice
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-1">
          AlgoLend, a product of MINT Platforms (Pty) Ltd
        </p>
        <p className="text-[var(--color-ink-soft)] mb-12">
          issued by MINT PLATFORMS PROPRIETARY LIMITED (Registration No. 2024/644796/07) — Effective {EFFECTIVE_DATE}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Purpose">
            <p>
              1.1. This notice explains how a person may access the manual prepared by MINT Platforms (Pty) Ltd (Registration Number 2024/644796/07) (&ldquo;MINT&rdquo;) in terms of section 51 of the Promotion of Access to Information Act 2 of 2000 (&ldquo;PAIA&rdquo;), and how a request for access to a record held by MINT, including a record relating to AlgoLend, may be submitted.
            </p>
            <p>
              1.2. AlgoLend is a product and business unit of MINT and has no separate legal personality. A request for access to a record relating to AlgoLend is a request for access to a record held by MINT Platforms (Pty) Ltd.
            </p>
          </Section>

          <Section title="2. The PAIA Manual">
            <p>
              MINT&apos;s PAIA manual describes the categories of records MINT holds, the categories of records available without a formal request, and the procedure for lodging a request for access to a record. The manual forms part of MINT&apos;s governance suite and is available on request using the contact details at clause 5.
            </p>
          </Section>

          <Section title="3. Who May Request Access">
            <p>
              Any person, including a Corporate Client, a data subject whose personal information is held by MINT, or a member of the public, may submit a request for access to a record held by MINT in accordance with PAIA.
            </p>
          </Section>

          <Section title="4. How to Submit a Request">
            <p>
              4.1. A request for access must be made using the prescribed form under the PAIA Regulations, addressed to MINT&apos;s Information Officer, and must provide sufficient detail to enable the record to be located, together with proof of the requester&apos;s identity.
            </p>
            <p>
              4.2. A prescribed fee may be payable in respect of a request, in accordance with the fee structure published under the PAIA Regulations. An access fee may also be payable once a decision to grant access has been made, calculated according to the nature of the record and the cost of reproduction.
            </p>
            <p>
              4.3. MINT will respond to a request within the periods prescribed by PAIA, currently 30 days from receipt of a complete request, subject to any extension permitted under section 57 of PAIA.
            </p>
            <p>
              4.4. A request for access may be refused on grounds recognised under PAIA, including where the record contains the personal information of a third party, commercially sensitive or confidential information, or information protected by legal professional privilege. A refusal will be communicated in writing with reasons, and the requester will be informed of the right to lodge an internal appeal or to approach the Information Regulator or a competent court, as applicable.
            </p>
          </Section>

          <Section title="5. Contact Details">
            <p>
              Requests, and enquiries regarding this notice or the PAIA manual, should be directed to MINT&apos;s Information Officer, Lonwabo Damane, by email to{' '}
              <a href="mailto:info@algolend.co.za" className="underline">info@algolend.co.za</a>, or in writing to 3 Gwen Lane, Sandown, Johannesburg, 2031.
            </p>
          </Section>

          <Section title="6. Related Policies and Documents">
            <p>
              This notice should be read together with MINT&apos;s PAIA Manual, the{' '}
              <Link href="/privacy" className="underline">AlgoLend Privacy Policy</Link>, and MINT&apos;s internal POPIA Compliance Framework and Privacy Policy.
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
