'use client';
import { useEffect, useState } from 'react';
import SubcontractorNav from '@/components/SubcontractorNav';

const DOC_TYPES = [
  { value: 'public_liability', label: 'Public Liability Insurance' },
  { value: 'employers_liability', label: 'Employers Liability Insurance' },
  { value: 'professional_indemnity', label: 'Professional Indemnity Insurance' },
  { value: 'cscs', label: 'CSCS Card' },
  { value: 'cis_registration', label: 'CIS Registration' },
  { value: 'vat_registration', label: 'VAT Registration' },
  { value: 'other', label: 'Other Document' },
];

export default function SubCompliancePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_type: 'public_liability', document_name: '', expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    const res = await fetch('/api/compliance?mine=1');
    const data = await res.json();
    setDocs(data.compliance || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to save');
    } else {
      setShowForm(false);
      setForm({ document_type: 'public_liability', document_name: '', expiry_date: '', notes: '' });
      fetchDocs();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this document?')) return;
    await fetch(`/api/compliance/${id}`, { method: 'DELETE' });
    fetchDocs();
  };

  const statusBadge = (status: string) => {
    const s: Record<string, string> = {
      valid: 'bg-green-500/20 text-green-300 border-green-500/30',
      expiring_soon: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      expired: 'bg-red-500/20 text-red-300 border-red-500/30',
      missing: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    return s[status] || s.missing;
  };

  const daysUntilExpiry = (date: string) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <SubcontractorNav />
      <div className="lg:ml-0 p-6 pt-20 lg:pt-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Compliance Documents</h1>
            <p className="text-blue-400 text-sm mt-1">Keep your insurance and certifications up to date</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition">
            + Add Document
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
            <h2 className="text-white font-semibold">Add Compliance Document</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-blue-400 mb-1 block">Document Type</label>
                <select value={form.document_type} onChange={e => setForm(f => ({...f, document_type: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-blue-400 mb-1 block">Document Name / Reference</label>
                <input required value={form.document_name} onChange={e => setForm(f => ({...f, document_name: e.target.value}))}
                  placeholder="e.g. Aviva Policy #12345"
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-blue-400 mb-1 block">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({...f, expiry_date: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-blue-400 mb-1 block">Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Document'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition">Cancel</button>
            </div>
          </form>
        )}

        {/* Guidance banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-blue-200 text-sm font-medium">Keep your documents up to date</p>
            <p className="text-blue-300/70 text-xs mt-0.5">Your contractor can see your compliance status. Make sure your insurance, CSCS and CIS registration are current to avoid delays to payments.</p>
          </div>
        </div>

        {loading && <p className="text-blue-400 text-center py-12">Loading...</p>}

        {!loading && docs.length === 0 && (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="text-white font-semibold mb-1">No documents added yet</p>
            <p className="text-blue-400 text-sm">Add your insurance certificates, CSCS card and CIS registration</p>
          </div>
        )}

        <div className="space-y-3">
          {docs.map((doc: any) => {
            const days = daysUntilExpiry(doc.expiry_date);
            const typeLabel = DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type;
            return (
              <div key={doc.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{doc.document_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusBadge(doc.status)}`}>
                      {doc.status === 'expiring_soon' ? 'Expiring Soon' : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-blue-400 text-xs">{typeLabel}</p>
                  {doc.expiry_date && (
                    <p className={`text-xs mt-1 ${days !== null && days < 30 ? 'text-amber-400' : days !== null && days < 0 ? 'text-red-400' : 'text-blue-400/60'}`}>
                      {days !== null && days < 0 ? `⚠️ Expired ${Math.abs(days)} days ago` :
                       days !== null && days <= 30 ? `⚠️ Expires in ${days} days (${doc.expiry_date})` :
                       `Expires: ${doc.expiry_date}`}
                    </p>
                  )}
                  {doc.notes && <p className="text-blue-400/50 text-xs mt-1">{doc.notes}</p>}
                </div>
                <button onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition">
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
