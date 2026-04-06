'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
  };
  return <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[status] || ''}`}>{status.toUpperCase()}</span>;
}

const DAYS = [
  { label: 'Mon', key: 'mon_hours' }, { label: 'Tue', key: 'tue_hours' },
  { label: 'Wed', key: 'wed_hours' }, { label: 'Thu', key: 'thu_hours' },
  { label: 'Fri', key: 'fri_hours' }, { label: 'Sat', key: 'sat_hours' },
  { label: 'Sun', key: 'sun_hours' },
];

export default function ContractorTimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [timesheet, setTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/timesheets/${id}`).then(r => r.json()).then(data => {
      setTimesheet(data);
      setLoading(false);
    });
  }, [id]);

  const review = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !comment.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/timesheets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_comment: comment }),
    });
    if (res.ok) {
      router.push('/contractor/timesheets');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading...</div>;
  if (!timesheet) return <div className="text-red-400">Timesheet not found.</div>;

  const overtimeHours = Math.max(0, timesheet.total_hours - 40);

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/timesheets" className="text-sm text-gray-400 hover:text-white transition">← Back to Timesheets</Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{timesheet.employee_name}</h1>
          <p className="text-gray-400 mt-1">Week commencing {new Date(timesheet.week_starting).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {timesheet.project_name && <p className="text-sm text-gray-400 mt-0.5">📁 {timesheet.project_name}</p>}
        </div>
        <StatusBadge status={timesheet.status} />
      </div>

      {/* Hours grid */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Daily Hours</h2>
        <div className="grid grid-cols-7 gap-3">
          {DAYS.map(day => {
            const hours = timesheet[day.key] || 0;
            const isOT = hours > 8;
            return (
              <div key={day.key} className={`rounded-lg p-3 text-center ${isOT ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                <div className="text-xs text-gray-400 mb-1">{day.label}</div>
                <div className={`text-xl font-bold ${isOT ? 'text-amber-300' : 'text-white'}`}>{hours}</div>
                {isOT && <div className="text-xs text-amber-400 mt-1">OT</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
          <div>
            <span className="text-sm text-gray-400">Total Hours: </span>
            <span className="text-lg font-bold text-white">{timesheet.total_hours}h</span>
          </div>
          {overtimeHours > 0 && (
            <div className="text-amber-400 text-sm">
              ⚠️ {overtimeHours}h overtime ({timesheet.total_hours - 40}h over 40)
            </div>
          )}
        </div>
      </div>

      {timesheet.notes && (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-2">Notes from Employee</h2>
          <p className="text-gray-300 text-sm">{timesheet.notes}</p>
        </div>
      )}

      {timesheet.status === 'pending' && (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Review Timesheet</h2>
          {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Comment (required for rejection)"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
          />
          <div className="flex gap-3">
            <button onClick={() => review('approved')} disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
              ✓ Approve
            </button>
            <button onClick={() => review('rejected')} disabled={submitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
              ✕ Reject
            </button>
          </div>
        </div>
      )}

      {timesheet.reviewer_comment && timesheet.status !== 'pending' && (
        <div className={`rounded-xl p-6 ${timesheet.status === 'approved' ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
          <h2 className={`text-sm font-medium uppercase mb-2 ${timesheet.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
            {timesheet.status === 'approved' ? 'Approval Note' : 'Rejection Reason'}
          </h2>
          <p className={`text-sm ${timesheet.status === 'approved' ? 'text-emerald-300' : 'text-red-300'}`}>{timesheet.reviewer_comment}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Submitted: {new Date(timesheet.submitted_at).toLocaleString('en-GB')}
        {timesheet.reviewed_at && ` · Reviewed: ${new Date(timesheet.reviewed_at).toLocaleString('en-GB')}`}
      </div>
    </div>
  );
}
