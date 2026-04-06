'use client';

import { useState, useEffect } from 'react';

interface Invoice {
  id: number;
  invoice_number: string;
  subcontractor_name: string;
  subcontractor_company: string;
  amount: number;
  vat_amount: number;
  cis_amount: number;
  reviewed_at: string;
  paid_date?: string;
  work_from: string;
  work_to: string;
}

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentsPage() {
  const [unpaid, setUnpaid] = useState<Invoice[]>([]);
  const [paid, setPaid] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/payments')
      .then(r => r.json())
      .then(d => {
        setUnpaid(d.unpaid || []);
        setPaid(d.paid || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unpaid.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unpaid.map(i => i.id)));
    }
  };

  const processPaymentRun = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    setMessage('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Payment run complete — ${data.count} invoice${data.count > 1 ? 's' : ''} marked as paid (${data.paid_date})`);
        setSelected(new Set());
        load();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const selectedTotal = unpaid
    .filter(i => selected.has(i.id))
    .reduce((sum, i) => sum + (i.amount || 0) - (i.cis_amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💳 Payment Runs</h1>
          <p className="text-blue-300 mt-1 text-sm">Process payments for approved invoices</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-500/20 border border-green-500/30 text-green-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>
          {message}
        </div>
      )}

      {/* Unpaid section */}
      <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-900/30">
          <h2 className="text-white font-semibold">Awaiting Payment</h2>
          {selected.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-blue-300 text-sm">{selected.size} selected · {fmt(selectedTotal)} net</span>
              <button
                onClick={processPaymentRun}
                disabled={processing}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {processing ? 'Processing...' : '💳 Process Payment Run'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-blue-300 text-sm">Loading...</div>
        ) : unpaid.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-blue-300">No invoices awaiting payment.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === unpaid.length && unpaid.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Subcontractor</th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Gross</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">CIS</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Net Due</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => toggle(inv.id)}
                  className={`border-b border-blue-900/20 cursor-pointer transition ${selected.has(inv.id) ? 'bg-blue-700/20' : 'hover:bg-blue-900/10'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggle(inv.id)}
                      onClick={e => e.stopPropagation()}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{inv.subcontractor_company || inv.subcontractor_name}</p>
                    {inv.subcontractor_company && <p className="text-blue-400 text-xs">{inv.subcontractor_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-blue-300 text-xs">
                    {inv.work_from ? new Date(inv.work_from).toLocaleDateString('en-GB') : '—'}
                    {' – '}
                    {inv.work_to ? new Date(inv.work_to).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3 text-white text-right">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-red-400 text-right text-xs">−{fmt(inv.cis_amount || 0)}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold text-right">{fmt((inv.amount || 0) - (inv.cis_amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paid section */}
      {paid.length > 0 && (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-900/30">
            <h2 className="text-white font-semibold">Recently Paid</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Subcontractor</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Net Paid</th>
                <th className="text-right px-4 py-3 text-blue-400 text-xs uppercase tracking-wide">Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {paid.map(inv => (
                <tr key={inv.id} className="border-b border-blue-900/20">
                  <td className="px-4 py-3 text-white font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-blue-200">{inv.subcontractor_company || inv.subcontractor_name}</td>
                  <td className="px-4 py-3 text-green-400 text-right font-semibold">{fmt((inv.amount || 0) - (inv.cis_amount || 0))}</td>
                  <td className="px-4 py-3 text-blue-300 text-right text-xs">
                    <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full text-xs">
                      ✓ {inv.paid_date ? new Date(inv.paid_date).toLocaleDateString('en-GB') : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
