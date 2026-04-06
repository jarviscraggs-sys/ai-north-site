'use client';

import { useEffect, useState, useCallback } from 'react';

type Tab = 'cis' | 'vat' | 'retention';

function fmt(n: number | null | undefined) {
  return `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctFmt(n: number | null | undefined) {
  return `${Number(n || 0).toFixed(1)}%`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReturnsPage() {
  const [tab, setTab] = useState<Tab>('cis');
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/subcontractor/returns?type=${tab}&month=${month}`);
      const d = await res.json();
      setData(d);
    } catch {
      setData({ error: 'Failed to load data' });
    }
    setLoading(false);
  }, [tab, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'cis',       label: 'CIS Return',         icon: '🏛️' },
    { id: 'vat',       label: 'VAT Return',          icon: '📊' },
    { id: 'retention', label: 'Retention Summary',   icon: '🔒' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Monthly Returns</h1>
        <p className="text-blue-300 text-sm mt-1">CIS, VAT and retention summaries for your records</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-blue-300 hover:bg-white/10 hover:text-white'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Month selector */}
      {tab !== 'retention' && (
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm font-medium text-blue-300">Month:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-blue-400">Loading...</div>
      )}

      {!loading && data && (
        <>
          {tab === 'cis'       && <CISSection data={data} month={month} />}
          {tab === 'vat'       && <VATSection data={data} month={month} />}
          {tab === 'retention' && <RetentionSection data={data} />}
        </>
      )}
    </div>
  );
}

// ── CIS Return Section ──────────────────────────────────────────────────────

