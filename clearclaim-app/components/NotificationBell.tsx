'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleViewportChange() {
      setOpen(false);
    }

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

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

  const resolveLink = (link: string): string => {
    // Fix legacy short links that are missing the portal prefix
    const shortPaths = ['/invoices', '/timesheets', '/employees', '/subcontractors', '/holidays', '/projects', '/compliance', '/disputes', '/variations'];
    for (const short of shortPaths) {
      if (link === short || link.startsWith(short + '/')) {
        // Determine portal from current pathname
        const path = window.location.pathname;
        if (path.startsWith('/contractor')) return '/contractor' + link;
        if (path.startsWith('/subcontractor')) return '/subcontractor' + link;
        if (path.startsWith('/employee')) return '/employee' + link;
      }
    }
    return link;
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(resolveLink(n.link));
  };

  const displayed = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            setDropdownPos({
              top: rect.bottom + 8,
              left: Math.max(8, rect.right - 320),
            });
          }
          setOpen(true);
        }}
        className="relative p-2 rounded-lg hover:bg-white/10 transition text-white"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed w-80 bg-[#0a1628] border border-blue-900/40 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-900/30">
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-white transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="px-4 py-8 text-center text-blue-400 text-sm">
                No notifications yet
              </div>
            ) : (
              displayed.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-blue-900/20 hover:bg-blue-900/20 transition flex gap-3 items-start ${n.read ? 'opacity-60' : ''}`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-xs font-semibold truncate">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-blue-300 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-blue-500 text-xs mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-blue-900/30">
            <button
              onClick={() => { setOpen(false); router.push('/notifications'); }}
              className="text-xs text-blue-400 hover:text-white transition w-full text-center"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
