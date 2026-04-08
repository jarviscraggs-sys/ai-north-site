'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalContractors: number;
  totalSubcontractors: number;
  totalEmployees: number;
  totalInvoices: number;
  totalInvoiceValue: number;
  invoicesThisMonth: number;
  newSignupsThisWeek: number;
  recentSignups: Array<{
    id: number;
    name: string;
    company: string;
    role: string;
    email: string;
    created_at: string;
  }>;
}

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
      {sub && <p className="text-blue-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function roleBadge(role: string) {
  const colours: Record<string, string> = {
    contractor: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    subcontractor: 'bg-green-600/20 text-green-400 border-green-600/30',
    employee: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  };
  return colours[role] || 'bg-slate-600/20 text-slate-400 border-slate-600/30';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-400">Failed to load stats.</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">ClearClaim platform overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🏢" label="Contractors" value={stats.totalContractors} />
        <StatCard icon="👷" label="Subcontractors" value={stats.totalSubcontractors} />
        <StatCard icon="👤" label="Employees" value={stats.totalEmployees} />
        <StatCard icon="📋" label="Invoices Processed" value={stats.totalInvoices} />
        <StatCard
          icon="💷"
          label="Total Invoice Value"
          value={`£${stats.totalInvoiceValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <StatCard icon="📅" label="Invoices This Month" value={stats.invoicesThisMonth} />
        <StatCard icon="🆕" label="Signups This Week" value={stats.newSignupsThisWeek} />
      </div>

      {/* Recent signups table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
          <p className="text-slate-400 text-sm">Last 10 users to join the platform</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Signed Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stats.recentSignups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users yet</td>
                </tr>
              ) : (
                stats.recentSignups.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white text-sm font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{user.company || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{user.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
