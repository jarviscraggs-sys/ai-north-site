'use client';

import { useState, useEffect } from 'react';

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Payment {
  id: number;
  invoice_number: string;
  subcontractor_name: string;
  subcontractor_company: string;
  amount: number;
  cis_amount: number;
  expected_payment_date: string;
  days_until_due: number;
}

interface RetentionItem {
  id: number;
  invoice_number: string;
  subcontractor_name: string;
  subcontractor_company: string;
  retention_amount: number;
  retention_released: number;
  retention_release_date: string;
  days_until_release: number;
}

interface Summary {
  outstandingThisMonth: number;
  retentionThisMonth: number;
  next30Total: number;
  next60Total: number;
}

export default function PaymentSchedulePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [retention, setRetention] = useState<RetentionItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ outstandingThisMonth: 0, retentionThisMonth: 0, next30Total: 0, next60Total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/cashflow')
      .then(r => r.json())
      .then(d => {
        setPayments(d.upcomingPayments || []);
        setRetention(d.retentionSchedule || []);
        setSummary(d.summary || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ['Invoice', 'Subcontractor', 'Amount', 'CIS', 'Net', 'Due Date', 'Days Until Due'];
    const rows = payments.map(p => [
      p.invoice_number,
      p.subcontractor_company || p.subcontractor_name,
      p.amount.toFixed(2),
      (p.cis_amount || 0).toFixed(2),
      (p.amount - (p.cis_amount || 0)).toFixed(2),
      p.expected_payment_date,
      p.days_until_due,
    ]);

    const retHeaders = ['Invoice', 'Subcontractor', 'Retention Held', 'Release Date', 'Status'];
    const retRows = retention.map(r => [
      r.invoice_number,
      r.subcontractor_company || r.subcontractor_name,
      (r.retention_amount - (r.retention_released || 0)).toFixed(2),
      r.retention_release_date,
      r.days_until_release < 0 ? 'overdue' : r.days_until_release === 0 ? 'due today' : 'upcoming',
    ]);

    const csv = [
      'PAYMENT SCHEDULE',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      'RETENTION SCHEDULE',
      retHeaders.join(','),
      ...retRows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRetentionStatus = (r: RetentionItem) => {
    if (!r.retention_release_date) return { label: 'No date', cls: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    if (r.days_until_release < 0) return { label: 'Overdue', cls: 'bg-red-500/20 text-red-300 border-red-500/30' };
    if (r.days_until_release <= 30) return { label: 'Due soon', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { label: 'Upcoming', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  };

  const getDueStyle = (days: number) => {
    if (days < 0) return 'bg-red-500/10 border-l-2 border-red-500';
    if (days <= 7) return 'bg-amber-500/10 border-l-2 border-amber-500';
    return '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💸 Cash Flow Forecast</h1>
          <p className="text-blue-300 mt-1 text-sm">Upcoming payments and retention schedule</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Outstanding This Month</p>
          <p className="text-white font-bold text-xl">{fmt(summary.outstandingThisMonth)}</p>
        </div>
        <div className="bg-[#0a1628] border border-purple-900/30 rounded-2xl p-4">
          <p className="text-purple-400 text-xs mb-1">Retention Due This Month</p>
          <p className="text-purple-300 font-bold text-xl">{fmt(summary.retentionThisMonth)}</p>
        </div>
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Next 30 Days Total</p>
          <p className="text-white font-bold text-xl">{fmt(summary.next30Total)}</p>
        </div>
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Next 60 Days Total</p>
          <p className="text-white font-bold text-xl">{fmt(summary.next60Total)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-blue-300 text-sm">Loading cash flow data...</div>
      ) : (
        <>
          {/* Payment timeline */}
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-blue-900/30 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Payment Timeline</h2>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/50 inline-block"/><span className="text-blue-400">Overdue</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/50 inline-block"/><span className="text-blue-400">Due ≤7 days</span></span>
              </div>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-blue-400 text-sm">No upcoming payments.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/30">
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Invoice</th>
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">Amount</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">CIS</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">Net</th>
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Due Date</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const net = p.amount - (p.cis_amount || 0);
                    const style = getDueStyle(p.days_until_due);
                    return (
                      <tr key={p.id} className={`border-b border-blue-900/20 ${style}`}>
                        <td className="px-4 py-3 text-white font-mono">{p.invoice_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-white">{p.subcontractor_company || p.subcontractor_name}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-right text-red-300">-{fmt(p.cis_amount || 0)}</td>
                        <td className="px-4 py-3 text-right text-green-300 font-semibold">{fmt(net)}</td>
                        <td className="px-4 py-3 text-blue-300">{p.expected_payment_date}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${p.days_until_due < 0 ? 'text-red-300' : p.days_until_due <= 7 ? 'text-amber-300' : 'text-blue-300'}`}>
                          {p.days_until_due < 0 ? `${Math.abs(p.days_until_due)}d overdue` : `${p.days_until_due}d`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Retention schedule */}
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-900/30">
              <h2 className="text-base font-semibold text-white">Retention Schedule</h2>
            </div>
            {retention.length === 0 ? (
              <div className="p-8 text-center text-blue-400 text-sm">No retention data.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/30">
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Invoice</th>
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">Retention Held</th>
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Release Date</th>
                    <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {retention.map(r => {
                    const held = r.retention_amount - (r.retention_released || 0);
                    const { label, cls } = getRetentionStatus(r);
                    return (
                      <tr key={r.id} className="border-b border-blue-900/20 hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-mono">{r.invoice_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-white">{r.subcontractor_company || r.subcontractor_name}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-semibold">{fmt(held)}</td>
                        <td className="px-4 py-3 text-blue-300">{r.retention_release_date || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
