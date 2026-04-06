'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
}

export default function ContractorEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'invite' | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'Site Worker', hourly_rate: '', weekly_hours: '40', holiday_allowance: '28', start_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const resetForm = () => {
    setForm({ name: '', email: '', role: 'Site Worker', hourly_rate: '', weekly_hours: '40', holiday_allowance: '28', start_date: '' });
    setError('');
    setInviteLink('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          hourly_rate: parseFloat(form.hourly_rate) || 0,
          weekly_hours: parseFloat(form.weekly_hours) || 40,
          holiday_allowance: parseInt(form.holiday_allowance) || 28,
          start_date: form.start_date || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed');
        return;
      }
      setMode(null);
      resetForm();
      loadEmployees();
    } catch {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          hourly_rate: parseFloat(form.hourly_rate) || 0,
          weekly_hours: parseFloat(form.weekly_hours) || 40,
          holiday_allowance: parseInt(form.holiday_allowance) || 28,
          start_date: form.start_date || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to send invite');
        return;
      }
      const data = await res.json();
      setInviteLink(data.inviteLink);
      loadEmployees();
    } catch {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const FormFields = () => (
    <>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Email *</label>
        <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Job Title</label>
        <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Hourly Rate (£)</label>
        <input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Weekly Hours</label>
        <input type="number" step="0.5" value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Holiday Allowance (days)</label>
        <input type="number" value={form.holiday_allowance} onChange={e => setForm(f => ({ ...f, holiday_allowance: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Start Date</label>
        <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-gray-400 text-sm mt-1">{employees.length} employee{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode(mode === 'invite' ? null : 'invite'); resetForm(); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
            {mode === 'invite' ? '✕ Cancel' : '✉ Invite Employee'}
          </button>
          <button
            onClick={() => { setMode(mode === 'add' ? null : 'add'); resetForm(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">
            {mode === 'add' ? '✕ Cancel' : '+ Add Employee'}
          </button>
        </div>
      </div>

      {/* Invite form */}
      {mode === 'invite' && (
        <div className="bg-[#1c2333] border border-emerald-900/30 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-1">Invite Employee</h2>
          <p className="text-xs text-gray-400 mb-4">Creates their profile and sends them an invite link to set up their account.</p>
          {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}

          {inviteLink ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                <p className="text-emerald-300 text-sm font-medium mb-2">✓ Invite sent to {form.email}</p>
                <p className="text-xs text-gray-400 mb-3">Share this link with the employee if the email doesn&apos;t arrive:</p>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none" />
                  <button onClick={copyLink}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition">
                    {inviteCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <button onClick={() => { setMode(null); resetForm(); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm transition">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
              <FormFields />
              <div className="flex items-end">
                <button type="submit" disabled={submitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
                  {submitting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Add form */}
      {mode === 'add' && (
        <div className="bg-[#1c2333] border border-blue-900/30 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">New Employee</h2>
          {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <FormFields />
            <div className="flex items-end">
              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
                {submitting ? 'Adding...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-gray-400">No employees yet. Add or invite your first one!</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours (Week)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Holiday</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {employees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-white/5 transition cursor-pointer">
                  <td className="px-6 py-3">
                    <Link href={`/contractor/employees/${emp.id}`} className="block">
                      <div className="text-sm font-medium text-white">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-300">{emp.role}</td>
                  <td className="px-6 py-3 text-sm text-gray-300">{emp.hours_this_week || 0}h</td>
                  <td className="px-6 py-3 text-sm text-gray-300">
                    {emp.holiday_used}/{emp.holiday_allowance}d
                    <span className="text-gray-500 ml-1">({emp.holiday_allowance - emp.holiday_used} left)</span>
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={emp.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
