import Link from 'next/link';

export default function TermsPage() {
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
          <Link href="/privacy" className="text-slate-400 hover:text-white transition">Privacy Policy</Link>
          <Link href="/login" className="text-slate-400 hover:text-white transition">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-slate-400">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Service Description</h2>
            <p>
              ClearClaim is a cloud-based construction payment management platform designed for use by contractors,
              subcontractors, and their employees in the United Kingdom. The platform facilitates invoice submission,
              CIS (Construction Industry Scheme) deduction calculations, payment certificate generation, timesheet
              management, compliance tracking, and related financial workflows.
            </p>
            <p className="mt-3">
              By registering for or using ClearClaim, you agree to be bound by these Terms of Service. If you do not
              agree with any part of these terms, you must not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. User Obligations</h2>
            <p>By using ClearClaim, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Provide accurate, complete, and up-to-date information when registering and using the service.</li>
              <li>Keep your login credentials secure and not share them with any third party.</li>
              <li>Use the platform only for lawful purposes and in accordance with all applicable UK laws and regulations.</li>
              <li>Ensure that any CIS rates, payment amounts, and tax information entered are accurate and comply with HMRC requirements.</li>
              <li>Not attempt to reverse engineer, scrape, or interfere with the operation of the platform.</li>
              <li>Not upload or transmit any malicious code, spam, or unlawful content.</li>
              <li>Promptly notify us of any security breach or unauthorised use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Payment Terms</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.1 Subscription Plans</h3>
            <p>
              ClearClaim is offered on a subscription basis. Plans are billed monthly or annually as chosen at sign-up.
              Annual plans are discounted compared to monthly billing. A free trial period may be offered at our discretion.
            </p>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.2 Billing & Payment</h3>
            <p>
              Subscription fees are charged in advance. By providing payment details, you authorise us to charge the
              applicable fees on the billing date. All prices are in GBP and exclusive of VAT unless otherwise stated.
            </p>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.3 No Refunds</h3>
            <p>
              All fees are non-refundable except where required by law. If you cancel your subscription, you will retain
              access until the end of your current billing period. No partial refunds are provided for unused portions
              of a billing period.
            </p>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.4 Price Changes</h3>
            <p>
              We reserve the right to change our pricing with 30 days written notice. Continued use of the service
              after any price change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Handling</h2>
            <p>
              Your use of ClearClaim involves the processing of personal and financial data. By using the service,
              you consent to such processing as described in our{' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</Link>.
            </p>
            <p className="mt-3">
              You retain ownership of all data you upload to ClearClaim. We process your data solely to provide the
              service and as described in our Privacy Policy. We do not sell your data to third parties.
            </p>
            <p className="mt-3">
              You are responsible for ensuring you have the right to submit any data entered into the platform,
              including personal data of subcontractors and employees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Intellectual Property</h2>
            <p>
              ClearClaim and all associated intellectual property (including the platform, its design, functionality,
              and branding) remain the exclusive property of ClearClaim Limited. Nothing in these terms grants you
              any rights to our intellectual property other than the right to use the service as described herein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Limitation of Liability</h2>
            <p>
              ClearClaim is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law,
              ClearClaim Limited shall not be liable for any indirect, incidental, or consequential damages arising
              from your use of the platform, including but not limited to loss of data, revenue, or business.
            </p>
            <p className="mt-3">
              Our total liability for any claim shall not exceed the amount paid by you in the 3 months preceding the
              event giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Termination</h2>
            <p>
              You may cancel your subscription at any time through your account settings or by contacting us. Upon
              cancellation, your access will continue until the end of your current billing period.
            </p>
            <p className="mt-3">
              We reserve the right to suspend or terminate your account immediately if you breach these Terms of Service,
              engage in fraudulent activity, or fail to pay applicable fees. In such cases, we will provide notice where
              reasonably practicable.
            </p>
            <p className="mt-3">
              Upon termination, you may request an export of your data within 30 days. After 30 days, we are not
              obligated to retain your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of material changes by email
              or via the platform. Continued use after changes take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Governing Law</h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the laws of England and Wales.
              Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of
              England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:{' '}
              <a href="mailto:legal@getclearclaim.co.uk" className="text-blue-400 hover:text-blue-300">legal@getclearclaim.co.uk</a>
            </p>
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
