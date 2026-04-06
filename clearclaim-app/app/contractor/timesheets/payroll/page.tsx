'use client';

import { useState, useEffect, useCallback } from 'react';

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: d.toISOString().split('T')[0].substring(0, 7), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) });
  }
  return options;
}

export default function PayrollPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const monthOptions = getMonthOptions();

  const load = useCallback(async () => {
    setLoading(true);
    // Get all employees and their approved timesheets for the month
    const [emps, ts] = await Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/timesheets?status=approved`).then(r => r.json()),
    ]);

    if (!Array.isArray(emps) || !Array.isArray(ts)) { setLoading(false); return; }

    const monthTs = (ts as any[]).filter(t => t.week_starting && t.week_starting.startsWith(month));

    const rows = (emps as any[]).map(emp => {
      const empTs = monthTs.filter(t => t.employee_id === emp.id);
      const totalHours = empTs.reduce((s: number, t: any) => s + t.total_hours, 0);
      const regularHours = Math.min(totalHours, empTs.length * 40); // approx: max 40/week
      const overtimeHours = Math.max(0, totalHours - regularHours);
      const hourlyRate = emp.hourly_rate || 0;
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const totalPay = regularPay + overtimePay;
      return { ...emp, totalHours, regularHours, overtimeHours, regularPay, overtimePay, totalPay };
    }).filter(r => r.totalHours > 0 || true);

    setData(rows);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const totals = data.reduce((acc, r) => ({
    totalHours: acc.totalHours + r.totalHours,
    regularHours: acc.regularHours + r.regularHours,
    overtimeHours: acc.overtimeHours + r.overtimeHours,
    regularPay: acc.regularPay + r.regularPay,
    overtimePay: acc.overtimePay + r.overtimePay,
    totalPay: acc.totalPay + r.totalPay,
  }), { totalHours: 0, regularHours: 0, overtimeHours: 0, regularPay: 0, overtimePay: 0, totalPay: 0 });

  const downloadCSV = () => {
    const headers = ['Employee', 'Role', 'Regular Hours', 'Overtime Hours', 'Hourly Rate', 'Regular Pay', 'Overtime Pay (1.5x)', 'Total Pay'];
    const rows = data.map(r => [
      r.name, r.role, r.regularHours, r.overtimeHours,
      `£${r.hourly_rate}`, `£${r.regularPay.toFixed(2)}`, `£${r.overtimePay.toFixed(2)}`, `£${r.totalPay.toFixed(2)}`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payroll Summary</h1>
          <p className="text-gray-400 text-sm mt-1">Monthly payroll based on approved timesheets</p>
        </div>
        <button onClick={downloadCSV} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition">
          ⬇ Download CSV
        </button>
      </div>

      <div className="mb-6">
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="px-4 py-2.5 bg-[#161b22] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                {['Employee', 'Regular Hrs', 'OT Hrs', 'Rate', 'Regular Pay', 'OT Pay (1.5x)', 'Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.role}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.regularHours}h</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.overtimeHours > 0 ? <span className="text-amber-300">{row.overtimeHours}h</span> : '0h'}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.hourly_rate > 0 ? fmtMoney(row.hourly_rate) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.regularPay > 0 ? fmtMoney(row.regularPay) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.overtimePay > 0 ? <span className="text-amber-300">{fmtMoney(row.overtimePay)}</span> : '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{row.totalPay > 0 ? fmtMoney(row.totalPay) : '—'}</td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot className="border-t-2 border-blue-500/50 bg-blue-900/10">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-white">TOTAL</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{totals.regularHours}h</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-300">{totals.overtimeHours}h</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{fmtMoney(totals.regularPay)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-300">{fmtMoney(totals.overtimePay)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-white text-lg">{fmtMoney(totals.totalPay)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-600">Note: Overtime calculated at 1.5x hourly rate. Overtime hours = total hours &gt; 40/week per employee.</p>
    </div>
  );
}
