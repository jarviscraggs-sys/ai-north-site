import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import ClickableInvoiceRow from '@/components/ClickableInvoiceRow';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleString('en-GB', { month: 'short' });
}

export default async function ContractorDashboard() {
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();

  const cid = Number(user.id);

  // Get this contractor's linked subcontractor IDs safely
  let linkedSubIds: number[] = [];
  try {
    linkedSubIds = (db.prepare(`SELECT subcontractor_id FROM subcontractor_contractors WHERE contractor_id = ?`).all(cid) as any[]).map((r: any) => Number(r.subcontractor_id));
  } catch(e) { linkedSubIds = []; }
  const hasLinkedSubs = linkedSubIds.length > 0;
  // Use placeholder string safe for SQLite IN clause
  const subPlaceholders = hasLinkedSubs ? linkedSubIds.map(() => '?').join(',') : '0';

  // 1. Key financial totals — scoped to this contractor's linked subcontractors
  const totals = hasLinkedSubs ? db.prepare(`
    SELECT 
      COALESCE(SUM(i.amount), 0) as total_invoiced,
      COALESCE(SUM(CASE WHEN i.status='approved' THEN i.amount ELSE 0 END), 0) as total_approved,
      COALESCE(SUM(CASE WHEN i.status='pending' THEN i.amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN i.status='queried' THEN i.amount ELSE 0 END), 0) as total_queried,
      COALESCE(SUM(i.cis_amount), 0) as total_cis,
      COALESCE(SUM(i.retention_amount - i.retention_released), 0) as total_retention,
      COUNT(*) as invoice_count,
      SUM(CASE WHEN i.status='pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN i.status='approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN i.status='queried' THEN 1 ELSE 0 END) as queried_count,
      SUM(CASE WHEN i.status='rejected' THEN 1 ELSE 0 END) as rejected_count
    FROM invoices i
    WHERE i.subcontractor_id IN (${subPlaceholders})
  `).get(...linkedSubIds) as any : { total_invoiced: 0, total_approved: 0, total_pending: 0, total_queried: 0, total_cis: 0, total_retention: 0, invoice_count: 0, pending_count: 0, approved_count: 0, queried_count: 0, rejected_count: 0 };

  // 2. This month's stats
  const monthStats = hasLinkedSubs ? db.prepare(`
    SELECT 
      COALESCE(SUM(i.amount), 0) as month_invoiced,
      COALESCE(SUM(CASE WHEN i.status='approved' THEN i.amount ELSE 0 END), 0) as month_approved,
      COUNT(*) as month_count
    FROM invoices i
    WHERE i.subcontractor_id IN (${subPlaceholders})
    AND strftime('%Y-%m', i.submitted_at) = strftime('%Y-%m', 'now')
  `).get(...linkedSubIds) as any : { month_invoiced: 0, month_approved: 0, month_count: 0 };

  // 3. Monthly trend (last 6 months)
  const monthlyTrend = hasLinkedSubs ? db.prepare(`
    SELECT strftime('%Y-%m', i.submitted_at) as month,
      COUNT(*) as count,
      SUM(i.amount) as total,
      SUM(CASE WHEN i.status='approved' THEN i.amount ELSE 0 END) as approved
    FROM invoices i
    WHERE i.subcontractor_id IN (${subPlaceholders})
    AND i.submitted_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all(...linkedSubIds) : [] as any[];

  // 4. Top subcontractors by value
  const topSubs = hasLinkedSubs ? db.prepare(`
    SELECT u.name, u.company, COUNT(*) as invoice_count,
      SUM(i.amount) as total_value,
      SUM(CASE WHEN i.status='approved' THEN i.amount ELSE 0 END) as approved_value
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.subcontractor_id IN (${subPlaceholders})
    GROUP BY u.id ORDER BY total_value DESC LIMIT 5
  `).all(...linkedSubIds) : [] as any[];

  // 5. AI flags count this month
  const aiFlags = hasLinkedSubs ? db.prepare(`
    SELECT COUNT(DISTINCT af.invoice_id) as flagged
    FROM ai_flags af
    JOIN invoices i ON i.id = af.invoice_id
    WHERE i.subcontractor_id IN (${subPlaceholders})
    AND af.created_at >= date('now', '-30 days')
  `).get(...linkedSubIds) as any : { flagged: 0 };

  // 6. Employee stats — scoped to this contractor
  const empStats = db.prepare(`
    SELECT COUNT(*) as total_employees,
      (SELECT COUNT(*) FROM timesheets WHERE status='pending' AND contractor_id = $cid) as pending_timesheets,
      (SELECT COUNT(*) FROM holiday_requests WHERE status='pending' AND contractor_id = $cid) as pending_holidays
    FROM employees WHERE status='active' AND contractor_id = $cid
  `).get({ cid }) as any;

  // 7. Compliance alerts
  const compliance = db.prepare(`
    SELECT COUNT(*) as expiring_compliance
    FROM subcontractor_compliance
    WHERE contractor_id = ? AND status IN ('expiring_soon', 'expired')
  `).get(cid) as any;

  // 8. Projects summary
  const projects = db.prepare(`
    SELECT COUNT(*) as total_projects,
      COALESCE(SUM(contract_value), 0) as total_contract_value
    FROM projects WHERE contractor_id = ? AND status='active'
  `).get(cid) as any;

  // 9. Outstanding payments (approved, unpaid)
  const outstanding = hasLinkedSubs ? db.prepare(`
    SELECT COALESCE(SUM(i.amount - i.cis_amount - i.retention_amount), 0) as outstanding_net
    FROM invoices i
    WHERE i.subcontractor_id IN (${subPlaceholders})
    AND i.status='approved' AND COALESCE(i.paid, 0) = 0
  `).get(...linkedSubIds) as any : { outstanding_net: 0 };

  // 10. Unread notifications
  const notifications = db.prepare(`
    SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read = 0
  `).get(user.id) as any;

  // 11. Recent invoices
  const recentInvoices = hasLinkedSubs ? db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company,
    (SELECT COUNT(*) FROM ai_flags WHERE invoice_id = i.id) as flag_count,
    (SELECT MAX(confidence_score) FROM ai_flags WHERE invoice_id = i.id) as max_flag_score
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.subcontractor_id IN (${subPlaceholders})
    ORDER BY i.submitted_at DESC LIMIT 8
  `).all(...linkedSubIds) : [] as any[];

  // Computed values
  const now = new Date();
  const hour = now.getHours();
  const greetText = greeting(hour);
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const unread = notifications?.unread ?? 0;

  const totalInvoiced = totals.total_invoiced ?? 0;
  const totalApproved = totals.total_approved ?? 0;
  const totalCis = totals.total_cis ?? 0;
  const totalRetention = totals.total_retention ?? 0;
  const pendingCount = totals.pending_count ?? 0;
  const totalPending = totals.total_pending ?? 0;
  const outstandingNet = outstanding?.outstanding_net ?? 0;
  const invoiceCount = totals.invoice_count ?? 0;
  const approvedCount = totals.approved_count ?? 0;
  const queriedCount = totals.queried_count ?? 0;
  const rejectedCount = totals.rejected_count ?? 0;

  // Donut chart computation
  const statusTotal = invoiceCount || 1;
  const approvedPct = pct(approvedCount, statusTotal);
  const pendingPct = pct(pendingCount, statusTotal);
  const queriedPct = pct(queriedCount, statusTotal);
  const rejectedPct = pct(rejectedCount, statusTotal);
  // Build conic-gradient
  const hasData = invoiceCount > 0;
  let conicStr = '';
  if (hasData) {
    let pos = 0;
    const segments: { color: string; val: number }[] = [
      { color: '#22c55e', val: approvedPct },
      { color: '#f59e0b', val: pendingPct },
      { color: '#f97316', val: queriedPct },
      { color: '#ef4444', val: rejectedPct },
    ];
    const parts: string[] = [];
    for (const seg of segments) {
      if (seg.val === 0) continue;
      parts.push(`${seg.color} ${pos}% ${pos + seg.val}%`);
      pos += seg.val;
    }
    if (pos < 100) parts.push(`#1e293b ${pos}% 100%`);
    conicStr = `conic-gradient(${parts.join(', ')})`;
  }

  // Monthly bar chart
  const maxMonthTotal = Math.max(...monthlyTrend.map((m: any) => m.total ?? 0), 1);
  const BAR_HEIGHT = 160;

  // Financial breakdown
  const netPaid = Math.max(0, totalApproved - totalCis - totalRetention);
  const totalApprovedSafe = totalApproved || 1;
  const netPct = pct(netPaid, totalApprovedSafe);
  const cisPct = pct(totalCis, totalApprovedSafe);
  const retPct = pct(totalRetention, totalApprovedSafe);

  // Top subs bar max
  const maxSubVal = Math.max(...topSubs.map((s: any) => s.total_value ?? 0), 1);

  return (
    <div className="p-6 max-w-screen-2xl space-y-6">

      {/* ── Row 1: Greeting ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{greetText}, {user.name?.split(' ')[0] ?? user.name} 👋</h1>
          <p className="text-blue-400 text-sm mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          {monthStats.month_count > 0 && (
            <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              {monthStats.month_count} invoice{monthStats.month_count !== 1 ? 's' : ''} this month
            </span>
          )}
          {unread > 0 && (
            <Link href="/notifications" className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full px-3 py-1 text-sm font-medium hover:bg-amber-500/25 transition">
              🔔 {unread} alert{unread !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 2: 4 KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">💷</span>
            <span className="text-xs text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">{invoiceCount} total</span>
          </div>
          <Link href="/contractor/vat-report" className="inline-block text-3xl font-bold text-blue-400 mb-1 hover:text-blue-300 transition">
            {fmt(totalInvoiced)}
          </Link>
          <div className="text-sm text-blue-300/60">Total Invoiced (all time)</div>
          {monthStats.month_invoiced > 0 && (
            <div className="text-xs text-blue-400 mt-2">
              {fmt(monthStats.month_invoiced)} this month
            </div>
          )}
        </div>

        {/* Total Approved */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">✅</span>
            <span className="text-xs text-green-400 bg-green-500/10 rounded-full px-2 py-0.5">{approvedCount} approved</span>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-1">{fmt(totalApproved)}</div>
          <div className="text-sm text-blue-300/60">Total Approved (all time)</div>
          {totalInvoiced > 0 && (
            <div className="text-xs text-green-400/70 mt-2">
              {pct(totalApproved, totalInvoiced)}% approval rate
            </div>
          )}
        </div>

        {/* Pending Review */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">⏳</span>
            <span className="text-xs text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">{pendingCount} invoice{pendingCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-1">{fmt(totalPending)}</div>
          <div className="text-sm text-blue-300/60">Pending Review</div>
          {queriedCount > 0 && (
            <div className="text-xs text-orange-400/70 mt-2">
              + {queriedCount} queried
            </div>
          )}
        </div>

        {/* Outstanding Payment */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">💜</span>
            <span className="text-xs text-purple-400 bg-purple-500/10 rounded-full px-2 py-0.5">unpaid</span>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-1">{fmt(outstandingNet)}</div>
          <div className="text-sm text-blue-300/60">Outstanding Payment</div>
          <div className="text-xs text-purple-400/60 mt-2">net of CIS &amp; retention</div>
        </div>
      </div>

      {/* ── Row 3: Charts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-6">📊 Monthly Invoice Volume</h2>
          {monthlyTrend.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-blue-400/40 text-sm">No data yet</div>
          ) : (
            <div className="flex items-end justify-around gap-2" style={{ height: `${BAR_HEIGHT + 40}px` }}>
              {monthlyTrend.map((m: any) => {
                const total = m.total ?? 0;
                const approved = m.approved ?? 0;
                const totalH = Math.round((total / maxMonthTotal) * BAR_HEIGHT);
                const approvedH = Math.round((approved / maxMonthTotal) * BAR_HEIGHT);
                return (
                  <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                    <div className="relative w-full flex items-end justify-center" style={{ height: `${BAR_HEIGHT}px` }}>
                      {/* Total bar (background) */}
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-white/10"
                        style={{ height: `${totalH}px` }}
                        title={`${monthLabel(m.month)}: ${fmt(total)} submitted`}
                      />
                      {/* Approved bar (overlay) */}
                      <div
                        className="absolute bottom-0 rounded-t-md bg-blue-500/70"
                        style={{ height: `${approvedH}px`, width: '60%' }}
                        title={`${monthLabel(m.month)}: ${fmt(approved)} approved`}
                      />
                    </div>
                    <span className="text-xs text-blue-400/60 mt-1">{monthLabel(m.month)}</span>
                    <span className="text-xs text-blue-300/50">{m.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-white/15" />
              <span className="text-xs text-blue-400/60">Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/70" />
              <span className="text-xs text-blue-400/60">Approved</span>
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-6">🍩 Invoice Status Split</h2>
          {!hasData ? (
            <div className="h-40 flex items-center justify-center text-blue-400/40 text-sm">No invoices yet</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut */}
              <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
                <div
                  className="rounded-full"
                  style={{
                    width: 160,
                    height: 160,
                    background: conicStr || '#1e293b',
                  }}
                />
                {/* Hole */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#0f172a]"
                  style={{ margin: 28 }}
                >
                  <span className="text-2xl font-bold text-white">{invoiceCount}</span>
                  <span className="text-xs text-blue-400/60">invoices</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 flex-1">
                {[
                  { label: 'Approved', color: '#22c55e', count: approvedCount, p: approvedPct },
                  { label: 'Pending', color: '#f59e0b', count: pendingCount, p: pendingPct },
                  { label: 'Queried', color: '#f97316', count: queriedCount, p: queriedPct },
                  { label: 'Rejected', color: '#ef4444', count: rejectedCount, p: rejectedPct },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-sm text-blue-300/80 flex-1">{s.label}</span>
                    <span className="text-sm font-medium text-white">{s.count}</span>
                    <span className="text-xs text-blue-400/50 w-8 text-right">{s.p}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Financial Breakdown + Top Subcontractors ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Financial Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-6">💰 Financial Breakdown</h2>
          {totalApproved === 0 ? (
            <div className="h-24 flex items-center justify-center text-blue-400/40 text-sm">No approved invoices</div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-blue-400/60 mb-1">
                  <span>Gross Approved</span>
                  <span className="text-white font-medium">{fmt(totalApproved)}</span>
                </div>
                {/* Stacked bar */}
                <div className="w-full h-8 rounded-lg overflow-hidden flex">
                  {netPct > 0 && (
                    <div
                      className="h-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                      style={{ width: `${netPct}%` }}
                      title={`Net: ${fmt(netPaid)}`}
                    >
                      {netPct >= 15 ? 'Net' : ''}
                    </div>
                  )}
                  {cisPct > 0 && (
                    <div
                      className="h-full bg-red-500/80 flex items-center justify-center text-xs text-white font-medium transition-all"
                      style={{ width: `${cisPct}%` }}
                      title={`CIS: ${fmt(totalCis)}`}
                    >
                      {cisPct >= 10 ? 'CIS' : ''}
                    </div>
                  )}
                  {retPct > 0 && (
                    <div
                      className="h-full bg-amber-500/80 flex items-center justify-center text-xs text-white font-medium transition-all"
                      style={{ width: `${retPct}%` }}
                      title={`Ret: ${fmt(totalRetention)}`}
                    >
                      {retPct >= 10 ? 'Ret' : ''}
                    </div>
                  )}
                  {/* Remaining gap */}
                  {(netPct + cisPct + retPct) < 100 && (
                    <div className="h-full bg-white/5 flex-1" />
                  )}
                </div>
              </div>

              {/* Segment labels */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="text-xs text-blue-400/60 mb-1">Net Paid</div>
                  <div className="text-sm font-bold text-blue-400">{fmt(netPaid)}</div>
                  <div className="text-xs text-blue-400/40">{netPct}%</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <div className="text-xs text-red-400/60 mb-1">CIS Deducted</div>
                  <div className="text-sm font-bold text-red-400">{fmt(totalCis)}</div>
                  <div className="text-xs text-red-400/40">{cisPct}%</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="text-xs text-amber-400/60 mb-1">Retention Held</div>
                  <div className="text-sm font-bold text-amber-400">{fmt(totalRetention)}</div>
                  <div className="text-xs text-amber-400/40">{retPct}%</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Top Subcontractors */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">👷 Top Subcontractors</h2>
            <Link href="/contractor/subcontractors" className="text-xs text-blue-400 hover:text-blue-300 transition">
              View all →
            </Link>
          </div>
          {topSubs.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-blue-400/40 text-sm">No data yet</div>
          ) : (
            <div className="space-y-4">
              {topSubs.map((sub: any, i: number) => {
                const barPct = Math.round((sub.total_value / maxSubVal) * 100);
                return (
                  <Link key={i} href="/contractor/subcontractors" className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white group-hover:text-blue-300 transition truncate max-w-[60%]">
                        {sub.company || sub.name}
                      </span>
                      <span className="text-sm font-medium text-blue-300">{fmt(sub.total_value)}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        }}
                      />
                    </div>
                    <div className="text-xs text-blue-400/40 mt-0.5">{sub.invoice_count} invoice{sub.invoice_count !== 1 ? 's' : ''}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Quick Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <Link href="/contractor/timesheets" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition group">
          <div className="text-2xl mb-3">⏱️</div>
          <div className="text-2xl font-bold text-white group-hover:text-blue-300 transition">
            {empStats?.pending_timesheets ?? 0}
          </div>
          <div className="text-sm text-blue-300/60 mt-1">Pending Timesheets</div>
          {(empStats?.pending_holidays ?? 0) > 0 && (
            <div className="text-xs text-amber-400/70 mt-1">{empStats.pending_holidays} holiday req.</div>
          )}
        </Link>

        <Link href="/contractor/compliance" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition group">
          <div className="text-2xl mb-3">🛡️</div>
          <div className={`text-2xl font-bold transition ${(compliance?.expiring_compliance ?? 0) > 0 ? 'text-red-400' : 'text-white'} group-hover:text-blue-300`}>
            {compliance?.expiring_compliance ?? 0}
          </div>
          <div className="text-sm text-blue-300/60 mt-1">Compliance Alerts</div>
          <div className="text-xs text-blue-400/40 mt-1">expiring / expired docs</div>
        </Link>

        <Link href="/contractor/invoices" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition group">
          <div className="text-2xl mb-3">⚠️</div>
          <div className={`text-2xl font-bold transition ${(aiFlags?.flagged ?? 0) > 0 ? 'text-amber-400' : 'text-white'} group-hover:text-blue-300`}>
            {aiFlags?.flagged ?? 0}
          </div>
          <div className="text-sm text-blue-300/60 mt-1">AI Flags This Month</div>
          <div className="text-xs text-blue-400/40 mt-1">invoices with anomalies</div>
        </Link>

        <Link href="/contractor/projects" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition group">
          <div className="text-2xl mb-3">🏗️</div>
          <div className="text-2xl font-bold text-white group-hover:text-blue-300 transition">
            {projects?.total_projects ?? 0}
          </div>
          <div className="text-sm text-blue-300/60 mt-1">Active Projects</div>
          {(projects?.total_contract_value ?? 0) > 0 && (
            <div className="text-xs text-blue-400/50 mt-1">{fmt(projects.total_contract_value)} contract value</div>
          )}
        </Link>
      </div>

      {/* ── Row 6: Recent Invoices ──────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Recent Invoices</h2>
          <Link href="/contractor/invoices" className="text-blue-400 hover:text-blue-300 text-sm transition">View all →</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-blue-400/40 text-sm">No invoices submitted yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-blue-400 font-medium px-6 py-3 uppercase tracking-wide">Invoice</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3 uppercase tracking-wide">Subcontractor</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3 uppercase tracking-wide">Amount</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3 uppercase tracking-wide">Status</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3 uppercase tracking-wide">AI</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3 uppercase tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv: any) => (
                  <ClickableInvoiceRow key={inv.id} inv={inv} href={`/contractor/invoice/${inv.id}`} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
