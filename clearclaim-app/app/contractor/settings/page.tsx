'use client';

import { useState, useEffect, useRef } from 'react';

export default function ContractorSettings() {
  // Profile / notifications state
  const [accountantEmail, setAccountantEmail] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Branding state
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  // Login history
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  useEffect(() => {
    // Load profile
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setAccountantEmail(data.profile?.accountant_email || '');
        setCompany(data.profile?.company || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load contractor profile (for logo)
    fetch('/api/contractor/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.logo_path) setLogoPath(data.profile.logo_path);
        if (data.profile?.company) setCompany(data.profile.company);
      })
      .catch(() => {});

    // Load login history from audit log
    fetch('/api/audit?action=login&limit=5')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.entries)) setLoginHistory(data.entries);
      })
      .catch(() => {});
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setBrandError('Logo must be under 2MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setBrandError('');
  };

  const handleBrandSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandSaving(true);
    setBrandError('');
    try {
      const formData = new FormData();
      formData.append('company', company);
      if (logoFile) formData.append('logo', logoFile);

      const res = await fetch('/api/contractor/profile', {
        method: 'PATCH',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.logo_path) {
          setLogoPath(data.profile.logo_path + '?t=' + Date.now());
          setLogoFile(null);
          setLogoPreview(null);
        }
        setBrandSaved(true);
        setTimeout(() => setBrandSaved(false), 3000);
      } else {
        const d = await res.json();
        setBrandError(d.error || 'Failed to save branding.');
      }
    } catch {
      setBrandError('Network error.');
    } finally {
      setBrandSaving(false);
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
    return <div className="text-blue-300 text-sm">Loading...</div>;
  }

  const inputCls = "w-full px-4 py-2.5 bg-white/10 border border-white/20 text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30";

  return (
    <div className="max-w-lg space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-blue-300 mt-1">Manage your account and notification preferences</p>
      </div>

      {/* ── Email Notifications ── */}
      {error && <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
      {saved && <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">✅ Settings saved</div>}

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Email Notifications</h2>
        <p className="text-blue-300 text-sm">
          You will automatically receive emails when invoices are submitted.
          Add your accountant&apos;s email to CC them on approved payment certificates.
        </p>
        <div>
          <label className="block text-xs text-blue-400 mb-1.5">Accountant Email (optional)</label>
          <input
            type="email"
            value={accountantEmail}
            onChange={e => setAccountantEmail(e.target.value)}
            placeholder="accountant@firm.co.uk"
            className={inputCls}
          />
          <p className="text-xs text-blue-400/60 mt-1">
            If set, your accountant will receive a copy of all approved payment certificates.
          </p>
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* ── Company Branding ── */}
      {brandError && <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{brandError}</div>}
      {brandSaved && <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">✅ Branding saved</div>}

      <form onSubmit={handleBrandSave} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Company Branding</h2>
        <p className="text-blue-300 text-sm">Your company logo will appear on payment certificate PDFs.</p>

        <div>
          <label className="block text-xs text-blue-400 mb-1.5">Company Name</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Your company name"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-blue-400 mb-3">Company Logo</label>

          {/* Current/Preview logo */}
          {(logoPreview || logoPath) && (
            <div className="mb-3 p-3 bg-white/5 border border-white/10 rounded-xl inline-block">
              <p className="text-xs text-blue-400 mb-2">{logoPreview ? 'Preview:' : 'Current logo:'}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview || logoPath || ''}
                alt="Company logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm rounded-xl transition"
            >
              📁 {logoPath ? 'Change Logo' : 'Upload Logo'}
            </button>
            <p className="text-xs text-blue-400/60 mt-1">Max 2MB. JPG, PNG, GIF, or WebP.</p>
          </div>
        </div>

        <button type="submit" disabled={brandSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {brandSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </form>

      {/* ── Change Password ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>

        {pwError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{pwError}</div>}
        {pwSaved && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">✅ Password changed successfully</div>}

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
          <button type="submit" disabled={pwSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* ── Security (2FA stub + Login History) ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-semibold">Security</h2>

        {/* 2FA stub */}
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div>
            <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
            <p className="text-blue-400/60 text-xs mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg font-medium">
              Coming Soon
            </span>
            {/* Toggle stub - disabled */}
            <button
              type="button"
              disabled
              className="w-10 h-5 bg-white/10 rounded-full relative cursor-not-allowed opacity-50"
              title="Coming soon"
            >
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white/40 rounded-full transition" />
            </button>
          </div>
        </div>

        {/* Login history */}
        <div>
          <p className="text-white text-sm font-medium mb-3">Recent Login Activity</p>
          {loginHistory.length > 0 ? (
            <div className="space-y-2">
              {loginHistory.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-blue-300">{log.detail || 'Signed in'}</span>
                  </div>
                  <span className="text-blue-400/60">
                    {new Date(log.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-blue-400/60 text-xs">No login history recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
