import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-lg shadow-blue-500/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ClearClaim</span>
          </div>
          {/* Nav actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register/contractor"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
            >
              Register Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        {/* Glow behind headline */}
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-center"
          aria-hidden
        >
          <div className="mt-16 h-[500px] w-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
            <span>🏗️</span>
            <span>Built for UK Construction</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Construction Invoice Management,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Built for the Modern Site
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            ClearClaim handles your subcontractor invoices, timesheets, holidays and CIS returns — all in one place. Built for UK contractors.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register/contractor"
              className="w-full rounded-xl bg-blue-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-400 sm:w-auto"
            >
              Start for Free
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            {[
              { stat: '3 Portals', desc: 'Contractor, Subcontractor & Employee' },
              { stat: '100% CIS Compliant', desc: 'Automated deductions' },
              { stat: 'AI Duplicate Detection', desc: 'Catch fraudulent claims' },
              { stat: 'GDPR Ready', desc: 'UK data protection' },
            ].map(({ stat, desc }) => (
              <div key={stat} className="flex flex-col gap-1">
                <span className="text-lg font-bold text-white sm:text-xl">{stat}</span>
                <span className="text-sm text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Everything you need to run your site
            </h2>
            <p className="mt-4 text-slate-400">
              One platform. Every workflow. Zero spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '🧾',
                title: 'Invoice Management',
                desc: 'Submit, review and approve subcontractor invoices with full audit trail. Line-item queries, AI duplicate detection and instant PDF certificates.',
              },
              {
                icon: '📋',
                title: 'Application for Payment',
                desc: 'Industry-standard format with cumulative values, previously certified amounts and sequential numbering (App 1, 2, 3...).',
              },
              {
                icon: '🏦',
                title: 'CIS Handling',
                desc: 'Automatic CIS deductions at 0%, 20% or 30%. Monthly CIS return reports ready for HMRC submission. Full per-subcontractor breakdown.',
              },
              {
                icon: '🔒',
                title: 'Retention Tracking',
                desc: 'Track retention held on every invoice. Set release dates, release partially or fully, and notify subcontractors automatically.',
              },
              {
                icon: '📋',
                title: 'Variations & Change Orders',
                desc: 'Subcontractors submit variations with auto-numbering. Contractors approve or reject with comments. Totals tracked per project.',
              },
              {
                icon: '✅',
                title: 'Compliance Tracker',
                desc: 'Track insurance, CSCS cards, CIS registration and VAT certs per subcontractor. Expiry warnings 30 days ahead. Never miss a lapse.',
              },
              {
                icon: '⚖️',
                title: 'Dispute Resolution',
                desc: 'Formal dispute log with Construction Act timeline. Pay less notice deadlines, payment due dates and full action timeline per dispute.',
              },
              {
                icon: '⏱️',
                title: 'Timesheet Management',
                desc: 'Employees submit weekly timesheets with daily hours. Overtime detection, project tagging and one-click payroll summary export.',
              },
              {
                icon: '📅',
                title: 'Holiday Calendar',
                desc: 'Visual team holiday calendar. Set maximum staff off per day, prevent clashes, and manage annual leave with team conflict detection.',
              },
              {
                icon: '🏗️',
                title: 'Project Management',
                desc: 'Create projects, track contract values, monitor % spend against budget. Warning alerts at 75% and 90% of contract value.',
              },
              {
                icon: '💰',
                title: 'Cash Flow Forecast',
                desc: '30/60/90 day payment forecast. Upcoming invoice payments, retention release schedule and overdue alerts — all in one view.',
              },
              {
                icon: '📊',
                title: 'QuickBooks & Xero Export',
                desc: 'One-click export of approved invoices to QuickBooks (IIF) or Xero (CSV). No re-keying, no errors, no wasted time.',
              },
              {
                icon: '💳',
                title: 'Payment Runs',
                desc: 'Batch approve and mark invoices as paid. Track outstanding payments and send automatic payment notifications.',
              },
              {
                icon: '📥',
                title: 'Bulk Invoice Import',
                desc: 'Upload CSV or PDF invoices in bulk. AI parsing extracts invoice numbers, amounts and dates automatically.',
              },
              {
                icon: '🔍',
                title: 'Audit Trail',
                desc: 'Every action logged with timestamp and user. Full searchable audit log for disputes, compliance and peace of mind.',
              },
              {
                icon: '🔔',
                title: 'Smart Notifications',
                desc: 'Real-time in-app notifications across all portals. Invoice alerts, timesheet approvals, holiday decisions — never miss an update.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-blue-500/30 hover:bg-white/[0.06]"
              >
                <div className="mb-3 text-3xl">{icon}</div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three Portals ── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              One platform, three portals
            </h2>
            <p className="mt-4 text-slate-400">
              Purpose-built views for every role on your team.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Contractor Portal */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                🏢 Contractor Portal
              </div>
              <h3 className="mb-5 mt-4 text-xl font-bold text-white">Built for site managers</h3>
              <ul className="space-y-3">
                {[
                  'Manage all subcontractor invoices',
                  'Review & approve timesheets',
                  'Holiday calendar management',
                  'CIS returns & payroll exports',
                  'Full audit trail',
                  'Variations & change order approval',
                  'Subcontractor compliance tracking',
                  'Cash flow forecasting',
                  'Dispute resolution timeline',
                  'Bulk invoice import',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-blue-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register/contractor"
                className="mt-8 block w-full rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              >
                Get Started Free
              </Link>
            </div>

            {/* Subcontractor Portal */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                🔧 Subcontractor Portal
              </div>
              <h3 className="mb-5 mt-4 text-xl font-bold text-white">Built for subbies</h3>
              <ul className="space-y-3">
                {[
                  'Submit Applications for Payment',
                  'Track invoice status in real time',
                  'View CIS & VAT breakdowns',
                  'Download payment certificates',
                  'Monthly earnings reports',
                  'Submit variations and change orders',
                  'View compliance document status',
                  'Raise formal disputes',
                  'CIS & VAT monthly returns',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-xl border border-emerald-500/30 py-3 text-center text-sm font-semibold text-emerald-300">
                Invite-only access
              </div>
            </div>

            {/* Employee Portal */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">
                👷 Employee Portal
              </div>
              <h3 className="mb-5 mt-4 text-xl font-bold text-white">Built for your team</h3>
              <ul className="space-y-3">
                {[
                  'Submit weekly timesheets',
                  'Request annual leave',
                  'View team holiday calendar',
                  'Track holiday allowance',
                  'Download personal reports',
                  'Team holiday calendar with conflict detection',
                  'Overtime tracking and alerts',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-purple-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-xl border border-purple-500/30 py-3 text-center text-sm font-semibold text-purple-300">
                Invite-only access
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-slate-400">
              No complex setup. No onboarding calls. Just sign up and go.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                icon: '🏢',
                title: 'Register your company',
                desc: 'Sign up free as a contractor. No credit card required. Your account is ready immediately.',
              },
              {
                step: '02',
                icon: '✉️',
                title: 'Invite your team',
                desc: 'Send invite links to subcontractors and employees. They set up their own accounts in minutes.',
              },
              {
                step: '03',
                icon: '✅',
                title: 'Start managing',
                desc: 'Invoices, timesheets and holidays — all tracked from day one. Everything in one place.',
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-3xl">
                  {icon}
                </div>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Add-ons & Integrations ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Add-ons &amp; Integrations
            </h2>
            <p className="mt-4 text-slate-400">
              Connect the tools you already use. Export anywhere.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              'QuickBooks',
              'Xero',
              'HMRC CIS',
              'PDF Export',
              'CSV Export',
              'Email Alerts',
              'PWA Mobile App',
            ].map((integration) => (
              <span
                key={integration}
                className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-white"
              >
                {integration}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-slate-900/40 p-12 text-center shadow-2xl shadow-blue-900/20">
          <div className="pointer-events-none absolute inset-0 rounded-3xl" aria-hidden>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/10 to-transparent" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to take control of your construction payments?
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Join contractors already using ClearClaim to save hours every week.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register/contractor"
              className="inline-block rounded-xl bg-blue-500 px-10 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-400"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="inline-block rounded-xl border border-white/20 px-10 py-4 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Logo & tagline */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="font-bold text-white">ClearClaim</span>
              </div>
              <span className="text-xs text-slate-500">Built for UK Construction</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/login" className="transition hover:text-white">Sign In</Link>
              <Link href="/register/contractor" className="transition hover:text-white">Register</Link>
              <a href="#features" className="transition hover:text-white">Features</a>
              <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
              <Link href="/terms" className="transition hover:text-white">Terms</Link>
              <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
            © 2026 ClearClaim. getclearclaim.co.uk &nbsp;·&nbsp;
            <Link href="/terms" className="hover:text-slate-400 transition">Terms of Service</Link>
            &nbsp;·&nbsp;
            <Link href="/privacy" className="hover:text-slate-400 transition">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
