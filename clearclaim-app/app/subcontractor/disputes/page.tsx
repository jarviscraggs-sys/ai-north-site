import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import SubcontractorNav from '@/components/SubcontractorNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SubDisputesPage() {
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();

  const disputes = db.prepare(`
    SELECT d.*, i.invoice_number, i.amount as invoice_amount
    FROM disputes d
    JOIN invoices i ON d.invoice_id = i.id
    WHERE d.subcontractor_id = ?
    ORDER BY d.created_at DESC
  `).all(user.id) as any[];

  const statusBadge: Record<string, string> = {
    open: 'bg-red-500/20 text-red-300 border-red-500/30',
    in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
    escalated: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <SubcontractorNav />
      <div className="p-6 pt-20 lg:pt-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Disputes</h1>
          <p className="text-blue-400 text-sm mt-1">Formal disputes raised on your invoices</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex gap-3">
          <span className="text-xl">⚖️</span>
          <div>
            <p className="text-blue-200 text-sm font-medium">Your rights under the Construction Act 1996</p>
            <p className="text-blue-300/70 text-xs mt-0.5">You have the right to raise a formal dispute on any rejected or queried invoice. Go to the invoice and click "Raise a Formal Dispute".</p>
          </div>
        </div>

        {disputes.length === 0 && (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-white font-semibold mb-1">No disputes raised</p>
            <p className="text-blue-400 text-sm">If an invoice is rejected or queried unfairly, open the invoice and raise a formal dispute.</p>
          </div>
        )}

        <div className="space-y-3">
          {disputes.map((d: any) => {
            const isPayLessOverdue = d.pay_less_notice_date && d.pay_less_notice_date < today && d.status === 'open';
            const isPaymentOverdue = d.payment_due_date && d.payment_due_date < today && d.status !== 'resolved';
            return (
              <div key={d.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{d.invoice_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${statusBadge[d.status] || statusBadge.open}`}>
                        {d.status.replace('_', ' ').charAt(0).toUpperCase() + d.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-blue-400 text-xs">{d.dispute_type.replace('_', ' ')} • Amount disputed: {fmt(d.amount_disputed || d.invoice_amount)}</p>
                  </div>
                  <Link href={`/subcontractor/invoice/${d.invoice_id}`} className="text-blue-400 hover:text-blue-300 text-xs">
                    View Invoice →
                  </Link>
                </div>

                <p className="text-blue-200/80 text-sm mb-3">{d.description}</p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {d.payment_due_date && (
                    <div className={`rounded-lg p-2 ${isPaymentOverdue ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5'}`}>
                      <p className="text-blue-400">Payment Due</p>
                      <p className={`font-medium ${isPaymentOverdue ? 'text-red-300' : 'text-white'}`}>
                        {isPaymentOverdue ? '⚠️ OVERDUE — ' : ''}{d.payment_due_date}
                      </p>
                    </div>
                  )}
                  {d.pay_less_notice_date && (
                    <div className={`rounded-lg p-2 ${isPayLessOverdue ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'}`}>
                      <p className="text-blue-400">Pay Less Notice Deadline</p>
                      <p className={`font-medium ${isPayLessOverdue ? 'text-amber-300' : 'text-white'}`}>
                        {isPayLessOverdue ? '⚠️ Passed — ' : ''}{d.pay_less_notice_date}
                      </p>
                      {isPayLessOverdue && <p className="text-amber-300/70 text-xs mt-0.5">Contractor may be obliged to pay in full</p>}
                    </div>
                  )}
                </div>

                {d.resolution_notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-blue-400 mb-1">Resolution Notes</p>
                    <p className="text-blue-200/80 text-sm">{d.resolution_notes}</p>
                  </div>
                )}

                <p className="text-blue-400/40 text-xs mt-3">Raised {new Date(d.created_at).toLocaleDateString('en-GB')}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
