import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: 'Pending',  color: 'text-amber-300',  bg: 'bg-amber-500/20 border-amber-500/30',  dot: 'bg-amber-400'  },
  approved: { label: 'Approved', color: 'text-green-300',  bg: 'bg-green-500/20 border-green-500/30',  dot: 'bg-green-400'  },
  rejected: { label: 'Rejected', color: 'text-red-300',    bg: 'bg-red-500/20 border-red-500/30',      dot: 'bg-red-400'    },
  queried:  { label: 'Queried',  color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/30',dot: 'bg-orange-400' },
};

function fmt(n: number | null | undefined) {
  return `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default async function SubcontractorDashboard() {
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();
  const userId = parseInt(user.id);

  const totalGross = (db.prepare(
    `SELECT SUM(amount) as v FROM invoices WHERE subcontractor_id = ?`
  ).get(userId) as any)?.v ?? 0;

  const totalApproved = (db.prepare(
    `SELECT SUM(amount) as v FROM invoices WHERE subcontractor_id = ? AND status='approved'`
  ).get(userId) as any)?.v ?? 0;

  const totalPendingCount = (db.prepare(
    `SELECT COUNT(*) as v FROM invoices WHERE subcontractor_id = ? AND status='pending'`
  ).get(userId) as any)?.v ?? 0;

  const totalRetentionHeld = (db.prepare(
    `SELECT SUM(retention_amount - retention_released) as v FROM invoices WHERE subcontractor_id = ? AND status='approved'`
  ).get(userId) as any)?.v ?? 0;

  const finRow = (db.prepare(`
    SELECT
      SUM(amount) as gross,
      SUM(CASE WHEN status='approved' THEN cis_amount ELSE 0 END) as cis,
      SUM(CASE WHEN status='approved' THEN vat_amount ELSE 0 END) as vat,
      SUM(CASE WHEN status='approved' THEN retention_amount - retention_released ELSE 0 END) as retention,
      SUM(CASE WHEN status='approved' THEN amount + vat_amount - cis_amount - retention_amount ELSE 0 END) as net
    FROM invoices WHERE subcontractor_id = ?
  `).get(userId) as any) ?? {};

  const monthlyRows = db.prepare(`
    SELECT strftime('%Y-%m', submitted_at) as month,
           SUM(amount) as gross,
           SUM(CASE WHEN status='approved' THEN amount ELSE 0 END) as approved
    FROM invoices
    WHERE subcontractor_id = ? AND submitted_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all(userId) as { month: string; gross: number; approved: number }[];

  const maxMonthly = Math.max(...monthlyRows.map(r => r.gross), 1);

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as cnt FROM invoices WHERE subcontractor_id = ? GROUP BY status
  `).all(userId) as { status: string; cnt: number }[];

  const statusMap: Record<string, number> = {};
  statusCounts.forEach(r => { statusMap[r.status] = r.cnt; });
  const totalInvoices = Object.values(statusMap).reduce((a, b) => a + b, 0);

  const approvedCnt  = statusMap['approved']  ?? 0;
  const pendingCnt   = statusMap['pending']   ?? 0;
  const queriedCnt   = statusMap['queried']   ?? 0;
  const rejectedCnt  = statusMap['rejected']  ?? 0;

  const approvedPct  = pct(approvedCnt, totalInvoices);
  const pendingPct   = pct(pendingCnt, totalInvoices);
  const queriedPct   = pct(queriedCnt, totalInvoices);

  const p1 = approvedPct;
  const p2 = p1 + pendingPct;
  const p3 = p2 + queriedPct;

  const donutGradient = `conic-gradient(#22c55e 0% ${p1}%, #f59e0b ${p1}% ${p2}%, #f97316 ${p2}% ${p3}%, #ef4444 ${p3}% 100%)`;

  const latestApproved = db.prepare(`
    SELECT * FROM invoices WHERE subcontractor_id = ? AND status='approved'
    ORDER BY submitted_at DESC LIMIT 1
  `).get(userId) as any;

  const queriedInvoices = db.prepare(
    `SELECT id, invoice_number FROM invoices WHERE subcontractor_id = ? AND status='queried'`
  ).all(userId) as any[];

  const retentionDue = db.prepare(`
    SELECT id, invoice_number FROM invoices
    WHERE subcontractor_id = ? AND retention_release_date IS NOT NULL
      AND retention_release_date < date('now')
      AND retention_released < retention_amount
  `).all(userId) as any[];

  const lastInvoice = db.prepare(
    `SELECT submitted_at FROM invoices WHERE subcontractor_id = ? ORDER BY submitted_at DESC LIMIT 1`
  ).get(userId) as any;

  const daysSinceLastInvoice = lastInvoice
    ? Math.floor((Date.now() - new Date(lastInvoice.submitted_at).getTime()) / 86400000)
    : 999;

  const recentInvoices = db.prepare(`
    SELECT i.*,
      (SELECT COUNT(*) FROM invoice_lines WHERE invoice_id = i.id) as line_count
    FROM invoices i WHERE i.subcontractor_id = ?
    ORDER BY i.submitted_at DESC LIMIT 5
  `).all(userId) as any[];

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
  };

  let wfGross = 0, wfVat = 0, wfCis = 0, wfRetention = 0, wfNet = 0;
  if (latestApproved) {
    const total = latestApproved.amount + latestApproved.vat_amount;
    wfGross     = Math.round((latestApproved.amount / total) * 100);
    wfVat       = Math.round((latestApproved.vat_amount / total) * 100);
    wfCis       = Math.round((latestApproved.cis_amount / total) * 100);
    wfRetention = Math.round(((latestApproved.retention_amount - latestApproved.retention_released) / total) * 100);
    wfNet       = Math.max(0, 100 - wfCis - wfRetention);
  }

  const alerts: { type: 'warning' | 'info' | 'danger'; message: string; href?: string }[] = [];
  queriedInvoices.forEach(inv => {
    alerts.push({ type: 'warning', message: `Invoice ${inv.invoice_number} has been queried — action needed`, href: `/subcontractor/invoice/${inv.id}/edit` });
  });
  retentionDue.forEach(inv => {
    alerts.push({ type: 'info', message: `Retention from Invoice ${inv.invoice_number} is due for release`, href: `/subcontractor/invoice/${inv.id}` });
  });
  if (daysSinceLastInvoice >= 30) {
    alerts.push({ type: 'info', message: `You haven't submitted an invoice in ${daysSinceLastInvoice} days` });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-blue-300 mt-1">{user.company || user.name}</p>
        </div>
        <Link href="/subcontractor/submit"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/20">
          + Submit Invoice
        </Link>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-8">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              a.type === 'warning' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
              a.type === 'danger'  ? 'bg-red-500/15 border-red-500/40 text-red-300' :
                                     'bg-blue-500/15 border-blue-500/40 text-blue-300'
            }`}>
              <span>{a.type === 'warning' ? '⚠️' : a.type === 'danger' ? '🚨' : 'ℹ️'}</span>
              {a.href ? (
                <Link href={a.href} className="underline underline-offset-2 hover:text-white transition">{a.message}</Link>
              ) : (
                <span>{a.message}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Gross Submitted" value={fmt(totalGross)} color="blue" />
        <SummaryCard label="Total Approved" value={fmt(totalApproved)} color="green" />
        <SummaryCard label="Pending Invoices" value={String(totalPendingCount)} color="amber" suffix="invoices" />
        <SummaryCard label="Retention Held" value={fmt(totalRetentionHeld)} color="purple" />
      </div>

      {/* Financial Summary + Donut */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Financial summary */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4 text-lg">Financial Summary</h2>
          <div className="space-y-3">
            <FinRow label="Gross Invoiced" value={fmt(finRow.gross)} />
            <FinRow label="Total CIS Deducted" value={fmt(finRow.cis)} negative />
            <FinRow label="Total VAT (on approved)" value={fmt(finRow.vat)} positive />
            <FinRow label="Total Retention Held" value={fmt(finRow.retention)} negative />
            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">Total Net Received</span>
                <span className="font-bold text-green-400 text-lg">{fmt(finRow.net)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Donut */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4 text-lg">Invoice Status</h2>
          {totalInvoices > 0 ? (
            <>
              <div className="flex justify-center mb-5">
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  background: donutGradient,
                  boxShadow: 'inset 0 0 0 36px #0d1a2e',
                }} />
              </div>
              <div className="space-y-2">
                <DonutLegend color="#22c55e" label="Approved"  count={approvedCnt}  total={totalInvoices} />
                <DonutLegend color="#f59e0b" label="Pending"   count={pendingCnt}   total={totalInvoices} />
                <DonutLegend color="#f97316" label="Queried"   count={queriedCnt}   total={totalInvoices} />
                <DonutLegend color="#ef4444" label="Rejected"  count={rejectedCnt}  total={totalInvoices} />
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-blue-400 text-sm">No invoices yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Bar Chart */}
      {monthlyRows.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-white mb-5 text-lg">Monthly Earnings (Last 6 Months)</h2>
          <div className="space-y-3">
            {monthlyRows.map(row => {
              const grossW = Math.round((row.gross / maxMonthly) * 100);
              const approvedW = Math.round((row.approved / maxMonthly) * 100);
              return (
                <div key={row.month} className="flex items-center gap-3">
                  <span className="text-xs text-blue-400 w-12 shrink-0 text-right">{monthLabel(row.month)}</span>
                  <div className="flex-1 relative h-7 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-white/10 rounded-full transition-all" style={{ width: `${grossW}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all" style={{ width: `${approvedW}%` }} />
                  </div>
                  <span className="text-xs text-blue-200 w-28 shrink-0 text-right">
                    <span className="font-medium">{fmt(row.approved)}</span>
                    {row.gross > row.approved && (
                      <span className="text-blue-400"> / {fmt(row.gross)}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-5 mt-4 text-xs text-blue-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white/20 inline-block" /> Submitted</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Approved</span>
          </div>
        </div>
      )}

      {/* Payment Waterfall */}
      {latestApproved && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-white mb-1 text-lg">Payment Breakdown</h2>
          <p className="text-xs text-blue-400 mb-5">Most recent approved invoice: {latestApproved.invoice_number}</p>
          <div className="flex h-10 rounded-xl overflow-hidden mb-3">
            {wfGross > 0 && (
              <div style={{ width: `${wfGross}%` }} className="bg-blue-500/30 flex items-center justify-center text-xs text-blue-300 font-medium shrink-0">
                Gross
              </div>
            )}
            {wfVat > 0 && (
              <div style={{ width: `${wfVat}%` }} className="bg-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-medium shrink-0">
                VAT
              </div>
            )}
            {wfCis > 0 && (
              <div style={{ width: `${wfCis}%` }} className="bg-red-500/40 flex items-center justify-center text-xs text-red-300 font-medium shrink-0">
                CIS
              </div>
            )}
            {wfRetention > 0 && (
              <div style={{ width: `${wfRetention}%` }} className="bg-amber-500/40 flex items-center justify-center text-xs text-amber-300 font-medium shrink-0">
                Ret.
              </div>
            )}
            {wfNet > 0 && (
              <div style={{ width: `${wfNet}%` }} className="bg-green-500/30 flex items-center justify-center text-xs text-green-300 font-medium shrink-0">
                Net
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-blue-300">
            <WaterfallLegend color="bg-blue-500/40"   label="Gross"      value={fmt(latestApproved.amount)} />
            {latestApproved.vat_amount > 0 && <WaterfallLegend color="bg-purple-500/40" label="+ VAT" value={fmt(latestApproved.vat_amount)} />}
            {latestApproved.cis_amount > 0 && <WaterfallLegend color="bg-red-500/40"    label="− CIS" value={fmt(latestApproved.cis_amount)} />}
            {(latestApproved.retention_amount - latestApproved.retention_released) > 0 && (
              <WaterfallLegend color="bg-amber-500/40" label="− Retention" value={fmt(latestApproved.retention_amount - latestApproved.retention_released)} />
            )}
            <WaterfallLegend color="bg-green-500/40" label="= Net"
              value={fmt(latestApproved.amount + latestApproved.vat_amount - latestApproved.cis_amount - latestApproved.retention_amount + latestApproved.retention_released)} />
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white text-lg">Recent Invoices</h2>
            <Link href="/subcontractor" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentInvoices.map(inv => {
              const cfg = statusConfig[inv.status] || statusConfig.pending;
              return (
                <Link key={inv.id} href={`/subcontractor/invoice/${inv.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/5 transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition">{inv.invoice_number}</span>
                    {inv.description && <span className="text-xs text-blue-400 truncate hidden sm:block">{inv.description}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">£{inv.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-blue-400">{new Date(inv.submitted_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {recentInvoices.length === 0 && (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">No invoices yet</h2>
          <p className="text-blue-300 mb-6">Submit your first invoice to get started</p>
          <Link href="/subcontractor/submit"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition">
            Submit Invoice →
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, suffix }: { label: string; value: string; color: string; suffix?: string }) {
  const colors: Record<string, string> = {
    blue:   'border-blue-500/30 bg-blue-500/10',
    green:  'border-green-500/30 bg-green-500/10',
    amber:  'border-amber-500/30 bg-amber-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
    red:    'border-red-500/30 bg-red-500/10',
  };
  const textColors: Record<string, string> = {
    blue:   'text-blue-300',
    green:  'text-green-300',
    amber:  'text-amber-300',
    purple: 'text-purple-300',
    red:    'text-red-300',
  };
  return (
    <div className={`border rounded-2xl p-5 ${colors[color] ?? colors.blue}`}>
      <p className={`text-2xl font-bold text-white`}>{value}</p>
      {suffix && <p className={`text-xs mt-0.5 ${textColors[color] ?? 'text-blue-300'}`}>{suffix}</p>}
      <p className="text-xs text-blue-300/80 mt-1">{label}</p>
    </div>
  );
}

function FinRow({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-blue-300">{label}</span>
      <span className={negative ? 'text-red-400' : positive ? 'text-green-400' : 'text-white'}>{value}</span>
    </div>
  );
}

function DonutLegend({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full shrink-0 inline-block" />
        <span className="text-blue-300">{label}</span>
      </span>
      <span className="text-white font-medium">{count} <span className="text-blue-400 font-normal text-xs">({pct(count, total)}%)</span></span>
    </div>
  );
}

function WaterfallLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${color} inline-block shrink-0`} />
      <span className="text-blue-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}
