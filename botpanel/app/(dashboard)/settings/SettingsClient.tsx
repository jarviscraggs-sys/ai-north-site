'use client';

import { useState } from 'react';

interface Business {
  id: number;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  bot_token: string;
  system_prompt: string;
}

export default function SettingsClient({ business: initial }: { business: Business }) {
  const [business, setBusiness] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: business.name,
          type: business.type,
          phone: business.phone,
          address: business.address,
          system_prompt: business.system_prompt,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof Business, value: string) {
    setBusiness((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Details */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Business Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
              <input
                type="text"
                value={business.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Type</label>
              <select
                value={business.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="salon">Hair Salon</option>
                <option value="restaurant">Restaurant</option>
                <option value="tradesman">Tradesman</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={business.phone || ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="07700 900000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={business.email}
                disabled
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
              <input
                type="text"
                value={business.address || ''}
                onChange={(e) => update('address', e.target.value)}
                placeholder="14 High Street, Sunderland SR1 3AA"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bot Configuration */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Bot Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Bot Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={business.bot_token || 'Not configured'}
                  readOnly
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 text-sm font-mono cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(business.bot_token || '')}
                  className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1">Get a bot token from @BotFather on Telegram</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">System Prompt</label>
              <textarea
                value={business.system_prompt || ''}
                onChange={(e) => update('system_prompt', e.target.value)}
                rows={8}
                placeholder="You are a helpful assistant for..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                This instructs the AI how to behave. Include your services, prices, opening hours, and location.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm">
            ✓ Settings saved successfully
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
