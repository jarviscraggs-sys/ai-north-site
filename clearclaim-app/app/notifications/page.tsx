'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    invoice_submitted: '📋',
    invoice_approved: '✅',
    invoice_rejected: '❌',
    invoice_queried: '❓',
    timesheet_submitted: '⏱️',
    timesheet_approved: '✅',
    holiday_requested: '🏖️',
    holiday_approved: '✅',
    compliance_expiring: '⚠️',
  };
  return map[type] || '🔔';
}

const TYPE_LABELS: Record<string, string> = {
  invoice_submitted: 'Invoice Submitted',
  invoice_approved: 'Invoice Approved',
  invoice_rejected: 'Invoice Rejected',
  invoice_queried: 'Invoice Queried',
  timesheet_submitted: 'Timesheet Submitted',
  timesheet_approved: 'Timesheet Approved',
  holiday_requested: 'Holiday Requested',
  holiday_approved: 'Holiday Approved',
  compliance_expiring: 'Compliance Expiring',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | string>('all');
  const router = useRouter();

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnreadCount(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) router.push(n.link);
  };

  // Get unique types for filter tabs
  const types = Array.from(new Set(notifications.map(n => n.type)));

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1e] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">🔔 Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-blue-300 text-sm mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 text-sm text-blue-400 hover:text-white border border-blue-900/50 rounded-xl hover:bg-blue-900/30 transition"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['all', 'unread', ...types] as string[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadCount})` : TYPE_LABELS[f] || f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-blue-300 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-blue-300">No notifications to show.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`bg-[#0a1628] border rounded-2xl p-4 cursor-pointer hover:bg-blue-900/10 transition flex gap-4 items-start ${
                  n.read ? 'border-blue-900/20 opacity-70' : 'border-blue-500/30'
                }`}
              >
                <span className="text-2xl shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-blue-300 text-sm">{n.message}</p>
                  <p className="text-blue-500 text-xs mt-2">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={e => { e.stopPropagation(); markRead(n.id); }}
                    className="text-xs text-blue-400 hover:text-white shrink-0 mt-1"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
