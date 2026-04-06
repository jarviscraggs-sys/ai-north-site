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

export default function ContractorTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmployee) params.set('employee_id', filterEmployee);
    if (filterStatus) params.set('status', filterStatus);
    if (filterWeek) params.set('week_starting', filterWeek);
    const [ts, emps] = await Promise.all([
      fetch(`/api/timesheets?${params}`).then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]);
    setTimesheets(Array.isArray(ts) ? ts : []);
    setEmployees(Array.isArray(emps) ? emps : []);
    setLoading(false);
  }, [filterEmployee, filterStatus, filterWeek]);

  useEffect(() => { load(); }, [load]);

  const bulkApprove = async () => {
    setBulkLoading(true);
    await Promise.all([...selected].map(id =>
      fetch(`/api/timesheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
    ));
    setSelected(new Set());
    setBulkLoading(false);
    load();
  };

  const pendingIds = timesheets.filter(t => t.status === 'pending').map(t => t.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Timesheets</h1>
          <p className="text-gray-400 text-sm mt-1">{timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={bulkApprove} disabled={bulkLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
              {bulkLoading ? 'Approving...' : `✓ Approve ${selected.size} selected`}
            </button>
          )}
          <Link href="/contractor/timesheets/payroll" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition">
            💰 Payroll
          </Link>
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
        <input type="date" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}
          placeholder="Week starting"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {(filterEmployee || filterStatus || filterWeek) && (
          <button onClick={() => { setFilterEmployee(''); setFilterStatus(''); setFilterWeek(''); }}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-sm transition">
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
        ) : timesheets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">⏱️</div>
            <p className="text-gray-400">No timesheets found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={pendingIds.length > 0 && pendingIds.every(id => selected.has(id))}
                    onChange={e => setSelected(e.target.checked ? new Set(pendingIds) : new Set())}
                    className="rounded" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Overtime?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {timesheets.map((t: any) => (
                <tr key={t.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    {t.status === 'pending' && (
                      <input type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(t.id) : s.delete(t.id);
                          setSelected(s);
                        }}
                        className="rounded" />
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Link href={`/contractor/timesheets/${t.id}`} className="block text-sm font-medium text-white hover:text-blue-300">{t.employee_name}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-300">{new Date(t.week_starting).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-3 text-sm text-gray-300">{t.total_hours}h</td>
                  <td className="px-6 py-3 text-sm">{t.total_hours > 40 ? <span className="text-amber-400">⚠️ {(t.total_hours - 40).toFixed(1)}h OT</span> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-6 py-3 text-sm text-gray-400">{t.project_name || '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
