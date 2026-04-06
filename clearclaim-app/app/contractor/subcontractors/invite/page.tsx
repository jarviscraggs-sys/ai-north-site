'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InviteSubcontractorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ inviteLink: string; email: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    cis_rate: '20',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
        return;
      }

      setSuccess({ inviteLink: data.inviteLink, email: form.email });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-white/20 rounded-xl text-white text-sm bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-white/40";
  const labelCls = "block text-sm font-medium text-blue-200 mb-1.5";

  if (success) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invite Sent!</h1>
          <p className="text-blue-300 mb-6">
            An invite email has been sent to <strong className="text-white">{success.email}</strong>.
          </p>
          <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-blue-400 mb-2 font-semibold uppercase tracking-wide">Invite Link (share manually if needed)</p>
            <p className="text-blue-200 text-sm break-all">{success.inviteLink}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); setForm({ name: '', company: '', email: '', cis_rate: '20' }); }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition text-sm"
            >
              Send Another Invite
            </button>
            <Link
              href="/contractor/subcontractors"
              className="px-6 py-2.5 border border-white/20 text-blue-300 hover:text-white rounded-xl transition text-sm"
            >
              View Subcontractors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/contractor/subcontractors" className="text-blue-400 hover:text-blue-300 text-sm inline-block mb-3">
          ← Back to Subcontractors
        </Link>
        <h1 className="text-2xl font-bold text-white">Invite Subcontractor</h1>
        <p className="text-blue-300 mt-1 text-sm">
          Send an invite email so they can set up their ClearClaim account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <div>
          <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            required
            placeholder="e.g. Dave Smith"
            className={inputCls}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Company Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            required
            placeholder="e.g. Smith Electrical Ltd"
            className={inputCls}
            value={form.company}
            onChange={e => setForm({ ...form, company: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
          <input
            type="email"
            required
            placeholder="e.g. dave@smithelectrical.co.uk"
            className={inputCls}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>CIS Deduction Rate</label>
          <select
            className={inputCls}
            value={form.cis_rate}
            onChange={e => setForm({ ...form, cis_rate: e.target.value })}
          >
            <option value="0">0% — Not registered / Gross payment</option>
            <option value="20">20% — Standard CIS deduction</option>
            <option value="30">30% — Higher rate (unregistered)</option>
          </select>
          <p className="text-xs text-blue-400/70 mt-1">This will be their default CIS rate on invoices.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
        >
          {loading ? 'Sending Invite...' : 'Send Invite →'}
        </button>
      </form>
    </div>
  );
}
