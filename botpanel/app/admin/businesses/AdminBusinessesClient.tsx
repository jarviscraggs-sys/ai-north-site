'use client';

import { useState } from 'react';

interface Business {
  id: number;
  name: string;
  type: string;
  email: string;
  phone: string | null;
  created_at: string;
  bookings_count: number;
  enquiries_count: number;
}

const TYPE_LABELS: Record<string, string> = {
  hair_beauty: 'Hair & Beauty',
  restaurant_takeaway: 'Restaurant & Takeaway',
  tradesman_contractor: 'Tradesman & Contractor',
  estate_agent: 'Estate Agent',
  gym_pt: 'Gym & PT',
  professional_services: 'Professional Services',
  other: 'Other',
  salon: 'Salon',
};

export default function AdminBusinessesClient({ businesses }: { businesses: Business[] }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const allTypes = Array.from(new Set(businesses.map((b) => b.type)));

  const filtered = businesses.filter((b) => {
    const matchSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || b.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Businesses</h1>
        <p className="text-slate-400 mt-1">{businesses.length} businesses registered</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
        >
          <option value="">All types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-6 py-3 font-medium">Business</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Phone</th>
                <th className="text-left px-6 py-3 font-medium">Joined</th>
                <th className="text-right px-6 py-3 font-medium">Bookings</th>
                <th className="text-right px-6 py-3 font-medium">Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((biz) => (
                <tr key={biz.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4 text-white font-medium">{biz.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[biz.type] || biz.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{biz.email}</td>
                  <td className="px-6 py-4 text-slate-400">{biz.phone || '—'}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(biz.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">{biz.bookings_count}</td>
                  <td className="px-6 py-4 text-right text-slate-400">{biz.enquiries_count}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No businesses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
