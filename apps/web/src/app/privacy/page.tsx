import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — AlgoLend',
  description: 'Privacy policy for AlgoLend and MINT Platforms (Pty) Ltd.',
  alternates: { canonical: 'https://algolend.co.za/privacy' },
};

const VERSION = '1.0';
const EFFECTIVE_DATE = '1 July 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]">
        <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-[15px] text-[var(--color-ink)]">
            ← algolend.co.za
          </Link>
          <span className="text-xs text-[var(--color-ink-soft)]">Effective {EFFECTIVE_DATE} · v{VERSION}</span>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-[860px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
          Privacy Policy
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-1">
          AlgoLend, a product of MINT Platforms (Pty) Ltd
        </p>
        <p className="text-[var(--color-ink-soft)] mb-12">
          issued by MINT PLATFORMS PROPRIETARY LIMITED (Registration No. 2024/644796/07) — Effective {EFFECTIVE_DATE}
        </p>

        <div className="prose max-w-none" style={{ color: 'var(--color-ink-soft)', lineHeight: '1.75' }}>

          <Section title="1. Introduction">
            <p><strong>1.1. Identity and Status of MINT Platforms</strong></p>
            <p>
              1.1.1. MINT Platforms (Pty) Ltd (Registration Number 2024/644796/07) (&ldquo;MINT&rdquo;, the &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) is a private company incorporated under the laws of the Republic of South Africa. MINT is registered as a Financial Services Provider under the Financial Advisory and Intermediary Services Act 37 of 2002 (FSP Licence Number 55118) and as a credit provider under the National Credit Act 34 of 2005 (NCR Registration Number NCRCP22892).
            </p>
            <p>
              1.1.2. AlgoLend is not a separate legal person. AlgoLend is a trading name, product and business unit of MINT, comprising a credit engine, a KYC and verification module, open banking integration, electronic contracting functionality and SACRRA reporting capability. A reference to AlgoLend in this Policy, on the Site or in any related documentation is a reference to MINT trading and operating in that name, and any agreement concluded through the Site or the Platform is concluded with MINT.
            </p>
            <p>
              1.1.3. This Policy is issued in accordance with the Protection of Personal Information Act 4 of 2013 (&ldquo;POPIA&rdquo;) and sets out how MINT collects, uses, discloses, retains and protects personal information in connection with AlgoLend and the website at algolend.co.za (the &ldquo;Site&rdquo;), and describes the rights available to data subjects whose personal information MINT processes.
            </p>
            <p><strong>1.2. Application of this Policy</strong></p>
            <p>
              1.2.1. This Policy applies to visitors to the Site, to prospective Corporate Clients who make enquiries about AlgoLend, to Corporate Clients that have concluded a Platform Services Agreement with MINT, and to the directors, beneficial owners, authorised users and representatives of those Corporate Clients whose personal information is submitted to MINT in the course of onboarding, credit assessment and account administration.
            </p>
            <p>
              1.2.2. MINT is the sole registered credit provider extending credit facilities to Corporate Clients through AlgoLend, and Corporate Clients are the borrowers under those facilities. Where a Corporate Client separately uses functionality within AlgoLend to originate, assess or manage credit extended by that Corporate Client to its own customers, that Corporate Client determines the purpose and means of processing its customers&apos; personal information and is the responsible party for that processing. MINT processes such personal information solely on the Corporate Client&apos;s instruction and in that respect acts as an operator, as more fully addressed at clause 3.
            </p>
          </Section>

          <Section title="2. Definitions and Interpretation">
            <p><strong>2.1. Definitions</strong></p>
            <ul>
              <li><strong>&ldquo;Corporate Client&rdquo;</strong> means a juristic entity that has been onboarded to, or has applied to be onboarded to, AlgoLend and that borrows from MINT, and where applicable extends credit to its own customers, using the Platform, under a Platform Services Agreement.</li>
              <li><strong>&ldquo;Information Officer&rdquo;</strong> means the person appointed by MINT as its information officer under section 55 of POPIA.</li>
              <li><strong>&ldquo;Information Regulator&rdquo;</strong> means the Information Regulator established under section 39 of POPIA.</li>
              <li><strong>&ldquo;Operator&rdquo;</strong>, <strong>&ldquo;Personal Information&rdquo;</strong>, <strong>&ldquo;Processing&rdquo;</strong> and <strong>&ldquo;Responsible Party&rdquo;</strong> have the meanings given in section 1 of POPIA.</li>
              <li><strong>&ldquo;Platform&rdquo;</strong> means AlgoLend, comprising the credit engine, the KYC and verification module, open banking integration, electronic contracting functionality, SACRRA reporting capability, and the Site.</li>
              <li><strong>&ldquo;Platform Services Agreement&rdquo;</strong> means the agreement concluded between MINT and a Corporate Client governing that Corporate Client&apos;s use of the Platform and, where applicable, the credit facility extended by MINT to that Corporate Client.</li>
              <li><strong>&ldquo;Site&rdquo;</strong> means the website located at algolend.co.za.</li>
            </ul>
            <p><strong>2.2. Interpretation.</strong> Words importing the singular include the plural and words importing the plural include the singular. A reference to legislation is a reference to that legislation as amended, re-enacted or replaced from time to time. Clause headings are for convenience only and do not affect the interpretation of this Policy.</p>
          </Section>

          <Section title="3. Relationship Between MINT and a Corporate Client's Own Customers">
            <p>
              An individual who has obtained or applied for credit from a Corporate Client using AlgoLend should refer to that Corporate Client&apos;s own privacy policy for information on how that individual&apos;s personal information is processed. This Policy governs MINT&apos;s processing of personal information as responsible party, being personal information relating to Site visitors, prospective and onboarded Corporate Clients, and the directors, beneficial owners, authorised users and representatives of those Corporate Clients.
            </p>
          </Section>

          <Section title="4. Personal Information MINT Collects">
            <p><strong>4.1. Categories of Personal Information</strong></p>
            <p>4.1.1. MINT collects enquiry and correspondence data, being the name, business email address, telephone number, company name and any other information volunteered through an enquiry or support channel on the Site.</p>
            <p>4.1.2. MINT collects onboarding and KYC data in respect of a Corporate Client and its directors, beneficial owners and authorised representatives, including identity or passport numbers, proof of identity and residential address, company registration details, proof of business address, banking details and source of funds information, collected to fulfil MINT&apos;s obligations under the Financial Intelligence Centre Act 38 of 2001 (&ldquo;FICA&rdquo;) and its risk-based customer due diligence processes.</p>
            <p>4.1.3. MINT collects credit and financial information relating to a Corporate Client&apos;s financial position, credit history and creditworthiness, including information obtained from registered credit bureaux and the South African Credit and Risk Reporting Association (SACRRA), collected in MINT&apos;s capacity as a registered credit provider under the National Credit Act.</p>
            <p>4.1.4. MINT collects platform usage data, being login credentials, user activity, IP addresses, device identifiers and diagnostic data generated through use of the Site and the Platform.</p>
            <p>4.1.5. MINT retains records of communications between a data subject and MINT, including support queries.</p>
            <p><strong>4.2. Special Personal Information and Children</strong></p>
            <p>4.2.1. MINT does not knowingly collect special personal information as defined in section 26 of POPIA, save where such information is incidentally disclosed in correspondence or where processing is otherwise permitted under section 27 of POPIA, in which event MINT will process it strictly in accordance with that section.</p>
            <p>4.2.2. AlgoLend is a business-to-business platform intended for use by juristic entities and their authorised adult representatives. It is not directed at children, and MINT does not knowingly collect personal information from children other than in accordance with section 35 of POPIA. Where MINT becomes aware that it has inadvertently collected a child&apos;s personal information other than as permitted by that section, it will take reasonable steps to delete that information.</p>
            <p><strong>4.3. Sources of Personal Information.</strong> MINT collects personal information directly from data subjects, from public company registers, from registered credit bureaux and SACRRA, from open banking data providers authorised by a Corporate Client, and from third-party identity verification and KYC service providers engaged by MINT.</p>
          </Section>

          <Section title="5. Purpose and Lawful Basis for Processing">
            <p><strong>5.1. Purpose of Processing.</strong> MINT processes personal information to:</p>
            <ul>
              <li>Respond to enquiries and provide information about AlgoLend</li>
              <li>Assess applications to become a Corporate Client and conduct onboarding, KYC and credit due diligence</li>
              <li>Conclude and administer the Platform Services Agreement and the credit facility extended to a Corporate Client</li>
              <li>Operate, maintain and secure the Platform and the Site</li>
              <li>Comply with obligations under FICA, the National Credit Act, the Financial Advisory and Intermediary Services Act, the Companies Act 71 of 2008 and other applicable law</li>
              <li>Detect, investigate and prevent fraud, money laundering and other financial crime</li>
              <li>Communicate with Corporate Clients regarding the Platform, including service notices and, where consented to, marketing communications</li>
              <li>Exercise or defend its legal rights</li>
            </ul>
            <p><strong>5.2. Lawful Basis.</strong> MINT relies on one or more of the justifications recognised under section 11 of POPIA for each processing activity described in this Policy, namely consent, the performance of a contract or the taking of steps at a data subject&apos;s request prior to entering into a contract, compliance with a legal obligation including under FICA, the National Credit Act and POPIA, and the pursuit of legitimate interests by MINT or a third party, including fraud prevention, platform security and the assessment of creditworthiness, provided such interests are not overridden by the data subject&apos;s interests or fundamental rights.</p>
            <p><strong>5.3. Consent.</strong> Where MINT relies on consent, that consent may be withdrawn at any time, without affecting the lawfulness of processing carried out before withdrawal, by contacting the Information Officer using the details in clause 10.3. Withdrawal of consent to processing necessary for the performance of the Platform Services Agreement may affect MINT&apos;s ability to continue providing the Platform to the relevant Corporate Client.</p>
          </Section>

          <Section title="6. Cookies and Marketing">
            <p><strong>6.1. Cookies.</strong> The Site may use cookies and similar technologies for authentication, security and session management, and, where enabled, for analytics purposes.</p>
            <p><strong>6.2. Marketing.</strong> MINT may use a business contact&apos;s details to send information about AlgoLend and related services, where consent has been given or where the communication falls within the existing business relationship exemption recognised under section 69 of the Electronic Communications and Transactions Act 25 of 2002. A recipient may opt out of marketing communications at any time using the unsubscribe mechanism provided or by contacting MINT directly.</p>
          </Section>

          <Section title="7. Automated Decision-Making">
            <p>
              7.1. AlgoLend&apos;s credit engine generates automated outputs, including credit scoring and risk indicators, that inform credit decisions taken by MINT in respect of a Corporate Client&apos;s facility and, where applicable, decisions taken by a Corporate Client in respect of its own customers. Where such automated processing produces legal or similarly significant effects for a data subject, section 71 of POPIA affords that data subject the right not to be subject to a decision based solely on automated processing intended to profile them, subject to the exceptions in that section.
            </p>
            <p>
              7.2. Where MINT itself makes an automated decision in respect of a Corporate Client&apos;s credit facility, an authorised representative of the Corporate Client may request that the decision be reconsidered by a natural person by contacting MINT using the details in clause 10.3. Where a Corporate Client uses AlgoLend&apos;s outputs to make its own automated decisions regarding its customers, the Corporate Client, as responsible party for that processing, is responsible for affording those customers the equivalent right, and MINT will provide reasonable assistance to Corporate Clients in meeting that obligation in accordance with the Platform Services Agreement.
            </p>
          </Section>

          <Section title="8. Retention, Security and Cross-Border Transfers">
            <p><strong>8.1. Retention.</strong> MINT retains personal information for as long as necessary to fulfil the purposes described in this Policy and to comply with its statutory retention obligations, including the record-keeping requirements of FICA, the National Credit Act and the Companies Act, and to establish, exercise or defend legal claims. Retention periods vary according to the category of information and the purpose for which it was collected.</p>
            <p><strong>8.2. Security Safeguards.</strong> MINT implements appropriate technical and organisational measures, in accordance with section 19 of POPIA, to secure the integrity and confidentiality of personal information in its possession or under its control, including access controls, encryption of data in transit, and contractual security obligations imposed on its third-party service providers. No system of transmission or storage can be guaranteed to be entirely secure.</p>
            <p><strong>8.3. Cross-Border Transfers.</strong> Where MINT transfers personal information to a third party located outside South Africa, it does so only where the recipient is subject to a law, binding corporate rules or a binding agreement affording a level of protection substantially similar to POPIA, or where another ground recognised under section 72 of POPIA applies.</p>
            <p><strong>8.4. Operators and Third-Party Service Providers.</strong> MINT engages third-party service providers to support the operation of AlgoLend, which may include identity verification and KYC providers, open banking data aggregators, payment processing providers, cloud hosting providers, and SACRRA. Each such provider is contractually bound to process personal information only on MINT&apos;s instruction, to maintain appropriate security safeguards, and to comply with section 21 of POPIA.</p>
          </Section>

          <Section title="9. Data Subject Rights">
            <p><strong>9.1. Rights Under POPIA.</strong> A data subject has the right, subject to POPIA, to:</p>
            <ul>
              <li>Be notified that personal information about them is being collected and, in the circumstances set out in section 24 of POPIA, that it has been accessed or acquired by an unauthorised person</li>
              <li>Establish whether MINT holds personal information about them and to request access to that information</li>
              <li>Request the correction, destruction or deletion of personal information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading, unlawfully obtained, or that MINT is no longer authorised to retain</li>
              <li>Object, on reasonable grounds, to the processing of their personal information, and to object to the processing of their personal information for purposes of direct marketing</li>
              <li>Withdraw consent to processing where processing is based on consent, and to lodge a complaint with the Information Regulator or approach a competent court regarding an alleged infringement of their rights under POPIA</li>
            </ul>
            <p>A data subject who wishes to exercise a right described in this clause should contact the Information Officer using the details in clause 10.3. MINT will respond within the timeframes prescribed by POPIA.</p>
            <p><strong>9.2. Data Breach Notification.</strong> Should a security compromise occur that has resulted, or is reasonably likely to result, in unauthorised access to or acquisition of personal information, MINT will notify the Information Regulator and the affected data subjects as soon as reasonably possible, in accordance with section 22 of POPIA, unless a public body responsible for the prevention, detection or investigation of offences requests that notification be delayed.</p>
            <p><strong>9.3. Complaints.</strong> A data subject who is not satisfied with MINT&apos;s response to a request or complaint may lodge a complaint with the Information Regulator, whose contact details are published at{' '}
              <a href="https://www.justice.gov.za/inforeg" target="_blank" rel="noopener" className="underline">www.justice.gov.za/inforeg</a>.
            </p>
          </Section>

          <Section title="10. General">
            <p><strong>10.1. Amendment.</strong> MINT may amend this Policy from time to time to reflect changes in its processing activities or in applicable law. The version number and effective date on the cover of this Policy indicate the current version. Material changes will be notified to Corporate Clients in accordance with the notice provisions of the Platform Services Agreement.</p>
            <p><strong>10.2. Related Policies and Documents.</strong> This Policy should be read together with the Platform Services Agreement, the Cookie Policy, the{' '}
              <Link href="/acceptable-use" className="underline">Acceptable Use Policy</Link>, the{' '}
              <Link href="/aml" className="underline">AlgoLend AML and Financial Crime Statement</Link>, the{' '}
              <Link href="/paia" className="underline">PAIA Manual Access Notice</Link>, and MINT&apos;s internal POPIA Compliance Framework and Privacy Policy, which governs MINT&apos;s processing of personal information generally, beyond the AlgoLend Platform.
            </p>
            <p>
              <strong>10.3. Contact Details.</strong> Queries regarding this Policy, or requests to exercise a right described at clause 9, may be directed to MINT&apos;s Information Officer, Lonwabo Damane, by email to{' '}
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
