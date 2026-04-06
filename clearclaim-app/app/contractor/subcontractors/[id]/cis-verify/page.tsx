'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Verification {
  id: number;
  verified_date: string;
  hmrc_reference: string | null;
  confirmed_rate: number;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
}

export default function CISVerifyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [subcontractor, setSubcontractor] = useState<any>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    verified_date: new Date().toISOString().split('T')[0],
    hmrc_reference: '',
    confirmed_rate: '20',
    verified_by: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch subcontractor info from invoices API (reuse existing)
      const [subRes, verRes] = await Promise.all([
        fetch(`/api/subcontractors`),
        fetch(`/api/cis-verify?subcontractor_id=${id}`),
      ]);
      const subData = await subRes.json();
      const verData = await verRes.json();

      const sub = (subData.subcontractors || []).find((s: any) => String(s.id) === String(id));
      setSubcontractor(sub || null);
      setVerifications(verData.verifications || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.verified_date || form.confirmed_rate === '') {
      setError('Verified date and CIS rate are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/cis-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontractor_id: parseInt(id),
          verified_date: form.verified_date,
          hmrc_reference: form.hmrc_reference || null,
          confirmed_rate: parseInt(form.confirmed_rate),
          verified_by: form.verified_by || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setSaved(true);
      setForm({ verified_date: new Date().toISOString().split('T')[0], hmrc_reference: '', confirmed_rate: '20', verified_by: '', notes: '' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-blue-300 p-8">Loading...</div>;

  const latestVerification = verifications[0];

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/subcontractors" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">
          ← Back to Subcontractors
        </Link>
        <h1 className="text-2xl font-bold text-white">CIS Verification</h1>
        {subcontractor && (
          <p className="text-blue-300 mt-1">{subcontractor.company || subcontractor.name} · {subcontractor.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step-by-step guide */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">📞 Manual CIS Verification Process</h2>
            <p className="text-blue-300 text-sm mb-4">
              Real-time HMRC CIS verification requires government credentials. Follow these steps to verify manually:
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-white font-semibold">Call HMRC CIS Helpline</p>
                  <a href="tel:03002003210" className="text-blue-300 hover:text-white font-bold text-lg">0300 200 3210</a>
                  <p className="text-blue-400/60 text-xs mt-0.5">Lines open Mon–Fri 8am–6pm</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-white font-semibold">Have ready</p>
                  <ul className="text-blue-200 text-sm mt-1 space-y-1">
                    <li>• Your UTR (Unique Taxpayer Reference)</li>
                    <li>• Subcontractor UTR{subcontractor?.utr ? `: ${subcontractor.utr}` : ' (check subcontractor profile)'}</li>
                    <li>• Subcontractor name: <strong>{subcontractor?.name || '—'}</strong></li>
                    <li>• Subcontractor company: <strong>{subcontractor?.company || '—'}</strong></li>
                    <li>• Contract start date</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-white font-semibold">HMRC will confirm</p>
                  <ul className="text-blue-200 text-sm mt-1 space-y-1">
                    <li>• Whether the subcontractor is registered for CIS</li>
                    <li>• The CIS deduction rate: <strong>0%</strong>, <strong>20%</strong>, or <strong>30%</strong></li>
                    <li>• A verification reference number</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current CIS rate */}
            {subcontractor && (
              <div className="mt-4 bg-blue-900/30 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-400 text-xs mb-1">Current CIS Rate on Profile</p>
                <p className="text-white font-bold text-lg">{subcontractor.cis_rate ?? 20}%</p>
                {latestVerification && (
                  <p className="text-blue-400/60 text-xs mt-1">
                    Last verified: {new Date(latestVerification.verified_date).toLocaleDateString('en-GB')}
                    {latestVerification.verified_by && ` by ${latestVerification.verified_by}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Previous verifications */}
          {verifications.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Verification History</h3>
              <div className="space-y-3">
                {verifications.map(v => (
                  <div key={v.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold">{v.confirmed_rate}% CIS Rate</span>
                      <span className="text-blue-400/60 text-xs">{new Date(v.verified_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    {v.hmrc_reference && <p className="text-blue-300 text-xs">HMRC Ref: {v.hmrc_reference}</p>}
                    {v.verified_by && <p className="text-blue-400/60 text-xs">Verified by: {v.verified_by}</p>}
                    {v.notes && <p className="text-blue-200 text-xs mt-1">{v.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Record verification form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">📝 Record Verification Result</h2>

          {saved && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
              <p className="text-green-300 text-sm font-semibold">✓ Verification saved successfully</p>
              <p className="text-green-200/70 text-xs mt-1">Subcontractor CIS rate has been updated.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm text-blue-300 mb-1.5 block">Verified Date *</label>
              <input
                type="date"
                value={form.verified_date}
                onChange={e => setForm(f => ({ ...f, verified_date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-sm text-blue-300 mb-1.5 block">HMRC Reference Number</label>
              <input
                type="text"
                value={form.hmrc_reference}
                onChange={e => setForm(f => ({ ...f, hmrc_reference: e.target.value }))}
                placeholder="e.g. V12345678"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-sm text-blue-300 mb-1.5 block">Confirmed CIS Deduction Rate *</label>
              <div className="grid grid-cols-3 gap-3">
                {['0', '20', '30'].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, confirmed_rate: rate }))}
                    className={`py-3 rounded-xl border text-sm font-bold transition ${
                      form.confirmed_rate === rate
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-blue-300 hover:border-blue-500 hover:text-white'
                    }`}
                  >
                    {rate}%
                    <span className="block text-xs font-normal mt-0.5 opacity-70">
                      {rate === '0' ? 'Gross' : rate === '20' ? 'Standard' : 'Higher'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-blue-300 mb-1.5 block">Verified By (Your Name)</label>
              <input
                type="text"
                value={form.verified_by}
                onChange={e => setForm(f => ({ ...f, verified_by: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-sm text-blue-300 mb-1.5 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Verification Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
