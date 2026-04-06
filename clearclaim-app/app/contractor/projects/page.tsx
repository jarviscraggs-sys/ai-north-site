'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: number;
  name: string;
  reference: string;
  address: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: string;
  total_invoiced: number;
}

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', reference: '', address: '', contract_value: '', start_date: '', end_date: '', status: 'active'
  });

  const load = () => {
    setLoading(true);
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create project'); setSaving(false); return; }
    setShowForm(false);
    setForm({ name: '', reference: '', address: '', contract_value: '', start_date: '', end_date: '', status: 'active' });
    load();
    setSaving(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-500/20 text-green-300 border-green-500/30',
      completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      on_hold: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const inputCls = 'w-full px-3 py-2 bg-[#0f1f3d] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-blue-300 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🏗️ Projects</h1>
          <p className="text-blue-300 mt-1 text-sm">Manage construction projects and track spend</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
        >
          + New Project
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">New Project</h2>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Project Name *</label>
              <input required className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. City Centre Refurb" />
            </div>
            <div>
              <label className={labelCls}>Reference</label>
              <input className={inputCls} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. CCR-2024-01" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Site address" />
            </div>
            <div>
              <label className={labelCls}>Contract Value (£)</label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.contract_value} onChange={e => setForm({ ...form, contract_value: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                {saving ? 'Creating...' : 'Create Project'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-blue-900/50 text-blue-300 hover:text-white text-sm rounded-xl transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-blue-300 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <p className="text-blue-300">No projects yet. Create your first project above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const pct = p.contract_value > 0 ? Math.min(100, (p.total_invoiced / p.contract_value) * 100) : 0;
            return (
              <div key={p.id} className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-5 cursor-pointer hover:border-blue-500/50 transition" onClick={() => router.push(`/contractor/projects/${p.id}`)}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-semibold text-lg">{p.name}</h3>
                      {statusBadge(p.status)}
                    </div>
                    {p.reference && <p className="text-blue-400 text-xs">Ref: {p.reference}</p>}
                    {p.address && <p className="text-blue-400/70 text-xs mt-0.5">{p.address}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-bold text-lg">{fmt(p.contract_value)}</p>
                    <p className="text-blue-400 text-xs">Contract Value</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-blue-400 text-xs mb-0.5">Total Invoiced</p>
                    <p className="text-white font-semibold text-sm">{fmt(p.total_invoiced)}</p>
                  </div>
                  <div>
                    <p className="text-blue-400 text-xs mb-0.5">Remaining</p>
                    <p className="text-white font-semibold text-sm">{fmt(Math.max(0, p.contract_value - p.total_invoiced))}</p>
                  </div>
                  <div>
                    <p className="text-blue-400 text-xs mb-0.5">Start</p>
                    <p className="text-white text-sm">{p.start_date ? new Date(p.start_date).toLocaleDateString('en-GB') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-blue-400 text-xs mb-0.5">End</p>
                    <p className="text-white text-sm">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</p>
                  </div>
                </div>
                {p.contract_value > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-blue-400 mb-1">
                      <span>% Spent</span>
                      <span className={pct > 90 ? 'text-red-400 font-semibold' : pct > 75 ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-900/30 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
