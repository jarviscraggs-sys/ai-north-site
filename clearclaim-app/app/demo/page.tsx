import Link from 'next/link'

export const metadata = {
  title: 'Live Demo — ClearClaim',
  description:
    'See ClearClaim in action. A full walkthrough of the platform — from invoice submission to payment certificate.',
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-lg shadow-blue-500/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ClearClaim</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white sm:block">Pricing</Link>
            <Link href="/login" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white">Sign In</Link>
            <Link href="/register/contractor" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400">Register Free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center" aria-hidden>
          <div className="mt-10 h-[400px] w-[600px] rounded-full bg-blue-600/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
            <span>🎬</span>
            <span>Interactive Platform Tour</span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            See ClearClaim in action
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            A full walkthrough of the platform — from invoice submission to payment certificate.
          </p>
        </div>
      </section>

      {/* ── Feature Tour (CSS-only tabs via radio buttons) ── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/*
            CSS-only tab trick:
            Hidden radio inputs + labels as tabs.
            :checked ~ .tab-panels .tab-panel[id] selectors won't work cross-panel,
            so we use the sibling-based approach with has() or just nth-child ordering.
            We'll place radio inputs before the tab labels and panels and use
            general sibling combinator in a <style> block rendered inline via
            a custom CSS class pattern embedded in globals or a style tag.

            Since we cannot use JavaScript or dynamic styles in a server component,
            we embed a <style> tag inside the JSX (allowed in Next.js server components).
          */}

          <style>{`
            /* Hide all radio inputs */
            .demo-tabs input[type="radio"] { display: none; }

            /* Default: hide all panels */
            .demo-panel { display: none; }

            /* Tab label defaults */
            .demo-tab-label {
              cursor: pointer;
              padding: 0.625rem 1.25rem;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              font-weight: 500;
              color: rgba(255,255,255,0.55);
              border: 1px solid transparent;
              transition: all 0.15s;
              white-space: nowrap;
            }
            .demo-tab-label:hover {
              color: rgba(255,255,255,0.85);
              background: rgba(255,255,255,0.04);
            }

            /* Active tab styling — using :has() for clean server-side CSS */
            #tab-invoices:checked ~ .demo-tab-bar label[for="tab-invoices"],
            #tab-cis:checked ~ .demo-tab-bar label[for="tab-cis"],
            #tab-timesheets:checked ~ .demo-tab-bar label[for="tab-timesheets"],
            #tab-holidays:checked ~ .demo-tab-bar label[for="tab-holidays"],
            #tab-analytics:checked ~ .demo-tab-bar label[for="tab-analytics"] {
              color: #fff;
              background: rgba(59,130,246,0.15);
              border-color: rgba(59,130,246,0.4);
            }

            /* Show the right panel */
            #tab-invoices:checked ~ .demo-panels #panel-invoices,
            #tab-cis:checked ~ .demo-panels #panel-cis,
            #tab-timesheets:checked ~ .demo-panels #panel-timesheets,
            #tab-holidays:checked ~ .demo-panels #panel-holidays,
            #tab-analytics:checked ~ .demo-panels #panel-analytics {
              display: block;
            }
          `}</style>

          {/* The tabs container — radio inputs MUST come first */}
          <div className="demo-tabs">
            <input type="radio" name="demo-tab" id="tab-invoices" defaultChecked />
            <input type="radio" name="demo-tab" id="tab-cis" />
            <input type="radio" name="demo-tab" id="tab-timesheets" />
            <input type="radio" name="demo-tab" id="tab-holidays" />
            <input type="radio" name="demo-tab" id="tab-analytics" />

            {/* Tab bar */}
            <div className="demo-tab-bar mb-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <label className="demo-tab-label" htmlFor="tab-invoices">📄 Invoice Management</label>
              <label className="demo-tab-label" htmlFor="tab-cis">💷 CIS &amp; Payments</label>
              <label className="demo-tab-label" htmlFor="tab-timesheets">🕐 Timesheets</label>
              <label className="demo-tab-label" htmlFor="tab-holidays">📅 Holiday Calendar</label>
              <label className="demo-tab-label" htmlFor="tab-analytics">📊 Analytics</label>
            </div>

            {/* Panels */}
            <div className="demo-panels rounded-2xl border border-white/10 bg-[#0e1628] p-6 sm:p-8">

              {/* ── Panel 1: Invoice Management ── */}
              <div className="demo-panel" id="panel-invoices">
                <h2 className="mb-1 text-lg font-semibold text-white">Invoice Management</h2>
                <p className="mb-6 text-sm text-slate-400">Review, query, and approve subcontractor Applications for Payment.</p>

                {/* AI Warning */}
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <span className="mt-0.5 text-amber-400">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-amber-300">AI Duplicate Detected</p>
                    <p className="text-xs text-amber-400/80">This invoice is 94% similar to INV-0041 submitted on 12 Mar 2025. Review before approving.</p>
                  </div>
                </div>

                {/* Invoice card */}
                <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
                  {/* Header row */}
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Invoice</p>
                      <p className="text-xl font-bold text-white">INV-0058</p>
                      <p className="mt-1 text-sm text-slate-400">J. Hartley Groundworks Ltd</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total</p>
                      <p className="text-xl font-bold text-white">£12,500.00</p>
                      <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-medium text-amber-300">Pending Review</span>
                    </div>
                  </div>

                  {/* Job lines table */}
                  <div className="mb-5 overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03]">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Description</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Qty</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Rate</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5">
                          <td className="px-4 py-3 text-white">Excavation & groundworks — Block A</td>
                          <td className="px-4 py-3 text-right text-slate-300">40 hrs</td>
                          <td className="px-4 py-3 text-right text-slate-300">£175.00</td>
                          <td className="px-4 py-3 text-right font-medium text-white">£7,000.00</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="px-4 py-3 text-white">Concrete supply & pour</td>
                          <td className="px-4 py-3 text-right text-slate-300">1</td>
                          <td className="px-4 py-3 text-right text-slate-300">£3,500.00</td>
                          <td className="px-4 py-3 text-right font-medium text-white">£3,500.00</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-white">Plant hire — excavator (2 days)</td>
                          <td className="px-4 py-3 text-right text-slate-300">2</td>
                          <td className="px-4 py-3 text-right text-slate-300">£1,000.00</td>
                          <td className="px-4 py-3 text-right font-medium text-white">£2,000.00</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 bg-white/[0.03]">
                          <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-slate-300">Total</td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-white">£12,500.00</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 cursor-default">
                      ✓ Approve
                    </button>
                    <button className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-5 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25 cursor-default">
                      ? Query
                    </button>
                    <button className="rounded-lg bg-red-500/15 border border-red-500/30 px-5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/25 cursor-default">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Panel 2: CIS & Payments ── */}
              <div className="demo-panel" id="panel-cis">
                <h2 className="mb-1 text-lg font-semibold text-white">CIS &amp; Payment Certificate</h2>
                <p className="mb-6 text-sm text-slate-400">Automatic CIS deduction calculation and HMRC-compliant certificate generation.</p>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Breakdown card */}
                  <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
                    <p className="mb-4 text-sm font-semibold text-slate-300 uppercase tracking-wide">Payment Breakdown</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Gross Amount</span>
                        <span className="font-semibold text-white">£10,000.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">VAT (20%)</span>
                        <span className="font-semibold text-emerald-400">+ £2,000.00</span>
                      </div>
                      <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                        <span className="text-slate-400">CIS Deduction (20%)</span>
                        <span className="font-semibold text-red-400">− £2,000.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Retention (5%)</span>
                        <span className="font-semibold text-amber-400">− £500.00</span>
                      </div>
                      <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                        <span className="text-base font-bold text-white">Net Payment</span>
                        <span className="text-lg font-extrabold text-blue-400">£9,500.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate card */}
                  <div className="rounded-xl border border-white/10 bg-[#111827] p-5 flex flex-col">
                    <p className="mb-4 text-sm font-semibold text-slate-300 uppercase tracking-wide">Payment Certificate</p>
                    <div className="flex-1 rounded-lg border border-white/10 bg-[#0e1628] p-4 mb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">CIS Payment Certificate</p>
                          <p className="text-xs text-slate-400">Certificate #PC-2025-0058</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <p>Contractor: Dayne Construction Ltd</p>
                        <p>Subcontractor: J. Hartley Groundworks</p>
                        <p>UTR: 1234567890</p>
                        <p>Period: March 2025</p>
                        <p className="text-emerald-400 font-medium">✓ HMRC Compliant</p>
                      </div>
                    </div>
                    <button className="w-full rounded-lg bg-blue-500/20 border border-blue-500/40 px-4 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-500/30 cursor-default">
                      ↓ Download Certificate PDF
                    </button>
                  </div>
                </div>

                {/* CIS rate badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Verified: 20% rate applied</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">✓ UTR Verified</span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">Auto-calculated</span>
                </div>
              </div>

              {/* ── Panel 3: Timesheets ── */}
              <div className="demo-panel" id="panel-timesheets">
                <h2 className="mb-1 text-lg font-semibold text-white">Timesheets</h2>
                <p className="mb-6 text-sm text-slate-400">Weekly timesheet submission and approval for direct employees.</p>

                <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
                  {/* Employee header */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">Sam Wilkinson</p>
                      <p className="text-sm text-slate-400">Site Labourer · Week of 31 Mar – 6 Apr 2025</p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">Pending Approval</span>
                  </div>

                  {/* Timesheet grid */}
                  <div className="mb-5 overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03]">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <th key={d} className="px-3 py-2.5 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[8, 8.5, 9, 8, 7.5, 4, 0].map((h, i) => (
                            <td key={i} className="px-3 py-3 text-center">
                              {h > 0 ? (
                                <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${h > 8 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>
                                  {h}h
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary row */}
                  <div className="mb-5 flex flex-wrap gap-4">
                    <div className="rounded-lg border border-white/10 bg-[#0e1628] px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Total Hours</p>
                      <p className="text-lg font-bold text-white">45h</p>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                      <p className="text-xs text-amber-400 mb-1">⚠ Overtime</p>
                      <p className="text-lg font-bold text-amber-300">5h</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0e1628] px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Standard Week</p>
                      <p className="text-lg font-bold text-white">40h</p>
                    </div>
                  </div>

                  {/* Approve button */}
                  <button className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-6 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 cursor-default">
                    ✓ Approve Timesheet
                  </button>
                </div>
              </div>

              {/* ── Panel 4: Holiday Calendar ── */}
              <div className="demo-panel" id="panel-holidays">
                <h2 className="mb-1 text-lg font-semibold text-white">Holiday Calendar</h2>
                <p className="mb-6 text-sm text-slate-400">Team holiday requests, approvals, and capacity management.</p>

                {/* Capacity warning */}
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <span className="mt-0.5 text-red-400">🚨</span>
                  <div>
                    <p className="text-sm font-medium text-red-300">Capacity Warning — Wed 23 Apr</p>
                    <p className="text-xs text-red-400/80">4 of 5 team members are off. Consider rejecting or rescheduling a request.</p>
                  </div>
                </div>

                {/* Calendar mock */}
                <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-white">April 2025</h3>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400"></span>Approved</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400"></span>Pending</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400"></span>Over capacity</span>
                    </div>
                  </div>

                  {/* Day header */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                      <div key={d} className="py-1 text-center text-xs font-medium text-slate-500">{d}</div>
                    ))}
                  </div>

                  {/* Calendar days — April 2025 starts on Tuesday */}
                  <div className="grid grid-cols-7 gap-y-1">
                    {/* Empty cells for Mon (offset 1 — April starts Tue) */}
                    <div></div>
                    {/* Days 1–30 */}
                    {Array.from({ length: 30 }, (_, i) => {
                      const day = i + 1
                      // Define holiday dots: format [day, color]
                      const holidays: Record<number, string[]> = {
                        3: ['bg-emerald-400'],
                        4: ['bg-emerald-400', 'bg-emerald-400'],
                        7: ['bg-amber-400'],
                        10: ['bg-emerald-400'],
                        14: ['bg-emerald-400', 'bg-amber-400'],
                        17: ['bg-amber-400'],
                        21: ['bg-emerald-400'],
                        22: ['bg-emerald-400', 'bg-emerald-400', 'bg-amber-400'],
                        23: ['bg-red-400', 'bg-red-400', 'bg-red-400', 'bg-red-400'],
                        28: ['bg-emerald-400'],
                      }
                      const dots = holidays[day] ?? []
                      const isWarning = day === 23

                      return (
                        <div
                          key={day}
                          className={`rounded-lg p-1.5 text-center ${isWarning ? 'bg-red-500/15 border border-red-500/30' : 'border border-transparent hover:bg-white/5'}`}
                        >
                          <span className={`block text-xs ${isWarning ? 'font-bold text-red-300' : 'text-slate-400'}`}>{day}</span>
                          {dots.length > 0 && (
                            <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                              {dots.map((c, di) => (
                                <span key={di} className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Fill remaining cells */}
                    {Array.from({ length: 7 - ((30 + 1) % 7) }, (_, i) => (
                      <div key={`e${i}`} />
                    ))}
                  </div>
                </div>

                {/* Legend / pending requests */}
                <div className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-300">Pending Requests</p>
                  <div className="space-y-2">
                    {[
                      { name: 'Tom Garrett', dates: '7–11 Apr', status: 'pending' },
                      { name: 'Priya Singh', dates: '22–24 Apr', status: 'warning' },
                    ].map(r => (
                      <div key={r.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-white">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.dates}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === 'warning' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {r.status === 'warning' ? '⚠ Over capacity' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Panel 5: Analytics Dashboard ── */}
              <div className="demo-panel" id="panel-analytics">
                <h2 className="mb-1 text-lg font-semibold text-white">Analytics Dashboard</h2>
                <p className="mb-6 text-sm text-slate-400">Live overview of your business — invoices, CIS, retention, and cash flow.</p>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
                  {[
                    { label: 'Total Invoiced', value: '£284,500', sub: 'This quarter', color: 'text-white', accent: 'border-blue-500/20 bg-blue-500/5' },
                    { label: 'Pending Review', value: '7', sub: '£42,000 value', color: 'text-amber-300', accent: 'border-amber-500/20 bg-amber-500/5' },
                    { label: 'Retention Held', value: '£18,200', sub: 'Across 6 projects', color: 'text-purple-300', accent: 'border-purple-500/20 bg-purple-500/5' },
                    { label: 'Pending Timesheets', value: '12', sub: '3 employees', color: 'text-emerald-300', accent: 'border-emerald-500/20 bg-emerald-500/5' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.accent}`}>
                      <p className="text-xs font-medium text-slate-400 mb-2">{c.label}</p>
                      <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Cash flow forecast bars (pure CSS) */}
                <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
                  <p className="mb-4 text-sm font-semibold text-slate-300">Cash Flow Forecast — Next 6 Weeks</p>
                  <div className="flex items-end gap-2 h-28">
                    {[
                      { week: 'W1', pct: 65, amount: '£32k' },
                      { week: 'W2', pct: 85, amount: '£42k' },
                      { week: 'W3', pct: 45, amount: '£22k' },
                      { week: 'W4', pct: 95, amount: '£47k' },
                      { week: 'W5', pct: 55, amount: '£27k' },
                      { week: 'W6', pct: 75, amount: '£37k' },
                    ].map(b => (
                      <div key={b.week} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs text-slate-400">{b.amount}</span>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400"
                          style={{ height: `${b.pct}%` }}
                        />
                        <span className="text-xs text-slate-500">{b.week}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CIS summary */}
                <div className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-300">CIS Liability — April 2025</p>
                    <button className="rounded-lg border border-blue-500/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300 cursor-default">
                      Export Return
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Gross Payments', value: '£68,000' },
                      { label: 'CIS Deducted', value: '£13,600' },
                      { label: 'Subs Paid', value: '£54,400' },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                        <p className="font-bold text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>{/* end demo-panels */}
          </div>{/* end demo-tabs */}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="pointer-events-none mb-6 flex justify-center" aria-hidden>
            <div className="h-[200px] w-[400px] rounded-full bg-blue-600/15 blur-[80px]" />
          </div>
          <h2 className="mb-3 -mt-16 text-3xl font-extrabold text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-slate-400">
            Join UK contractors already using ClearClaim to manage invoices, CIS, and their teams — all in one place.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register/contractor"
              className="w-full rounded-xl bg-blue-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-400 sm:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:w-auto"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </div>
  )
}
