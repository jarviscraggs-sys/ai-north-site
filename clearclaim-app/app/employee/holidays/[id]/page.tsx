import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[status] || ''}`}>
      {status.toUpperCase()}
    </span>
  );
}

export const dynamic = 'force-dynamic';

export default async function HolidayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session!.user as any;
  const { id } = await params;
  const db = getDb();

  const holiday = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id) as any;
  if (!holiday || holiday.employee_id !== Number(user.employeeId)) return notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/employee/holidays" className="text-sm text-gray-400 hover:text-white transition">← Back to Holidays</Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Holiday Request</h1>

      <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <span className="text-gray-400 text-sm">Status</span>
          <StatusBadge status={holiday.status} />
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Type</span>
          <span className="text-white text-sm capitalize">{holiday.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Start Date</span>
          <span className="text-white text-sm">{new Date(holiday.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">End Date</span>
          <span className="text-white text-sm">{new Date(holiday.end_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Days Requested</span>
          <span className="text-white text-sm font-semibold">{holiday.days_requested} days</span>
        </div>
        {holiday.notes && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-gray-400 text-sm mb-1">Notes</div>
            <div className="text-gray-300 text-sm">{holiday.notes}</div>
          </div>
        )}
        {holiday.reviewer_comment && (
          <div className={`pt-4 border-t border-white/10 rounded-lg p-3 mt-2 ${holiday.status === 'approved' ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
            <div className={`text-xs font-medium uppercase mb-1 ${holiday.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
              {holiday.status === 'approved' ? 'Approval Note' : 'Rejection Reason'}
            </div>
            <div className={`text-sm ${holiday.status === 'approved' ? 'text-emerald-300' : 'text-red-300'}`}>{holiday.reviewer_comment}</div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Submitted: {new Date(holiday.submitted_at).toLocaleString('en-GB')}
        {holiday.reviewed_at && ` · Reviewed: ${new Date(holiday.reviewed_at).toLocaleString('en-GB')}`}
      </div>
    </div>
  );
}
