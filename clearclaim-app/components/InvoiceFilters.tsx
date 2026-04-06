'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export default function InvoiceFilters({ subcontractors, currentFilters }: { subcontractors: any[]; currentFilters: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState({
    status: currentFilters.status || '',
    subcontractor_id: currentFilters.subcontractor_id || '',
    date_from: currentFilters.date_from || '',
    date_to: currentFilters.date_to || '',
    amount_min: currentFilters.amount_min || '',
    amount_max: currentFilters.amount_max || '',
    flagged: currentFilters.flagged || '',
    job_code: currentFilters.job_code || '',
  });

  const apply = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`${pathname}?${params.toString()}`);
  };

  const clear = () => {
    setFilters({ status: '', subcontractor_id: '', date_from: '', date_to: '', amount_min: '', amount_max: '', flagged: '', job_code: '' });
    router.push(pathname);
  };

  const inputCls = "bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full placeholder-white/30";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className={inputCls}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="queried">Queried</option>
        </select>

        <select value={filters.subcontractor_id} onChange={e => setFilters(p => ({ ...p, subcontractor_id: e.target.value }))} className={inputCls}>
          <option value="">All Subcontractors</option>
          {subcontractors.map(s => (
            <option key={s.id} value={s.id}>{s.company}</option>
          ))}
        </select>

        <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} placeholder="From date" className={inputCls} />
        <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} placeholder="To date" className={inputCls} />

        <select value={filters.flagged} onChange={e => setFilters(p => ({ ...p, flagged: e.target.value }))} className={inputCls}>
          <option value="">All Invoices</option>
          <option value="true">AI Flagged Only</option>
        </select>

        <input
          type="text"
          value={filters.job_code}
          onChange={e => setFilters(p => ({ ...p, job_code: e.target.value }))}
          placeholder="Job code filter..."
          className={inputCls}
        />

        <div className="flex gap-2">
          <button onClick={apply} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition">
            Filter
          </button>
          <button onClick={clear} className="px-3 py-2 text-blue-400 hover:text-white text-sm rounded-lg hover:bg-white/10 transition">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
