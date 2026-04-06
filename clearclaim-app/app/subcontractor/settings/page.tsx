'use client';

import { useState, useEffect } from 'react';

export default function SubcontractorSettings() {
  const [accountantEmail, setAccountantEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setAccountantEmail(data.profile?.accountant_email || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountant_email: accountantEmail }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('Failed to save settings.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwSaving(true);
    setPwError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPwSaved(true);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setTimeout(() => setPwSaved(false), 3000);
      } else {
        const d = await res.json();
        setPwError(d.error || 'Failed to change password.');
      }
    } catch {
      setPwError('Network error.');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return <div className="text-blue-400 text-sm">Loading...</div>;
  }

  const inputCls = "w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

  return (
    <div className="max-w-lg space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-blue-300 mt-1">Manage your account and notification preferences</p>
      </div>

      {error && <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}
      {saved && <div className="p-4 bg-green-500/15 border border-green-500/40 rounded-xl text-green-300 text-sm">✅ Settings saved</div>}

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Email Notifications</h2>
        <p className="text-blue-300 text-sm">
          You will automatically receive emails when your invoices are approved, rejected, or queried.
          Add your accountant&apos;s email to CC them on approved payment certificates.
        </p>
        <div>
          <label className="block text-sm font-medium text-blue-300 mb-1.5">Accountant Email (optional)</label>
          <input
            type="email"
            value={accountantEmail}
            onChange={e => setAccountantEmail(e.target.value)}
            placeholder="accountant@firm.co.uk"
            className={inputCls}
          />
          <p className="text-xs text-blue-400/70 mt-1">
            If set, your accountant will receive a copy of all approved payment certificates.
          </p>
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* ── Change Password ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>

        {pwError && <div className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">{pwError}</div>}
        {pwSaved && <div className="mb-4 p-3 bg-green-500/15 border border-green-500/40 rounded-xl text-green-300 text-sm">✅ Password changed successfully</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1.5">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls} required placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} required placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} required placeholder="Re-enter new password" />
          </div>
          <button type="submit" disabled={pwSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
