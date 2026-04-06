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

export default function ContractorHolidayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [holiday, setHoliday] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/holidays/${id}`).then(r => r.json()).then(data => {
      setHoliday(data);
      setLoading(false);
    });
  }, [id]);

  const review = async (status: 'approved' | 'rejected') => {
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_comment: comment }),
    });
    if (res.ok) {
      router.push('/contractor/holidays');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading...</div>;
  if (!holiday || holiday.error) return <div className="text-red-400">Holiday request not found.</div>;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/contractor/holidays" className="text-sm text-gray-400 hover:text-white transition">← Back to Holidays</Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Holiday Request</h1>
          <p className="text-gray-400 mt-1">{holiday.employee_name}</p>
        </div>
        <StatusBadge status={holiday.status} />
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 space-y-3 mb-6">
        {[
          { label: 'Employee', value: holiday.employee_name },
          { label: 'Type', value: <span className="capitalize">{holiday.type}</span> },
          { label: 'Start Date', value: new Date(holiday.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'End Date', value: new Date(holiday.end_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'Days Requested', value: <strong>{holiday.days_requested} days</strong> },
        ].map(row => (
          <div key={row.label} className="flex justify-between">
            <span className="text-sm text-gray-400">{row.label}</span>
            <span className="text-sm text-white">{row.value}</span>
          </div>
        ))}
        {holiday.notes && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-1">Notes</div>
            <div className="text-sm text-gray-300">{holiday.notes}</div>
          </div>
        )}
      </div>

      {holiday.status === 'pending' && (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Decision</h2>
          {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder="Comment (optional for approval, recommended for rejection)"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4" />
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

      {holiday.reviewer_comment && holiday.status !== 'pending' && (
        <div className={`rounded-xl p-6 ${holiday.status === 'approved' ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
          <h2 className={`text-sm font-medium uppercase mb-2 ${holiday.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
            {holiday.status === 'approved' ? 'Approval Note' : 'Rejection Reason'}
          </h2>
          <p className={`text-sm ${holiday.status === 'approved' ? 'text-emerald-300' : 'text-red-300'}`}>{holiday.reviewer_comment}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Submitted: {new Date(holiday.submitted_at).toLocaleString('en-GB')}
        {holiday.reviewed_at && ` · Reviewed: ${new Date(holiday.reviewed_at).toLocaleString('en-GB')}`}
      </div>
    </div>
  );
}
