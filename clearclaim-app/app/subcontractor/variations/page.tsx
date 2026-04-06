'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Variation {
  id: number;
  variation_number: string;
  description: string;
  value: number;
  status: string;
  project_name: string;
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

export default function SubcontractorVariationsPage() {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/variations')
      .then(r => r.json())
      .then(d => setVariations(d.variations || []))
      .finally(() => setLoading(false));
  }, []);

  const total = variations.reduce((s, v) => s + v.value, 0);
  const approved = variations.filter(v => v.status === 'approved').reduce((s, v) => s + v.value, 0);
  const pending = variations.filter(v => v.status === 'pending').reduce((s, v) => s + v.value, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 Variations & Change Orders</h1>
          <p className="text-blue-300 mt-1 text-sm">Track additional work and change orders</p>
        </div>
        <Link
          href="/subcontractor/variations/submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
        >
          + Submit Variation
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Total Submitted</p>
          <p className="text-white font-bold text-xl">{fmt(total)}</p>
        </div>
        <div className="bg-[#0a1628] border border-green-900/30 rounded-2xl p-4">
          <p className="text-green-400 text-xs mb-1">Approved</p>
          <p className="text-green-300 font-bold text-xl">{fmt(approved)}</p>
        </div>
        <div className="bg-[#0a1628] border border-amber-900/30 rounded-2xl p-4">
          <p className="text-amber-400 text-xs mb-1">Pending</p>
          <p className="text-amber-300 font-bold text-xl">{fmt(pending)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-blue-300 text-sm">Loading variations...</div>
      ) : variations.length === 0 ? (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-blue-300">No variations submitted yet.</p>
          <Link href="/subcontractor/variations/submit" className="mt-4 inline-block text-blue-400 hover:text-white text-sm">
            Submit your first variation →
          </Link>
        </div>
      ) : (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="text-left text-blue-400 font-medium px-4 py-3">Variation #</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Project</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Description</th>
                <th className="text-right text-blue-400 font-medium px-4 py-3">Value</th>
                <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {variations.map(v => (
                <tr key={v.id} className="border-b border-blue-900/20 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-mono font-semibold">{v.variation_number}</td>
                  <td className="px-4 py-3 text-blue-300">{v.project_name || '—'}</td>
                  <td className="px-4 py-3 text-blue-100">{v.description}</td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{fmt(v.value)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(v.status)}</td>
                  <td className="px-4 py-3 text-blue-400 text-xs">
                    {new Date(v.submitted_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
