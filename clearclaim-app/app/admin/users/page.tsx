'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  company: string;
  email: string;
  role: string;
  created_at: string;
}

function roleBadge(role: string) {
  const colours: Record<string, string> = {
    contractor: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    subcontractor: 'bg-green-600/20 text-green-400 border-green-600/30',
    employee: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  };
  return colours[role] || 'bg-slate-600/20 text-slate-400 border-slate-600/30';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = {
    all: users.length,
    contractor: users.filter((u) => u.role === 'contractor').length,
    subcontractor: users.filter((u) => u.role === 'subcontractor').length,
    employee: users.filter((u) => u.role === 'employee').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 mt-1">All registered users on the platform</p>
      </div>

      {/* Role count badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(['all', 'contractor', 'subcontractor', 'employee'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              roleFilter === r
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}{' '}
            <span className="ml-1 opacity-70">({counts[r]})</span>
          </button>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full max-w-md px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Signup Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users found</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white text-sm font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{user.company || '—'}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-6 py-3 border-t border-slate-700 text-slate-400 text-sm">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}
