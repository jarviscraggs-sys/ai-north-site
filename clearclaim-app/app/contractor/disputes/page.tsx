import { getDb } from '@/lib/db';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function daysBetween(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isNoticeWindowOpen(paymentDueDate: string | null, payLessNoticeDate: string | null): boolean {
  if (!paymentDueDate) return false;
  const due = new Date(paymentDueDate);
  const notice = payLessNoticeDate ? new Date(payLessNoticeDate) : new Date(due.getTime() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return now >= notice && now <= due;
}

function isDeadlinePassed(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const statusColors: Record<string, string> = {
  open: 'bg-red-500/20 text-red-300 border-red-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  escalated: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export default async function DisputesPage() {
  const session = await auth();
  const user = (session?.user as any);
  const db = getDb();

  const disputes = db.prepare(`
    SELECT d.*, 
      i.invoice_number, i.amount as invoice_amount, i.submitted_at as invoice_date,
      u_sub.name as subcontractor_name, u_sub.company as subcontractor_company
    FROM disputes d
    JOIN invoices i ON d.invoice_id = i.id
    JOIN users u_sub ON d.subcontractor_id = u_sub.id
    WHERE d.contractor_id = ?
    ORDER BY CASE d.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'escalated' THEN 2 ELSE 3 END, d.created_at DESC
  `).all(user?.id) as any[];

  const openCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="text-blue-300 mt-1">{disputes.length} dispute{disputes.length !== 1 ? 's' : ''} · {openCount} open</p>
        </div>
      </div>

      {openCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
          <p className="text-red-300 font-semibold">⚠️ {openCount} open dispute{openCount !== 1 ? 's' : ''} require attention</p>
        </div>
      )}

      {disputes.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-white font-semibold">No disputes</p>
          <p className="text-blue-400/60 text-sm mt-1">Disputes can be raised from invoice detail pages</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-blue-400 font-medium px-5 py-3">Invoice</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Type</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Amount</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Days Open</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Pay Less Notice</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Const. Act</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {disputes.map(d => {
                  const daysOpen = daysBetween(d.created_at);
                  const noticeOpen = isNoticeWindowOpen(d.payment_due_date, d.pay_less_notice_date);
                  const noticePassed = isDeadlinePassed(d.pay_less_notice_date);
                  const duePassed = isDeadlinePassed(d.payment_due_date);

                  return (
                    <tr key={d.id} className={`border-b border-white/5 hover:bg-white/5 transition ${d.status === 'open' ? 'bg-red-500/5' : ''}`}>
                      <td className="px-5 py-3">
                        <Link href={`/contractor/disputes/${d.id}`} className="text-blue-300 hover:text-white font-medium text-sm">
                          {d.invoice_number}
                        </Link>
                        <p className="text-blue-400/60 text-xs">#{d.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white text-sm">{d.subcontractor_company}</p>
                        <p className="text-blue-400/60 text-xs">{d.subcontractor_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-200 text-sm capitalize">{d.dispute_type}</span>
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {d.amount_disputed ? `£${d.amount_disputed.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg border capitalize ${statusColors[d.status] || 'bg-white/10 text-white border-white/20'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${daysOpen > 30 ? 'text-red-400' : daysOpen > 14 ? 'text-amber-400' : 'text-blue-300'}`}>
                        {d.status !== 'resolved' ? `${daysOpen}d` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-xs ${noticePassed ? 'text-red-400 font-semibold' : 'text-blue-300'}`}>
                        {d.pay_less_notice_date ? new Date(d.pay_less_notice_date).toLocaleDateString('en-GB') : '—'}
                        {noticePassed && d.status !== 'resolved' && <span className="block text-red-400">PASSED</span>}
                      </td>
                      <td className="px-4 py-3">
                        {noticeOpen && (
                          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg">
                            ⏰ Window Open
                          </span>
                        )}
                        {noticePassed && d.status !== 'resolved' && (
                          <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-lg">
                            ⚠️ Deadline Passed
                          </span>
                        )}
                        {duePassed && !noticePassed && d.status !== 'resolved' && (
                          <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-1 rounded-lg">
                            🔴 Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/contractor/disputes/${d.id}`} className="text-xs text-blue-400 hover:text-white transition font-medium whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
