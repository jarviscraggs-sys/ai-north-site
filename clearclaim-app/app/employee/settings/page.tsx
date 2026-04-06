'use client';

import { useState, useEffect } from 'react';

export default function EmployeeSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/employees/me')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setName(data.name || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save.');
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

  if (loading) return <div className="text-blue-300 text-sm">Loading...</div>;
  if (!profile) return <div className="text-red-400">Employee record not found.</div>;

  const inputCls = "w-full px-4 py-2.5 bg-white/10 border border-white/20 text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30";
  const readOnlyCls = inputCls + " opacity-60 cursor-not-allowed";

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-blue-300 mt-1">Update your profile details</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
      {saved && <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">✅ Profile updated</div>}

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 mb-6">
        <h2 className="text-white font-semibold">Profile Details</h2>

        <div>
          <label className="block text-xs text-blue-400 mb-1.5">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-xs text-blue-400 mb-1.5">Company</label>
          <input type="text" readOnly value={profile.company || '—'} className={readOnlyCls} />
          <p className="text-xs text-blue-400/60 mt-1">Managed by your employer</p>
        </div>

        <div>
          <label className="block text-xs text-blue-400 mb-1.5">Email Address</label>
          <input type="email" readOnly value={profile.email || '—'} className={readOnlyCls} />
          <p className="text-xs text-blue-400/60 mt-1">Contact your manager to change your email</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>

        {pwError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{pwError}</div>}
        {pwSaved && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">✅ Password changed</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs text-blue-400 mb-1.5">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls} required placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs text-blue-400 mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} required placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-xs text-blue-400 mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} required placeholder="Re-enter new password" />
          </div>
          <button
            type="submit"
            disabled={pwSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
