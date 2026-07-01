'use client'

import {
  Database,
  FileText,
  Globe2,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  UserCheck,
} from 'lucide-react'
import { PORTFOLIO_URL, REPOSITORY_URL } from '@/lib/seo'

const LAST_UPDATED = 'July 1, 2026'

const policyHighlights = [
  {
    icon: Scale,
    title: 'Legal use',
    text: 'LexInsights is a research and compliance assistant, not a lawyer or law firm.',
  },
  {
    icon: UploadCloud,
    title: 'Your inputs',
    text: 'Chats and uploaded documents may be processed to answer, review, and organize your work.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification',
    text: 'Always confirm legal output with official sources, qualified counsel, or the relevant authority.',
  },
]

const termsSections = [
  {
    title: 'Acceptance and scope',
    body:
      'By accessing LexInsights, you agree to these terms. The service supports Philippine legal research, compliance drafting, document review, citation discovery, and related workspace features.',
  },
  {
    title: 'Research tool only',
    body:
      'LexInsights provides informational research assistance. It is not a law firm, does not provide legal advice, and does not create an attorney-client relationship.',
  },
  {
    title: 'Accounts and guest mode',
    body:
      'You may use guest mode for lightweight work or sign in to save account-backed chats, documents, and workspace history. You are responsible for protecting your account credentials and activity.',
  },
  {
    title: 'User content',
    body:
      'You remain responsible for prompts, files, excerpts, and other materials you submit. Do not upload confidential, privileged, personal, or sensitive information unless you have authority to process it.',
  },
  {
    title: 'Generated output',
    body:
      'Answers, summaries, checklists, reports, citations, and exports may be incomplete, outdated, or incorrect. Verify legal information with official sources, relevant authorities, and qualified professionals before relying on it.',
  },
  {
    title: 'Acceptable use',
    body:
      'Do not use LexInsights to break the law, harm others, infringe rights, upload unlawful content, reverse engineer the service, overload systems, bypass security, or misrepresent generated output as official legal advice.',
  },
  {
    title: 'Third-party services',
    body:
      'LexInsights may rely on external providers for hosting, authentication, storage, extraction, or optional research backends. Those providers may process data under their own terms and notices where applicable.',
  },
  {
    title: 'Availability and changes',
    body:
      'Features may change, pause, degrade, or be removed. LexInsights may update these terms by publishing a revised version on this page with a new effective date.',
  },
  {
    title: 'Intellectual property',
    body:
      'LexInsights, its interface, branding, code, and curated local corpus structure remain protected by applicable intellectual property laws. You retain rights in content you lawfully submit.',
  },
  {
    title: 'Suspension or termination',
    body:
      'Access may be limited, suspended, or terminated if use creates legal, security, operational, or abuse risks, or if these terms are violated.',
  },
  {
    title: 'Governing law',
    body:
      'These terms are governed by the laws of the Philippines, without limiting non-waivable rights that may apply under consumer, privacy, or other mandatory laws.',
  },
]

const privacySections = [
  {
    icon: Scale,
    title: 'Who this covers',
    body:
      'This notice applies to LexInsights users, including guests and signed-in account holders who use chat, document review, local research, export, and related app features.',
  },
  {
    icon: Database,
    title: 'Information collected',
    body:
      'LexInsights may handle account profile details from the sign-in provider, chat prompts, generated answers, uploaded file names and extracted text, saved workspace content, local preferences, and basic technical diagnostics.',
  },
  {
    icon: UploadCloud,
    title: 'Document and prompt data',
    body:
      'Documents and prompts are processed to extract text, generate research responses, analyze compliance issues, produce citations, and support exports or saved conversations.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Purposes and basis',
    body:
      'Processing is performed to provide requested services, maintain accounts, secure the app, troubleshoot issues, comply with law, and improve reliability. Depending on the context, processing may rely on consent, contract necessity, legitimate interests, or legal obligations recognized under Philippine data privacy law.',
  },
  {
    icon: ShieldCheck,
    title: 'Sensitive information',
    body:
      'LexInsights is not designed to request highly sensitive personal data. If your files or prompts contain personal, sensitive personal, privileged, or confidential information, submit them only when you have a lawful basis and authority to do so.',
  },
  {
    icon: Globe2,
    title: 'Providers and transfers',
    body:
      'Information may be processed by configured hosting, authentication, storage, document-extraction, or optional RAG providers. These providers may operate in or outside the Philippines, subject to applicable transfer, confidentiality, and security safeguards.',
  },
  {
    icon: Globe2,
    title: 'Service providers',
    body:
      'LexInsights uses providers only for app functions such as hosting, authentication, storage, extraction, and optional research backends. Provider access should be limited to the service purpose and governed by their applicable security, privacy, and processing terms.',
  },
  {
    icon: Lock,
    title: 'Security',
    body:
      'LexInsights uses reasonable technical and organizational safeguards appropriate to the app, including access controls, provider security features, and limited processing for the functions requested by the user.',
  },
  {
    icon: ShieldCheck,
    title: 'Incidents and notices',
    body:
      'If LexInsights identifies a security or privacy incident, the project will assess affected data, contain the issue, preserve necessary evidence, and consider notices to affected users, providers, authorities, or the National Privacy Commission where legally required.',
  },
  {
    icon: Database,
    title: 'Retention',
    body:
      'Guest data may remain in the browser or local session. Signed-in workspace data may be retained while the account or feature remains active, unless deleted earlier, required for security, or retained to meet legal and operational needs.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Cookies and local storage',
    body:
      'The app may use cookies, local storage, and similar browser technologies for authentication, theme preferences, guest chats, saved settings, and core app functionality.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Privacy-safe analytics',
    body:
      'LexInsights may record lightweight first-party usage events such as public page visits, Help & Resources opens, source-link clicks, and chat starts. These events use fixed names and limited metadata only; they do not include chat text, document text, file contents, full private URLs, account IDs, or cookies for analytics.',
  },
  {
    icon: UserCheck,
    title: 'Your PH privacy rights',
    body:
      'Under Philippine data privacy law, data subjects may have rights to be informed, access, object, rectify, erase or block, data portability, damages, and file a complaint with the National Privacy Commission, subject to applicable requirements and exceptions.',
  },
  {
    icon: UserCheck,
    title: 'Your choices',
    body:
      'You can avoid uploading sensitive files, use guest mode for limited work, delete available local chats, manage account information through the sign-in provider, and contact the project maintainer for privacy requests related to LexInsights-controlled data.',
  },
  {
    icon: UserCheck,
    title: 'Requests',
    body:
      'Privacy requests should identify the account, browser-local data, or content involved. LexInsights may need to verify control of the account or request before access, correction, export, deletion, objection, or related requests can be handled.',
  },
  {
    icon: ShieldCheck,
    title: 'Children and minors',
    body:
      'LexInsights is intended for general legal research and compliance work, not for children. Minors should use the service only with appropriate parent, guardian, school, or organizational supervision.',
  },
  {
    icon: FileText,
    title: 'Policy updates',
    body:
      'This policy may be updated to reflect product, provider, legal, or operational changes. The current version is published on this page with the effective date shown above.',
  },
  {
    icon: Mail,
    title: 'Privacy contact',
    body:
      'For questions or requests about LexInsights-controlled data, use the maintainer portfolio or public repository links below.',
  },
]