function CISSection({ data, month }: { data: any; month: string }) {
  const rows: any[] = data.rows ?? [];
  const totalGross = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalCIS   = rows.reduce((s, r) => s + (r.cis_amount ?? 0), 0);
  const totalNet   = rows.reduce((s, r) => s + ((r.amount ?? 0) - (r.cis_amount ?? 0)), 0);

  const handleCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Gross (£)', 'CIS Rate (%)', 'CIS Deducted (£)', 'Net (£)'];
    const body = rows.map(r => [
      r.invoice_number,
      new Date(r.submitted_at).toLocaleDateString('en-GB'),
      (r.amount ?? 0).toFixed(2),
      (r.cis_rate ?? 0).toString(),
      (r.cis_amount ?? 0).toFixed(2),
      ((r.amount ?? 0) - (r.cis_amount ?? 0)).toFixed(2),
    ]);
    const totals = ['TOTALS', '', totalGross.toFixed(2), '', totalCIS.toFixed(2), totalNet.toFixed(2)];
    downloadCSV([headers, ...body, totals], `cis-return-${month}.csv`);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-white">CIS Deductions — {month}</h2>
          <p className="text-xs text-blue-400 mt-0.5">Construction Industry Scheme summary</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCSV}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition">
            ↓ Download CSV
          </button>
          <button onClick={() => window.print()}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition">
            🖨 Print / PDF
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-blue-400 text-sm">No approved invoices for this month</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  {['Invoice #', 'Date', 'Gross', 'CIS Rate', 'CIS Deducted', 'Net Payable'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-blue-400 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3 font-medium text-blue-300">{r.invoice_number}</td>
                    <td className="px-5 py-3 text-blue-300/70">{new Date(r.submitted_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3 text-white">{fmt(r.amount)}</td>
                    <td className="px-5 py-3 text-blue-400">{pctFmt(r.cis_rate)}</td>
                    <td className="px-5 py-3 text-red-400 font-medium">{fmt(r.cis_amount)}</td>
                    <td className="px-5 py-3 text-green-400 font-semibold">{fmt((r.amount ?? 0) - (r.cis_amount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/5 border-t border-white/20">
                <tr>
                  <td colSpan={2} className="px-5 py-3 font-bold text-white">Totals</td>
                  <td className="px-5 py-3 font-bold text-white">{fmt(totalGross)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 font-bold text-red-400">{fmt(totalCIS)}</td>
                  <td className="px-5 py-3 font-bold text-green-400">{fmt(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-6 py-4 bg-blue-500/10 border-t border-blue-500/20">
            <p className="text-sm text-blue-300">
              <strong className="text-white">Total CIS deducted this month: {fmt(totalCIS)}.</strong>{' '}
              Keep this for your Self Assessment tax return. Your contractor should provide a CIS deduction statement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── VAT Return Section ──────────────────────────────────────────────────────

function VATSection({ data, month }: { data: any; month: string }) {
  const rows: any[] = data.rows ?? [];
  const totalNet = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalVAT = rows.reduce((s, r) => s + (r.vat_amount ?? 0), 0);

  const handleCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Net Amount (£)', 'VAT Rate (%)', 'VAT Amount (£)'];
    const body = rows.map(r => [
      r.invoice_number,
      new Date(r.submitted_at).toLocaleDateString('en-GB'),
      (r.amount ?? 0).toFixed(2),
      (r.vat_rate ?? 20).toString(),
      (r.vat_amount ?? 0).toFixed(2),
    ]);
    const totals = ['TOTALS', '', totalNet.toFixed(2), '', totalVAT.toFixed(2)];
    downloadCSV([headers, ...body, totals], `vat-return-${month}.csv`);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-white">VAT Summary — {month}</h2>
          <p className="text-xs text-blue-400 mt-0.5">VAT on approved invoices</p>
        </div>
        <button onClick={handleCSV}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition">
          ↓ Download CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-blue-400 text-sm">No VAT invoices for this month</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  {['Invoice #', 'Date', 'Net Amount', 'VAT Rate', 'VAT Amount'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-blue-400 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3 font-medium text-blue-300">{r.invoice_number}</td>
                    <td className="px-5 py-3 text-blue-300/70">{new Date(r.submitted_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3 text-white">{fmt(r.amount)}</td>
                    <td className="px-5 py-3 text-blue-400">{pctFmt(r.vat_rate ?? 20)}</td>
                    <td className="px-5 py-3 text-purple-400 font-medium">{fmt(r.vat_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/5 border-t border-white/20">
                <tr>
                  <td colSpan={2} className="px-5 py-3 font-bold text-white">Totals</td>
                  <td className="px-5 py-3 font-bold text-white">{fmt(totalNet)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 font-bold text-purple-400">{fmt(totalVAT)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-6 py-4 bg-purple-500/10 border-t border-purple-500/20">
            <p className="text-sm text-purple-300">
              <strong className="text-white">Total VAT on approved invoices this month: {fmt(totalVAT)}.</strong>{' '}
              Use this when completing your VAT return with HMRC.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Retention Summary Section ───────────────────────────────────────────────

function RetentionSection({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  const today = new Date();

  const totalHeld        = rows.reduce((s, r) => s + (r.retention_amount ?? 0), 0);
  const totalReleased    = rows.reduce((s, r) => s + (r.retention_released ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + ((r.retention_amount ?? 0) - (r.retention_released ?? 0)), 0);
  const totalOverdue     = rows
    .filter(r => r.retention_release_date && new Date(r.retention_release_date) < today && (r.retention_amount - r.retention_released) > 0)
    .reduce((s, r) => s + (r.retention_amount - r.retention_released), 0);

  const handleCSV = () => {
    const headers = ['Invoice #', 'Date', 'Gross (£)', 'Retention Rate (%)', 'Retention Held (£)', 'Released (£)', 'Outstanding (£)', 'Due Date'];
    const body = rows.map(r => [
      r.invoice_number,
      new Date(r.submitted_at).toLocaleDateString('en-GB'),
      (r.amount ?? 0).toFixed(2),
      (r.retention_rate ?? 0).toString(),
      (r.retention_amount ?? 0).toFixed(2),
      (r.retention_released ?? 0).toFixed(2),
      ((r.retention_amount ?? 0) - (r.retention_released ?? 0)).toFixed(2),
      r.retention_release_date ? new Date(r.retention_release_date).toLocaleDateString('en-GB') : 'TBC',
    ]);
    downloadCSV([headers, ...body], 'retention-summary.csv');
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RetCard label="Total Held" value={fmt(totalHeld)} color="amber" />
        <RetCard label="Total Released" value={fmt(totalReleased)} color="green" />
        <RetCard label="Outstanding" value={fmt(totalOutstanding)} color="blue" />
        <RetCard label="Overdue" value={fmt(totalOverdue)} color={totalOverdue > 0 ? 'red' : 'blue'} />
      </div>

      {totalOverdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/15 border-red-500/40 text-red-300 text-sm font-medium">
          🚨 You have {fmt(totalOverdue)} in overdue retention that should have been released.
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-white">Retention Breakdown</h2>
          <button onClick={handleCSV}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition">
            ↓ Download CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-blue-400 text-sm">No retention held on any invoices</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  {['Invoice #', 'Date', 'Gross', 'Ret. Rate', 'Held', 'Released', 'Outstanding', 'Due Date'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-blue-400 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => {
                  const outstanding = (r.retention_amount ?? 0) - (r.retention_released ?? 0);
                  const isOverdue = r.retention_release_date && new Date(r.retention_release_date) < today && outstanding > 0;
                  return (
                    <tr key={i} className={`hover:bg-white/5 transition ${isOverdue ? 'bg-red-500/10' : ''}`}>
                      <td className="px-5 py-3 font-medium text-blue-300">
                        {r.invoice_number}
                        {isOverdue && <span className="ml-2 text-xs text-red-400 font-normal">⚠ overdue</span>}
                      </td>
                      <td className="px-5 py-3 text-blue-300/70">{new Date(r.submitted_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-5 py-3 text-white">{fmt(r.amount)}</td>
                      <td className="px-5 py-3 text-blue-400">{pctFmt(r.retention_rate)}</td>
                      <td className="px-5 py-3 text-amber-400">{fmt(r.retention_amount)}</td>
                      <td className="px-5 py-3 text-green-400">{fmt(r.retention_released)}</td>
                      <td className={`px-5 py-3 font-medium ${outstanding > 0 ? 'text-white' : 'text-blue-400/50'}`}>{fmt(outstanding)}</td>
                      <td className={`px-5 py-3 text-xs ${isOverdue ? 'text-red-400 font-semibold' : 'text-blue-400/70'}`}>
                        {r.retention_release_date ? new Date(r.retention_release_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-white/5 border-t border-white/20">
                <tr>
                  <td colSpan={4} className="px-5 py-3 font-bold text-white">Totals</td>
                  <td className="px-5 py-3 font-bold text-amber-400">{fmt(totalHeld)}</td>
                  <td className="px-5 py-3 font-bold text-green-400">{fmt(totalReleased)}</td>
                  <td className="px-5 py-3 font-bold text-white">{fmt(totalOutstanding)}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RetCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    green: 'border-green-500/30 bg-green-500/10 text-green-300',
    red:   'border-red-500/30 bg-red-500/10 text-red-300',
    blue:  'border-blue-500/30 bg-blue-500/10 text-blue-300',
  };
  const cls = colors[color] ?? colors.blue;
  const [border, bg, text] = cls.split(' ');
  return (
    <div className={`border rounded-xl p-4 ${border} ${bg}`}>
      <p className={`text-xl font-bold text-white`}>{value}</p>
      <p className={`text-xs mt-1 ${text}`}>{label}</p>
    </div>
  );
}
