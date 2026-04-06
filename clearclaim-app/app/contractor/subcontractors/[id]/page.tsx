'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface SubProfile {
  id: number;
  name: string;
  company: string;
  email: string;
  cis_rate: number;
  utr: string;
}

interface ComplianceItem {
  id: number;
  document_type: string;
  document_name: string;
  expiry_date: string;
  status: string;
  notes: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  submitted_at: string;
}

const DOC_TYPES = [
  { value: 'public_liability', label: 'Public Liability' },
  { value: 'employers_liability', label: 'Employers Liability' },
  { value: 'professional_indemnity', label: 'Professional Indemnity' },
  { value: 'cscs', label: 'CSCS Card' },
  { value: 'cis_registration', label: 'CIS Registration' },
  { value: 'vat_registration', label: 'VAT Registration' },
  { value: 'other', label: 'Other' },
];

const DOC_TYPE_MAP: Record<string, string> = Object.fromEntries(DOC_TYPES.map(d => [d.value, d.label]));

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    valid: 'bg-green-500/20 text-green-300 border-green-500/30',
    expiring_soon: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    expired: 'bg-red-500/20 text-red-300 border-red-500/30',
    missing: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    queried: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function SubcontractorProfilePage() {
  const params = useParams();
  const subId = params?.id as string;

  const [sub, setSub] = useState<SubProfile | null>(null);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompliance, setShowAddCompliance] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaultForm = {
    document_type: 'public_liability',
    document_name: '',
    expiry_date: '',
    notes: '',
  };
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState(defaultForm);

  const loadCompliance = useCallback(() => {
    fetch(`/api/compliance?subcontractor_id=${subId}`)
      .then(r => r.json())
      .then(d => setCompliance(d.compliance || []));
  }, [subId]);

  useEffect(() => {
    if (!subId) return;

    // Load subcontractor profile
    fetch(`/api/subcontractors?id=${subId}`)
      .then(r => r.json())
      .then(d => {
        // Find sub from list
        const list = d.subcontractors || [];
        const found = list.find((s: any) => String(s.id) === subId);
        setSub(found || null);
      });

    // Load invoices
    fetch(`/api/invoices?subcontractor_id=${subId}`)
      .then(r => r.json())
      .then(d => setInvoices((d.invoices || []).slice(0, 10)));

    // Load compliance
    loadCompliance();

    setLoading(false);
  }, [subId, loadCompliance]);

  const handleAddCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcontractor_id: parseInt(subId), ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to add'); setSaving(false); return; }
    setShowAddCompliance(false);
    setForm(defaultForm);
    setSaving(false);
    loadCompliance();
  };

  const handleEditCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/compliance/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
    setEditingId(null);
    setSaving(false);
    loadCompliance();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this compliance document?')) return;
    await fetch(`/api/compliance/${id}`, { method: 'DELETE' });
    loadCompliance();
  };

  const inputCls = 'w-full px-3 py-2 bg-[#0f1f3d] border border-blue-900/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-blue-300 mb-1';

  const totalApproved = invoices.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0);
  const totalSubmitted = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/subcontractors" className="text-blue-400 hover:text-white text-sm">
          ← Back to Subcontractors
        </Link>
      </div>

      {loading ? (
        <div className="text-blue-300 text-sm">Loading...</div>
      ) : !sub ? (
        <div className="text-blue-300">Subcontractor not found.</div>
      ) : (
        <>
          {/* Profile */}
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{sub.company || sub.name}</h1>
                <p className="text-blue-300 text-sm mt-1">{sub.name} · {sub.email}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-blue-400 text-xs">CIS Rate</p>
                <p className="text-white font-bold">{sub.cis_rate || 20}%</p>
              </div>
            </div>
            {sub.utr && (
              <p className="text-blue-400 text-xs mt-2">UTR: {sub.utr}</p>
            )}
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0a1628] border border-green-900/30 rounded-2xl p-4">
              <p className="text-green-400 text-xs mb-1">Total Approved</p>
              <p className="text-green-300 font-bold text-xl">{fmt(totalApproved)}</p>
            </div>
            <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
              <p className="text-blue-400 text-xs mb-1">Total Submitted</p>
              <p className="text-white font-bold text-xl">{fmt(totalSubmitted)}</p>
            </div>
          </div>

          {/* Compliance Panel */}
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">🛡️ Compliance Documents</h2>
              <button
                onClick={() => setShowAddCompliance(!showAddCompliance)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
              >
                + Add Document
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}

            {showAddCompliance && (
              <form onSubmit={handleAddCompliance} className="mb-6 p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-3">Add Compliance Document</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Document Type *</label>
                    <select required className={inputCls} value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}>
                      {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Document Name *</label>
                    <input required className={inputCls} value={form.document_name} onChange={e => setForm({ ...form, document_name: e.target.value })} placeholder="e.g. AXA Policy 12345" />
                  </div>
                  <div>
                    <label className={labelCls}>Expiry Date</label>
                    <input type="date" className={inputCls} value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Notes</label>
                    <input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setShowAddCompliance(false)} className="px-4 py-1.5 border border-blue-900/50 text-blue-400 text-xs rounded-lg transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {compliance.length === 0 ? (
              <p className="text-blue-400 text-sm">No compliance documents added yet.</p>
            ) : (
              <div className="space-y-2">
                {compliance.map(item => (
                  <div key={item.id}>
                    {editingId === item.id ? (
                      <form onSubmit={handleEditCompliance} className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className={labelCls}>Document Type</label>
                            <select className={inputCls} value={editForm.document_type} onChange={e => setEditForm({ ...editForm, document_type: e.target.value })}>
                              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Document Name</label>
                            <input className={inputCls} value={editForm.document_name} onChange={e => setEditForm({ ...editForm, document_name: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Expiry Date</label>
                            <input type="date" className={inputCls} value={editForm.expiry_date} onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Notes</label>
                            <input className={inputCls} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="px-4 py-1.5 border border-blue-900/50 text-blue-400 text-xs rounded-lg transition">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-white text-sm font-medium">{item.document_name}</p>
                            <p className="text-blue-400 text-xs">{DOC_TYPE_MAP[item.document_type] || item.document_type}</p>
                          </div>
                          {item.expiry_date && (
                            <div>
                              <p className="text-blue-400 text-xs">Expires</p>
                              <p className="text-white text-xs">{new Date(item.expiry_date).toLocaleDateString('en-GB')}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {statusBadge(item.status)}
                          <button
                            onClick={() => { setEditingId(item.id); setEditForm({ document_type: item.document_type, document_name: item.document_name, expiry_date: item.expiry_date || '', notes: item.notes || '' }); }}
                            className="text-xs text-blue-400 hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice History */}
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-900/30">
              <h2 className="text-base font-semibold text-white">Recent Invoices (last 10)</h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-blue-400 text-sm">No invoices submitted.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/30">
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Invoice #</th>
                    <th className="text-right text-blue-400 font-medium px-4 py-3">Amount</th>
                    <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
                    <th className="text-left text-blue-400 font-medium px-4 py-3">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-blue-900/20 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-mono">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-right text-white font-semibold">{fmt(inv.amount)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-blue-400 text-xs">{new Date(inv.submitted_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3">
                        <Link href={`/contractor/invoice/${inv.id}`} className="text-xs text-blue-400 hover:text-white">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
