import Link from 'next/link';

export default function PrivacyPage() {
  const lastUpdated = '1 April 2026';

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-bold text-white">ClearClaim</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/terms" className="text-slate-400 hover:text-white transition">Terms of Service</Link>
          <Link href="/login" className="text-slate-400 hover:text-white transition">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: {lastUpdated}</p>
          <p className="text-slate-400 mt-2 text-sm">
            ClearClaim is committed to protecting your privacy in accordance with the UK GDPR and the Data Protection Act 2018.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Who We Are</h2>
            <p>
              ClearClaim Limited (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is the data controller for personal data processed through the
              ClearClaim platform. We are incorporated in England and Wales.
            </p>
            <p className="mt-3">
              For data protection enquiries, contact us at:{' '}
              <a href="mailto:privacy@getclearclaim.co.uk" className="text-blue-400 hover:text-blue-300">privacy@getclearclaim.co.uk</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. What Data We Collect</h2>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.1 Account Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and password (hashed)</li>
              <li>Company name and business details</li>
              <li>Role within the platform (contractor, subcontractor, employee)</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.2 Financial Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Invoice amounts, CIS rates, VAT amounts, and payment records</li>
              <li>Bank details (if provided for payment processing)</li>
              <li>Retention amounts and payment schedules</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.3 Employment Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Employee names, roles, hourly rates, and weekly hours</li>
              <li>Timesheet submissions and approvals</li>
              <li>Holiday requests and entitlements</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.4 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Audit log entries (actions performed within the platform)</li>
              <li>Login timestamps and IP addresses (for security purposes)</li>
              <li>Browser type and device information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Data</h2>
            <p>We process your personal data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Providing the service</strong> — to enable invoice management, CIS calculations, and payment workflows.</li>
              <li><strong className="text-white">Account management</strong> — to create and maintain your account and provide customer support.</li>
              <li><strong className="text-white">Legal compliance</strong> — to comply with UK tax law, HMRC CIS requirements, and other legal obligations.</li>
              <li><strong className="text-white">Security</strong> — to detect fraud, protect accounts, and maintain the integrity of the platform.</li>
              <li><strong className="text-white">Communications</strong> — to send transactional emails such as invoice notifications and payment certificates.</li>
              <li><strong className="text-white">Service improvements</strong> — to analyse usage patterns and improve the platform (using anonymised data where possible).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Legal Basis for Processing</h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Contract</strong> — processing necessary to perform our contract with you (providing the platform).</li>
              <li><strong className="text-white">Legal obligation</strong> — processing required to comply with UK law.</li>
              <li><strong className="text-white">Legitimate interests</strong> — for security, fraud prevention, and service improvements.</li>
              <li><strong className="text-white">Consent</strong> — where you have given explicit consent (e.g., marketing communications).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Service providers</strong> — email delivery services, hosting providers, and analytics tools, under data processing agreements.</li>
              <li><strong className="text-white">Legal authorities</strong> — where required by law or a court order.</li>
              <li><strong className="text-white">Within the platform</strong> — contractor companies can see data submitted by their subcontractors and employees as part of the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>
            <p>We retain your personal data for as long as:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Your account is active and you continue to use the service.</li>
              <li>Required to comply with legal obligations (e.g., financial records are typically retained for 6 years under HMRC requirements).</li>
              <li>Necessary to resolve disputes or enforce our agreements.</li>
            </ul>
            <p className="mt-3">
              After account closure, we will retain certain data for up to 6 years to comply with UK tax and accounting obligations,
              after which it will be securely deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Your Rights (UK GDPR)</h2>
            <p>Under UK GDPR, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Right of access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong className="text-white">Right to rectification</strong> — request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-white">Right to erasure</strong> — request deletion of your data (subject to legal retention requirements).</li>
              <li><strong className="text-white">Right to restrict processing</strong> — request that we limit how we use your data in certain circumstances.</li>
              <li><strong className="text-white">Right to data portability</strong> — receive your data in a structured, machine-readable format.</li>
              <li><strong className="text-white">Right to object</strong> — object to processing based on legitimate interests.</li>
              <li><strong className="text-white">Rights related to automated decision-making</strong> — we do not make automated decisions with significant legal effects.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@getclearclaim.co.uk" className="text-blue-400 hover:text-blue-300">privacy@getclearclaim.co.uk</a>.
              We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner&apos;s
              Office (ICO) at{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">ico.org.uk</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data, including password hashing,
              HTTPS encryption, and access controls. However, no online service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Cookies</h2>
            <p>
              ClearClaim uses session cookies for authentication purposes. These are strictly necessary for the platform to
              function and do not require consent under PECR. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email.
              The &quot;last updated&quot; date at the top of this page reflects the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Contact Us</h2>
            <p>
              For any privacy-related questions or to exercise your rights, please contact:
            </p>
            <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white font-medium">Data Protection Officer</p>
              <p className="text-slate-400">ClearClaim Limited</p>
              <p className="text-slate-400">
                Email:{' '}
                <a href="mailto:privacy@getclearclaim.co.uk" className="text-blue-400 hover:text-blue-300">
                  privacy@getclearclaim.co.uk
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-8 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>© 2026 ClearClaim. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
