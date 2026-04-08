'use client';

import { useEffect, useState } from 'react';

interface PlatformStats {
  totalInvoices: number;
  totalVolumeGbp: number;
  invoicesByStatus: { status: string; count: number }[];
  averageInvoiceValue: number;
  invoicesThisMonth: number;
  invoicesThisWeek: number;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/platform-stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Statistics</h1>
        <p className="text-slate-400 text-sm mt-1">Aggregate metrics only — no individual invoice data shown</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Volume cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Invoices Processed', value: stats.totalInvoices.toLocaleString(), color: 'blue' },
              { label: 'Total Platform Volume', value: fmt(stats.totalVolumeGbp), color: 'green' },
              { label: 'Average Invoice Value', value: fmt(stats.averageInvoiceValue), color: 'purple' },
              { label: 'Invoices This Month', value: stats.invoicesThisMonth.toLocaleString(), color: 'cyan' },
              { label: 'Invoices This Week', value: stats.invoicesThisWeek.toLocaleString(), color: 'yellow' },
            ].map(card => (
              <div key={card.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Invoices by Status</h2>
            <div className="space-y-3">
              {stats.invoicesByStatus.map(({ status, count }) => {
                const colours: Record<string, string> = {
                  approved: 'bg-green-500',
                  pending: 'bg-yellow-500',
                  rejected: 'bg-red-500',
                  queried: 'bg-blue-500',
                };
                const pct = stats.totalInvoices > 0 ? Math.round((count / stats.totalInvoices) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-slate-300">{status}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colours[status] || 'bg-slate-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-slate-600 text-xs">
            ℹ️ Individual invoice details, contractor names, and subcontractor data are not shown here to protect customer privacy.
          </p>
        </div>
      ) : (
        <div className="text-red-400">Failed to load stats</div>
      )}
    </div>
  );
}
