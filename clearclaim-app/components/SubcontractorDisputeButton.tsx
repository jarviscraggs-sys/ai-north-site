'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubcontractorDisputeButton({ invoiceId, invoiceNumber, amount }: {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dispute_type: 'payment', description: '', amount_disputed: String(amount) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: invoiceId,
        dispute_type: form.dispute_type,
        description: form.description,
        amount_disputed: parseFloat(form.amount_disputed) || amount,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to raise dispute');
    } else {
      setSuccess(true);
      setTimeout(() => { setOpen(false); router.refresh(); }, 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">
        ✅ Dispute raised successfully. Your contractor has been notified.
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 hover:text-red-200 text-sm font-semibold rounded-xl transition"
        >
          ⚖️ Raise a Formal Dispute
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Raise Formal Dispute</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-red-400 hover:text-red-300 text-sm">✕ Cancel</button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
            ⚠️ Under the Construction Act 1996, you have the right to raise a formal dispute. Your contractor will be notified and a pay less notice deadline will be calculated automatically.
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div>
            <label className="text-xs text-blue-400 mb-1 block">Dispute Type</label>
            <select value={form.dispute_type} onChange={e => setForm(f => ({...f, dispute_type: e.target.value}))}
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400">
              <option value="payment">Non-payment / Underpayment</option>
              <option value="quality">Dispute over Quality of Work</option>
              <option value="scope">Scope of Works Disagreement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-blue-400 mb-1 block">Amount in Dispute (£)</label>
            <input type="number" step="0.01" value={form.amount_disputed}
              onChange={e => setForm(f => ({...f, amount_disputed: e.target.value}))}
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400" />
          </div>

          <div>
            <label className="text-xs text-blue-400 mb-1 block">Description of Dispute *</label>
            <textarea required rows={4} value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="Describe why you are raising this dispute. Be specific about what you believe is owed and why..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {loading ? 'Submitting...' : '⚖️ Submit Formal Dispute'}
          </button>
        </form>
      )}
    </div>
  );
}
