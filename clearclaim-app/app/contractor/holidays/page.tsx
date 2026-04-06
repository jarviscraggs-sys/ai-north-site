'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    rejected: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status}
    </span>
  );
}

export default function ContractorHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Settings
  const [maxPerDay, setMaxPerDay] = useState(1);
  const [maxPerDayInput, setMaxPerDayInput] = useState('1');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmployee) params.set('employee_id', filterEmployee);
    if (filterStatus) params.set('status', filterStatus);
    if (filterType) params.set('type', filterType);
    const [hs, emps, settings] = await Promise.all([
      fetch(`/api/holidays?${params}`).then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/contractor/settings').then(r => r.json()),
    ]);
    const all = Array.isArray(hs) ? hs : [];
    all.sort((a: any, b: any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
    setHolidays(all);
    setEmployees(Array.isArray(emps) ? emps : []);
    if (settings?.max_holidays_per_day) {
      setMaxPerDay(settings.max_holidays_per_day);
      setMaxPerDayInput(String(settings.max_holidays_per_day));
    }
    setLoading(false);
  }, [filterEmployee, filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    const val = parseInt(maxPerDayInput);
    if (!val || val < 1) return;
    setSavingSettings(true);
    const res = await fetch('/api/contractor/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_holidays_per_day: val }),
    });
    if (res.ok) {
      setMaxPerDay(val);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    }
    setSavingSettings(false);
  };

  const review = async (id: number, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_comment: comment }),
    });
    if (res.ok) {
      setReviewingId(null);
      setComment('');
      load();
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Holiday Requests</h1>
          <p className="text-gray-400 text-sm mt-1">{holidays.filter(h => h.status === 'pending').length} pending</p>
        </div>
      </div>

      {/* Settings panel */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Holiday Settings</h2>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max employees off per day</label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxPerDayInput}
              onChange={e => setMaxPerDayInput(e.target.value)}
              className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end pb-0.5">
            <button
              onClick={saveSettings}
              disabled={savingSettings || parseInt(maxPerDayInput) === maxPerDay}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {savingSettings ? 'Saving...' : settingsSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-auto pb-1">
            Currently: <span className="text-white font-medium">{maxPerDay}</span> employee{maxPerDay !== 1 ? 's' : ''} max per day
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All employees</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All types</option>
          <option value="annual">Annual</option>
          <option value="sick">Sick</option>
          <option value="unpaid">Unpaid</option>
          <option value="compassionate">Compassionate</option>
          <option value="other">Other</option>
        </select>
        {(filterEmployee || filterStatus || filterType) && (
          <button onClick={() => { setFilterEmployee(''); setFilterStatus(''); setFilterType(''); }}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-sm transition">
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
        ) : holidays.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">🏖️</div>
            <p className="text-gray-400">No holiday requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {holidays.map((h: any) => (
              <div key={h.id} className={h.status === 'pending' ? 'border-l-2 border-yellow-500' : ''}>
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <Link href={`/contractor/holidays/${h.id}`} className="text-sm font-medium text-white hover:text-blue-300">
                        {h.employee_name}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(h.start_date).toLocaleDateString('en-GB')} → {new Date(h.end_date).toLocaleDateString('en-GB')} · {h.days_requested} days
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 capitalize">{h.type}</span>
                    <StatusBadge status={h.status} />
                    {h.status === 'pending' && (
                      <div className="flex gap-2">
                        {reviewingId === h.id ? (
                          <div className="flex items-center gap-2">
                            <input value={comment} onChange={e => setComment(e.target.value)}
                              placeholder="Comment (optional)"
                              className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs w-48 focus:outline-none" />
                            <button onClick={() => review(h.id, 'approved')} disabled={submitting}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium">✓</button>
                            <button onClick={() => review(h.id, 'rejected')} disabled={submitting}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded text-xs font-medium">✕</button>
                            <button onClick={() => setReviewingId(null)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setReviewingId(h.id); setComment(''); }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium">
                            Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
