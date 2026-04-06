'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Project { id: number; name: string; }
interface Invoice { id: number; invoice_number: string; amount: number; }

export default function SubmitVariationPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [existingVariations, setExistingVariations] = useState<{ variation_number: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    project_id: '',
    invoice_id: '',
    variation_number: '',
    description: '',
    value: '',
  });

  useEffect(() => {
    // Load projects from invoices (projects this sub has invoiced on)
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => {
        const inv = d.invoices || [];
        setInvoices(inv.map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, amount: i.amount })));
        // Extract unique projects
        const projMap = new Map<number, string>();
        for (const i of inv) {
          if (i.project_id && i.project_name) projMap.set(i.project_id, i.project_name);
        }
        setProjects(Array.from(projMap.entries()).map(([id, name]) => ({ id, name })));
      });

    // Load existing variations to suggest next number
    fetch('/api/variations')
      .then(r => r.json())
      .then(d => {
        const vars = d.variations || [];
        setExistingVariations(vars);
        // Auto-suggest next variation number
        const nums = vars.map((v: any) => {
          const match = v.variation_number.match(/V(\d+)/i);
          return match ? parseInt(match[1]) : 0;
        });
        const next = (Math.max(0, ...nums) + 1).toString().padStart(3, '0');
        setForm(f => ({ ...f, variation_number: `V${next}` }));
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/variations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: form.project_id ? parseInt(form.project_id) : null,
        invoice_id: form.invoice_id ? parseInt(form.invoice_id) : null,
        variation_number: form.variation_number,
        description: form.description,
        value: parseFloat(form.value),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to submit variation');
      setSaving(false);
      return;
    }

    router.push('/subcontractor/variations');
  };

  const inputCls = 'w-full px-3 py-2 bg-[#0f1f3d] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-blue-300 mb-1';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Submit Variation</h1>
        <p className="text-blue-300 mt-1 text-sm">Submit a change order for additional work</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Project</label>
            <select className={inputCls} value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Select Project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Link to Invoice (optional)</label>
            <select className={inputCls} value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })}>
              <option value="">— No invoice link —</option>
              {invoices.map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} — £{(i.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Variation Number *</label>
            <input
              required
              className={inputCls}
              value={form.variation_number}
              onChange={e => setForm({ ...form, variation_number: e.target.value })}
              placeholder="e.g. V001"
            />
            <p className="text-blue-500 text-xs mt-1">Auto-suggested based on previous variations</p>
          </div>

          <div>
            <label className={labelCls}>Description *</label>
            <textarea
              required
              rows={4}
              className={inputCls}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the additional work that was carried out..."
            />
          </div>

          <div>
            <label className={labelCls}>Value (£) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
            >
              {saving ? 'Submitting...' : 'Submit Variation'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/subcontractor/variations')}
              className="px-6 py-2 border border-blue-900/50 text-blue-300 hover:text-white text-sm rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
