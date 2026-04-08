'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  type: 'invoice' | 'signup';
  id: number;
  label: string;
  sub: string;
  time: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

export default function AdminActivityPage() {
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/invoices').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
    ]).then(([invData, usrData]) => {
      const invoices = (invData.invoices || []).slice(0, 20);
      const users = (usrData.users || []).slice(0, 20);

      setRecentInvoices(invoices);
      setRecentUsers(users);

      // Build combined feed
      const invItems: ActivityItem[] = invoices.map((inv: any) => ({
        type: 'invoice' as const,
        id: inv.id,
        label: `Invoice ${inv.invoice_number}`,
        sub: `${inv.subcontractor_name || 'Unknown'} — £${inv.amount.toFixed(2)}`,
        time: inv.submitted_at,
        icon: '📋',
        badge: inv.status,
        badgeColor:
          inv.status === 'approved'
            ? 'text-green-400'
            : inv.status === 'rejected'
            ? 'text-red-400'
            : inv.status === 'queried'
            ? 'text-orange-400'
            : 'text-yellow-400',
      }));

      const userItems: ActivityItem[] = users.map((u: any) => ({
        type: 'signup' as const,
        id: u.id,
        label: `New signup: ${u.name}`,
        sub: `${u.role} — ${u.email}`,
        time: u.created_at,
        icon: '👤',
        badge: u.role,
        badgeColor:
          u.role === 'contractor'
            ? 'text-blue-400'
            : u.role === 'subcontractor'
            ? 'text-green-400'
            : 'text-purple-400',
      }));

      const combined = [...invItems, ...userItems].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setFeed(combined);
    }).finally(() => setLoading(false));
  }, []);

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="text-slate-400 mt-1">Recent activity across the platform</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Combined feed */}
        <div className="xl:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Combined Activity Feed</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {loading ? (
              <div className="px-6 py-8 text-center text-slate-400">Loading...</div>
            ) : feed.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400">No activity yet</div>
            ) : (
              feed.map((item, i) => (
                <div key={`${item.type}-${item.id}-${i}`} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-700/30 transition-colors">
                  <div className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-xl text-lg flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      {item.badge && (
                        <span className={`text-xs capitalize ${item.badgeColor}`}>({item.badge})</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                  </div>
                  <p className="text-slate-500 text-xs flex-shrink-0">{formatTime(item.time)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Recent invoices */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white">Recent Invoices</h2>
            </div>
            <div className="divide-y divide-slate-700 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-4 text-slate-400 text-sm">Loading...</div>
              ) : recentInvoices.length === 0 ? (
                <div className="px-4 py-4 text-slate-400 text-sm">None yet</div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{inv.invoice_number}</p>
                    <p className="text-slate-400 text-xs">
                      £{inv.amount.toFixed(2)} · {inv.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent signups */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white">Recent Signups</h2>
            </div>
            <div className="divide-y divide-slate-700 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-4 text-slate-400 text-sm">Loading...</div>
              ) : recentUsers.length === 0 ? (
                <div className="px-4 py-4 text-slate-400 text-sm">None yet</div>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{u.name}</p>
                    <p className="text-slate-400 text-xs capitalize">
                      {u.role} · {u.email}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