interface TermsPrivacyPanelProps {
  showHighlights?: boolean
  showIntro?: boolean
}

export function TermsPrivacyPanel({
  showHighlights = true,
  showIntro = true,
}: TermsPrivacyPanelProps) {
  return (
    <div className="space-y-8">
      {showIntro && (
        <section className="border-b border-[#8A82DC]/70 pb-6 dark:border-iris-300/15">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFECFF] text-iris-800 dark:bg-iris-400/10 dark:text-iris-200">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">
                Terms & Privacy
              </p>
              <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-slate-100">
                Combined service terms and privacy notice
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                Last updated {LAST_UPDATED}. This summary explains how LexInsights should be used and how the
                app handles information while supporting Philippine legal research and compliance workflows.
              </p>
            </div>
          </div>
        </section>
      )}

      {showHighlights && (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Policy highlights">
          {policyHighlights.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="border-l border-[#8A82DC]/70 pl-4 first:border-l-0 first:pl-0 dark:border-iris-300/15"
            >
              <Icon className="h-5 w-5 text-iris-700 dark:text-iris-200" aria-hidden="true" />
              <h4 className="mt-3 text-sm font-bold text-slate-950 dark:text-slate-100">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{text}</p>
            </div>
          ))}
        </section>
      )}

      <section className="scroll-mt-8 border-t border-[#8A82DC]/70 pt-7 dark:border-iris-300/15" aria-labelledby="terms-heading">
        <div className="mb-4 grid gap-2 md:grid-cols-[13rem_1fr] md:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-iris-700 dark:text-iris-200">01</span>
            <h3 id="terms-heading" className="text-lg font-extrabold text-slate-950 dark:text-slate-100">
              Terms of Service
            </h3>
          </div>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-400">
            Rules for access, user content, generated output, acceptable use, and Philippine governing law.
          </p>
        </div>
        <div className="divide-y divide-[#8A82DC]/60 dark:divide-iris-300/15">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="grid gap-2 py-5 md:grid-cols-[13rem_1fr] md:gap-6"
            >
              <h4 className="text-base font-extrabold text-slate-950 dark:text-slate-100">{section.title}</h4>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="scroll-mt-8 border-t border-[#8A82DC]/70 pt-7 dark:border-iris-300/15" aria-labelledby="privacy-heading">
        <div className="mb-4 grid gap-2 md:grid-cols-[13rem_1fr] md:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-iris-700 dark:text-iris-200">02</span>
            <h3 id="privacy-heading" className="text-lg font-extrabold text-slate-950 dark:text-slate-100">
              Privacy Policy
            </h3>
          </div>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-400">
            How LexInsights handles account, chat, document, provider, retention, and data subject rights.
          </p>
        </div>
        <div className="divide-y divide-[#8A82DC]/60 dark:divide-iris-300/15">
          {privacySections.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="grid gap-3 py-5 md:grid-cols-[13rem_1fr] md:gap-6"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-iris-700 dark:text-iris-200" aria-hidden="true" />
                <h4 className="text-base font-extrabold text-slate-950 dark:text-slate-100">{title}</h4>
              </div>
              <div className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                <p>{body}</p>
                {title === 'Privacy contact' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={PORTFOLIO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm font-semibold text-iris-800 transition-colors hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:text-iris-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                    >
                      Maintainer portfolio
                    </a>
                    <a
                      href={`${REPOSITORY_URL}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm font-semibold text-iris-800 transition-colors hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:text-iris-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                    >
                      Repository issues
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  )
}
