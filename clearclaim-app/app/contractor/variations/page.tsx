'use client';

import { useState, useEffect, useCallback } from 'react';

interface Variation {
  id: number;
  variation_number: string;
  description: string;
  value: number;
  status: string;
  project_name: string;
  subcontractor_name: string;
  subcontractor_company: string;
  submitted_at: string;
  reviewed_at: string;
  reviewer_comment: string;
}

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {status}
    </span>
  );
};

export default function ContractorVariationsPage() {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/variations')
      .then(r => r.json())
      .then(d => setVariations(d.variations || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (id: number, status: 'approved' | 'rejected') => {
    setSaving(true);
    await fetch(`/api/variations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_comment: comment }),
    });
    setReviewingId(null);
    setComment('');
    setSaving(false);
    load();
  };

  // Group by project for totals
  const byProject = variations.reduce<Record<string, { name: string; total: number; approved: number }>>((acc, v) => {
    const key = v.project_name || 'No Project';
    if (!acc[key]) acc[key] = { name: key, total: 0, approved: 0 };
    acc[key].total += v.value;
    if (v.status === 'approved') acc[key].approved += v.value;
    return acc;
  }, {});

  const grandTotal = variations.reduce((s, v) => s + v.value, 0);
  const grandApproved = variations.filter(v => v.status === 'approved').reduce((s, v) => s + v.value, 0);
  const grandPending = variations.filter(v => v.status === 'pending').reduce((s, v) => s + v.value, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Variations & Change Orders</h1>
        <p className="text-blue-300 mt-1 text-sm">Review and approve variation requests from subcontractors</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Total Submitted</p>
          <p className="text-white font-bold text-xl">{fmt(grandTotal)}</p>
        </div>
        <div className="bg-[#0a1628] border border-green-900/30 rounded-2xl p-4">
          <p className="text-green-400 text-xs mb-1">Approved</p>
          <p className="text-green-300 font-bold text-xl">{fmt(grandApproved)}</p>
        </div>
        <div className="bg-[#0a1628] border border-amber-900/30 rounded-2xl p-4">
          <p className="text-amber-400 text-xs mb-1">Pending Review</p>
          <p className="text-amber-300 font-bold text-xl">{fmt(grandPending)}</p>
        </div>
      </div>

      {/* Project totals */}
      {Object.keys(byProject).length > 0 && (
        <div className="mb-6 bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-blue-300 mb-3">Variations by Project</h2>
          <div className="space-y-2">
            {Object.entries(byProject).map(([key, p]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-white">{p.name}</span>
                <div className="flex gap-6">
                  <span className="text-blue-400">Total: <span className="text-white font-semibold">{fmt(p.total)}</span></span>
                  <span className="text-green-400">Approved: <span className="text-green-300 font-semibold">{fmt(p.approved)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-blue-300 text-sm">Loading variations...</div>
      ) : variations.length === 0 ? (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-blue-300">No variations submitted yet.</p>
        </div>
      ) : (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="text-left text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Project</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Variation #</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Description</th>
                <th className="text-right text-blue-400 font-medium px-4 py-3">Value</th>
                <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variations.map(v => (
                <>
                  <tr key={v.id} className="border-b border-blue-900/20 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{v.subcontractor_company || v.subcontractor_name}</p>
                      <p className="text-blue-400 text-xs">{v.subcontractor_name}</p>
                    </td>
                    <td className="px-4 py-3 text-blue-300">{v.project_name || '—'}</td>
                    <td className="px-4 py-3 text-white font-mono font-semibold">{v.variation_number}</td>
                    <td className="px-4 py-3 text-blue-100 max-w-xs">
                      <p className="truncate" title={v.description}>{v.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{fmt(v.value)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3">
                      {v.status === 'pending' && (
                        <button
                          onClick={() => { setReviewingId(reviewingId === v.id ? null : v.id); setComment(''); }}
                          className="text-xs text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-400 px-3 py-1 rounded-lg transition"
                        >
                          Review
                        </button>
                      )}
                      {v.status !== 'pending' && v.reviewer_comment && (
                        <span className="text-xs text-blue-500 italic">{v.reviewer_comment}</span>
                      )}
                    </td>
                  </tr>
                  {reviewingId === v.id && (
                    <tr key={`review-${v.id}`} className="border-b border-blue-900/20 bg-blue-900/10">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="block text-xs font-medium text-blue-300 mb-1">Comment (optional)</label>
                            <input
                              type="text"
                              value={comment}
                              onChange={e => setComment(e.target.value)}
                              placeholder="Add a reviewer comment..."
                              className="w-full max-w-md px-3 py-2 bg-[#0f1f3d] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={saving}
                              onClick={() => handleDecision(v.id, 'approved')}
                              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              disabled={saving}
                              onClick={() => handleDecision(v.id, 'rejected')}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                            >
                              ✗ Reject
                            </button>
                            <button
                              onClick={() => setReviewingId(null)}
                              className="px-4 py-1.5 border border-blue-900/50 text-blue-400 hover:text-white text-xs rounded-lg transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
