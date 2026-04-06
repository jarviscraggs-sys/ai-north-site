'use client';

import { useState, useEffect, useRef } from 'react';

interface CISRow {
  subcontractor_name: string;
  subcontractor_company: string;
  subcontractor_email: string;
  cis_rate: number;
  gross_amount: number;
  cis_deducted: number;
  net_amount: number;
  invoice_count: number;
}

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function CISReturnPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<CISRow[]>([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/reports/cis?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + (r.gross_amount || 0),
      cis: acc.cis + (r.cis_deducted || 0),
      net: acc.net + (r.net_amount || 0),
    }),
    { gross: 0, cis: 0, net: 0 }
  );

  const downloadCSV = () => {
    const lines = [
      `CIS Monthly Return — ${MONTHS[month - 1]} ${year}`,
      '',
      'Subcontractor,Company,UTR,Gross Payment,CIS Rate,CIS Deducted,Net Payment',
      ...rows.map(r =>
        `"${r.subcontractor_name}","${r.subcontractor_company || ''}","",${(r.gross_amount||0).toFixed(2)},${r.cis_rate}%,${(r.cis_deducted||0).toFixed(2)},${(r.net_amount||0).toFixed(2)}`
      ),
      '',
      `TOTALS,,,,${totals.gross.toFixed(2)},,${totals.cis.toFixed(2)},${totals.net.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIS_Return_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    window.print();
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-white { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 CIS Monthly Return</h1>
          <p className="text-blue-300 mt-1 text-sm">HMRC Construction Industry Scheme — monthly summary</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 bg-[#0a1628] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 bg-[#0a1628] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition"
          >
            ⬇ CSV
          </button>
          <button
            onClick={downloadPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
          >
            🖨 PDF
          </button>
        </div>
      </div>

      <div className="mb-4 text-center print-white">
        <p className="text-blue-300 text-sm">
          Period: <strong className="text-white">{MONTHS[month - 1]} {year}</strong>
        </p>
      </div>

      <div ref={tableRef} className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden print-white">
        {loading ? (
          <div className="p-8 text-center text-blue-300 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-blue-300">No approved invoices found for {MONTHS[month - 1]} {year}.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/50">
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">Subcontractor</th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">Company</th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">UTR</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">Gross</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">CIS Rate</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">CIS Deducted</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-blue-900/20 hover:bg-blue-900/10">
                  <td className="px-4 py-3 text-white">{r.subcontractor_name}</td>
                  <td className="px-4 py-3 text-blue-200">{r.subcontractor_company || '—'}</td>
                  <td className="px-4 py-3 text-blue-400 text-xs">—</td>
                  <td className="px-4 py-3 text-white text-right font-medium">{fmt(r.gross_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-amber-400 font-semibold">{r.cis_rate}%</span>
                  </td>
                  <td className="px-4 py-3 text-red-400 text-right font-medium">{fmt(r.cis_deducted)}</td>
                  <td className="px-4 py-3 text-green-400 text-right font-semibold">{fmt(r.net_amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-blue-700/50 bg-blue-900/20">
                <td colSpan={3} className="px-4 py-3 text-blue-300 font-bold text-xs uppercase tracking-wide">TOTALS</td>
                <td className="px-4 py-3 text-white font-bold text-right">{fmt(totals.gross)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-red-300 font-bold text-right">{fmt(totals.cis)}</td>
                <td className="px-4 py-3 text-green-300 font-bold text-right">{fmt(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="mt-4 text-blue-400/60 text-xs text-center no-print">
        This summary is for reference only. Always verify figures with your accountant before filing with HMRC.
      </p>
    </div>
  );
}
