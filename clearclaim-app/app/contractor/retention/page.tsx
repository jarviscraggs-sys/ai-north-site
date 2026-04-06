'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RetentionRow {
  id: number;
  invoice_number: string;
  amount: number;
  retention_rate: number;
  retention_amount: number;
  retention_released: number;
  retention_release_date: string | null;
  status: string;
  submitted_at: string;
  subcontractor_name: string;
  subcontractor_company: string;
  subcontractor_id: number;
}

const fmt = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RetentionDashboard() {
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [totalHeld, setTotalHeld] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterSubcontractor, setFilterSubcontractor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Release modal
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubcontractor) params.set('subcontractor_id', filterSubcontractor);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);

    try {
      const res = await fetch(`/api/retention?${params}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotalHeld(data.totalHeld || 0);
      setOverdueCount(data.overdueCount || 0);
    } catch {
      setError('Failed to load retention data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterSubcontractor, filterDateFrom, filterDateTo]);

  const handleRelease = async () => {
    if (!releasingId || !releaseAmount) return;
    setReleaseLoading(true);
    try {
      const res = await fetch(`/api/invoices/${releasingId}/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_amount: parseFloat(releaseAmount) }),
      });
      if (res.ok) {
        setReleasingId(null);
        setReleaseAmount('');
        await load();
      }
    } catch {
      // silent
    } finally {
      setReleaseLoading(false);
    }
  };

  const now = new Date().toISOString();
  const subcontractors = Array.from(new Map(rows.map(r => [r.subcontractor_id, r])).values());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Retention Dashboard</h1>
        <p className="text-blue-300 mt-1 text-sm">Track and release retention across all subcontractors</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Total Retention Held</p>
          <p className="text-3xl font-bold text-white">£{fmt(totalHeld)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Active Invoices</p>
          <p className="text-3xl font-bold text-white">{rows.length}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${overdueCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
          <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Overdue Releases</p>
          <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <p className="text-xs text-blue-400 mb-1">Filter by Subcontractor</p>
          <select
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterSubcontractor}
            onChange={e => setFilterSubcontractor(e.target.value)}
          >
            <option value="">All Subcontractors</option>
            {subcontractors.map(s => (
              <option key={s.subcontractor_id} value={s.subcontractor_id}>
                {s.subcontractor_company}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-blue-400 mb-1">Date From</p>
          <input
            type="date"
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs text-blue-400 mb-1">Date To</p>
          <input
            type="date"
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
          />
        </div>
        {(filterSubcontractor || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterSubcontractor(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="px-4 py-2 text-sm text-blue-300 hover:text-white border border-white/20 rounded-xl transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-blue-300 text-center py-12">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-blue-300">No retention found. Approved invoices with retention will appear here.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Subcontractor</th>
                  <th className="text-left px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Invoice</th>
                  <th className="text-right px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Gross</th>
                  <th className="text-right px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Rate</th>
                  <th className="text-right px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Held</th>
                  <th className="text-right px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Released</th>
                  <th className="text-left px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Release Date</th>
                  <th className="text-left px-4 py-3 text-xs text-blue-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const held = (row.retention_amount || 0) - (row.retention_released || 0);
                  const isOverdue = row.retention_release_date && row.retention_release_date < now && held > 0;
                  const isFullyReleased = held <= 0;

                  return (
                    <tr key={row.id} className={`border-b border-white/5 hover:bg-white/5 transition ${isOverdue ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{row.subcontractor_company}</p>
                        <p className="text-blue-400/70 text-xs">{row.subcontractor_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/contractor/invoice/${row.id}`} className="text-blue-300 hover:text-white">
                          {row.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-white">£{fmt(row.amount)}</td>
                      <td className="px-4 py-3 text-right text-blue-200">{row.retention_rate}%</td>
                      <td className="px-4 py-3 text-right text-amber-300 font-semibold">£{fmt(held)}</td>
                      <td className="px-4 py-3 text-right text-green-300">£{fmt(row.retention_released || 0)}</td>
                      <td className="px-4 py-3">
                        {row.retention_release_date ? (
                          <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-blue-300'}>
                            {isOverdue ? '⚠️ ' : ''}
                            {new Date(row.retention_release_date).toLocaleDateString('en-GB')}
                          </span>
                        ) : (
                          <span className="text-blue-400/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isFullyReleased ? (
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-lg font-medium">Released</span>
                        ) : isOverdue ? (
                          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-lg font-medium">Overdue</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-medium">Held</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isFullyReleased && (
                          <button
                            onClick={() => { setReleasingId(row.id); setReleaseAmount(fmt(held).replace(/,/g, '')); }}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                          >
                            Release
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Release modal */}
      {releasingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">Release Retention</h3>
            <div className="mb-4">
              <label className="text-sm text-blue-300 mb-1.5 block">Amount to Release (£)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={releaseAmount}
                onChange={e => setReleaseAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRelease}
                disabled={releaseLoading || !releaseAmount}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
              >
                {releaseLoading ? 'Releasing...' : 'Confirm Release'}
              </button>
              <button
                onClick={() => setReleasingId(null)}
                className="px-5 py-2.5 border border-white/20 text-blue-300 hover:text-white rounded-xl transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
