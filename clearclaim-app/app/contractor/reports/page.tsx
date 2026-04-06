'use client';
import { useEffect, useState } from 'react';
import ContractorNav from '@/components/ContractorNav';

export default function MonthlyReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, [month]);

  const fetchReport = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/monthly?month=${month}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  const fmt = (n: number) => `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  const downloadCSV = () => {
    if (!data?.bySub) return;
    const rows = [
      ['Company', 'Invoices', 'Gross', 'CIS', 'Retention', 'Net'],
      ...data.bySub.map((r: any) => [r.company, r.invoices, r.gross?.toFixed(2), r.cis?.toFixed(2), r.retention?.toFixed(2), r.net?.toFixed(2)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `clearclaim-report-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <ContractorNav user={undefined} />
      <div className="lg:ml-64 p-6 pt-16 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Monthly Report</h1>
              <p className="text-blue-400 text-sm mt-1">Invoice summary by month</p>
            </div>
            <div className="flex gap-3 items-center">
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <button onClick={downloadCSV} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition">
                ↓ CSV
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition">
                🖨 Print
              </button>
            </div>
          </div>

          {loading && <p className="text-blue-400 text-center py-12">Loading...</p>}

          {!loading && data && (
            <>
              {/* Summary cards */}
              {data.rows?.[0] && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Invoices', value: data.rows[0].invoice_count },
                    { label: 'Gross', value: fmt(data.rows[0].gross) },
                    { label: 'CIS Deducted', value: fmt(data.rows[0].cis) },
                    { label: 'Retention Held', value: fmt(data.rows[0].retention) },
                  ].map(c => (
                    <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <p className="text-xs text-blue-400 mb-1">{c.label}</p>
                      <p className="text-xl font-bold text-white">{c.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* By subcontractor */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-white font-semibold">Breakdown by Subcontractor</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Company', 'Invoices', 'Gross', 'CIS', 'Retention', 'Net'].map(h => (
                          <th key={h} className="text-left text-xs text-blue-400 font-medium px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.bySub || data.bySub.length === 0) && (
                        <tr><td colSpan={6} className="text-center text-blue-400 py-8 px-6">No invoices for this month</td></tr>
                      )}
                      {data.bySub?.map((r: any) => (
                        <tr key={r.company} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-6 py-3 text-white text-sm font-medium">{r.company}</td>
                          <td className="px-6 py-3 text-blue-300 text-sm">{r.invoices}</td>
                          <td className="px-6 py-3 text-white text-sm">{fmt(r.gross)}</td>
                          <td className="px-6 py-3 text-red-300 text-sm">{fmt(r.cis)}</td>
                          <td className="px-6 py-3 text-amber-300 text-sm">{fmt(r.retention)}</td>
                          <td className="px-6 py-3 text-green-300 text-sm font-semibold">{fmt(r.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
