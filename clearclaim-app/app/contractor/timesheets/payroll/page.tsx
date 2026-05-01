'use client';

import { useState, useEffect, useCallback } from 'react';

interface TimesheetRow {
  id: number;
  employee_id: number;
  week_starting: string;
  total_hours: number;
  employee_name: string;
  employee_role: string | null;
  employee_hourly_rate: number | null;
}

interface PayrollRow {
  id: number;
  name: string;
  role: string;
  hourly_rate: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  grossPayForPaye: number;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: d.toISOString().split('T')[0].substring(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

function getPayeForGross(gross: number) {
  const employeeIncomeTax = 0.2 * Math.max(0, gross - 1048);
  const employeeNi =
    0.08 * Math.max(0, Math.min(gross, 4189) - 1048) +
    0.02 * Math.max(0, gross - 4189);
  const employerNi = 0.138 * Math.max(0, gross - 758);
  return { employeeIncomeTax, employeeNi, employerNi };
}

export default function PayrollPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const monthOptions = getMonthOptions();

  const load = useCallback(async () => {
    setLoading(true);
    const ts = await fetch('/api/timesheets?status=approved').then((r) => r.json());

    if (!Array.isArray(ts)) {
      setLoading(false);
      return;
    }

    const monthTs = (ts as TimesheetRow[]).filter(
      (t) => typeof t.week_starting === 'string' && t.week_starting.startsWith(month)
    );

    const grouped = new Map<number, PayrollRow>();
    for (const t of monthTs) {
      const employeeId = Number(t.employee_id);
      const hourlyRate = Number(t.employee_hourly_rate || 0);
      const totalHours = Number(t.total_hours || 0);

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          id: employeeId,
          name: t.employee_name || `Employee #${employeeId}`,
          role: t.employee_role || 'employee',
          hourly_rate: hourlyRate,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          totalPay: 0,
          grossPayForPaye: 0,
        });
      }

      const row = grouped.get(employeeId)!;
      row.totalHours += totalHours;
    }

    const rows = Array.from(grouped.values())
      .map((row) => {
        const regularHours = Math.min(row.totalHours, 40 * 4);
        const overtimeHours = Math.max(0, row.totalHours - regularHours);
        const regularPay = regularHours * row.hourly_rate;
        const overtimePay = overtimeHours * row.hourly_rate * 1.5;
        const totalPay = regularPay + overtimePay;
        const grossPayForPaye = row.totalHours * row.hourly_rate;

        return {
          ...row,
          regularHours,
          overtimeHours,
          regularPay,
          overtimePay,
          totalPay,
          grossPayForPaye,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setData(rows);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data.reduce(
    (acc, r) => ({
      totalHours: acc.totalHours + r.totalHours,
      regularHours: acc.regularHours + r.regularHours,
      overtimeHours: acc.overtimeHours + r.overtimeHours,
      regularPay: acc.regularPay + r.regularPay,
      overtimePay: acc.overtimePay + r.overtimePay,
      totalPay: acc.totalPay + r.totalPay,
    }),
    { totalHours: 0, regularHours: 0, overtimeHours: 0, regularPay: 0, overtimePay: 0, totalPay: 0 }
  );

  const payeLineItems = data.reduce(
    (acc, row) => {
      const gross = row.grossPayForPaye;
      const { employeeIncomeTax, employeeNi, employerNi } = getPayeForGross(gross);
      return {
        grossWages: acc.grossWages + gross,
        employeeTax: acc.employeeTax + employeeIncomeTax,
        employeeNi: acc.employeeNi + employeeNi,
        employerNi: acc.employerNi + employerNi,
      };
    },
    { grossWages: 0, employeeTax: 0, employeeNi: 0, employerNi: 0 }
  );

  const employmentAllowanceApplied = Math.min(payeLineItems.employerNi, 416.67);
  const netPayeLiability =
    payeLineItems.employeeTax +
    payeLineItems.employeeNi +
    payeLineItems.employerNi -
    employmentAllowanceApplied;

  const downloadCSV = () => {
    const headers = [
      'Employee',
      'Role',
      'Regular Hours',
      'Overtime Hours',
      'Hourly Rate',
      'Regular Pay',
      'Overtime Pay (1.5x)',
      'Total Pay',
    ];
    const rows = data.map((r) => [
      r.name,
      r.role,
      r.regularHours,
      r.overtimeHours,
      `£${r.hourly_rate}`,
      `£${r.regularPay.toFixed(2)}`,
      `£${r.overtimePay.toFixed(2)}`,
      `£${r.totalPay.toFixed(2)}`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
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
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
        >
          ⬇ Download CSV
        </button>
      </div>

      <div className="mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-4 py-2.5 bg-[#161b22] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                {['Employee', 'Regular Hrs', 'OT Hrs', 'Rate', 'Regular Pay', 'OT Pay (1.5x)', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.role}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{row.regularHours}h</td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {row.overtimeHours > 0 ? <span className="text-amber-300">{row.overtimeHours}h</span> : '0h'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {row.hourly_rate > 0 ? fmtMoney(row.hourly_rate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {row.regularPay > 0 ? fmtMoney(row.regularPay) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {row.overtimePay > 0 ? <span className="text-amber-300">{fmtMoney(row.overtimePay)}</span> : '—'}
                  </td>
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
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-sm font-semibold text-white">{fmtMoney(totals.regularPay)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-300">{fmtMoney(totals.overtimePay)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-white text-lg">{fmtMoney(totals.totalPay)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="mt-6 bg-[#161b22] border border-blue-500/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wide mb-4">
          PAYE Liability Summary (2024/25 monthly thresholds)
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-300">
            <span>Total gross wages</span>
            <span className="font-medium text-white">{fmtMoney(payeLineItems.grossWages)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Employee income tax deducted</span>
            <span className="font-medium text-white">{fmtMoney(payeLineItems.employeeTax)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Employee NI deducted</span>
            <span className="font-medium text-white">{fmtMoney(payeLineItems.employeeNi)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Employer NI</span>
            <span className="font-medium text-white">{fmtMoney(payeLineItems.employerNi)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Employment Allowance applied</span>
            <span className="font-medium text-emerald-300">-{fmtMoney(employmentAllowanceApplied)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-500/25 flex items-center justify-between">
          <span className="text-base font-semibold text-white">Net PAYE Liability due to HMRC</span>
          <span className="text-xl font-bold text-amber-300">{fmtMoney(netPayeLiability)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Note: Overtime is shown at 1.5x for payroll display. PAYE liability uses HMRC monthly thresholds and gross pay
        at base hourly rate.
      </p>
    </div>
  );
}
