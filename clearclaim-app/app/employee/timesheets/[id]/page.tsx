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

export default async function TimesheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session!.user as any;
  const { id } = await params;
  const db = getDb();

  const timesheet = db.prepare(`
    SELECT t.*, e.name as employee_name, p.name as project_name
    FROM timesheets t
    LEFT JOIN employees e ON e.id = t.employee_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(id) as any;

  if (!timesheet || timesheet.employee_id !== Number(user.employeeId)) return notFound();

  const days = [
    { label: 'Mon', key: 'mon_hours' },
    { label: 'Tue', key: 'tue_hours' },
    { label: 'Wed', key: 'wed_hours' },
    { label: 'Thu', key: 'thu_hours' },
    { label: 'Fri', key: 'fri_hours' },
    { label: 'Sat', key: 'sat_hours' },
    { label: 'Sun', key: 'sun_hours' },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/employee/timesheets" className="text-sm text-gray-400 hover:text-white transition">← Back to Timesheets</Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Timesheet — w/c {new Date(timesheet.week_starting).toLocaleDateString('en-GB')}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={timesheet.status} />
            {timesheet.project_name && <span className="text-sm text-gray-400">📁 {timesheet.project_name}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{timesheet.total_hours}h</div>
          <div className="text-xs text-gray-400">Total hours</div>
          {timesheet.total_hours > 40 && <div className="text-xs text-amber-400 mt-1">⚠️ Overtime</div>}
        </div>
      </div>

      {/* Hours grid */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Weekly Hours Breakdown</h2>
        <div className="grid grid-cols-7 gap-3">
          {days.map(day => {
            const hours = timesheet[day.key] || 0;
            const isOvertime = hours > 8;
            return (
              <div key={day.key} className={`rounded-lg p-3 text-center ${isOvertime ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                <div className="text-xs text-gray-400 mb-1">{day.label}</div>
                <div className={`text-xl font-bold ${isOvertime ? 'text-amber-300' : 'text-white'}`}>{hours}</div>
                {isOvertime && <div className="text-xs text-amber-400 mt-1">OT</div>}
              </div>
            );
          })}
        </div>
      </div>

      {timesheet.notes && (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-2">Notes</h2>
          <p className="text-gray-300 text-sm">{timesheet.notes}</p>
        </div>
      )}

      {timesheet.status === 'rejected' && timesheet.reviewer_comment && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-sm font-medium text-red-400 uppercase mb-2">Rejection Reason</h2>
          <p className="text-red-300 text-sm">{timesheet.reviewer_comment}</p>
        </div>
      )}

      {timesheet.status === 'approved' && timesheet.reviewer_comment && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
          <h2 className="text-sm font-medium text-emerald-400 uppercase mb-2">Reviewer Comment</h2>
          <p className="text-emerald-300 text-sm">{timesheet.reviewer_comment}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Submitted: {new Date(timesheet.submitted_at).toLocaleString('en-GB')}
        {timesheet.reviewed_at && ` · Reviewed: ${new Date(timesheet.reviewed_at).toLocaleString('en-GB')}`}
      </div>
    </div>
  );
}
