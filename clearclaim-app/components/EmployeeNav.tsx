'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';

const navItems = [
  { href: '/employee', label: 'Dashboard', icon: '🏠', exact: true },
  { href: '/employee/timesheets', label: 'My Timesheets', icon: '📋' },
  { href: '/employee/timesheets/submit', label: 'Submit Timesheet', icon: '➕' },
  { href: '/employee/holidays', label: 'Holidays', icon: '🏖️' },
  { href: '/employee/holidays/request', label: 'Request Holiday', icon: '➕' },
  { href: '/employee/settings', label: 'Settings', icon: '⚙️' },
];

export default function EmployeeNav({ user }: { user?: any }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    if (href === '/employee/timesheets') return pathname.startsWith('/employee/timesheets') && !pathname.startsWith('/employee/timesheets/submit');
    if (href === '/employee/holidays') return pathname.startsWith('/employee/holidays') && !pathname.startsWith('/employee/holidays/request');
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d1117] border-b border-emerald-900/50 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-lg">ClearClaim</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0d1117] border-r border-emerald-900/30
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-emerald-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">ClearClaim</p>
                <p className="text-emerald-400 text-xs">Employee Portal</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="px-3 py-4 flex-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition
                ${isActive(item.href, item.exact)
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-300 hover:bg-emerald-900/40 hover:text-white'}
              `}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info + signout */}
        <div className="px-4 py-4 border-t border-emerald-900/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0] || 'E'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-emerald-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-xs text-emerald-400 hover:text-white py-2 px-3 rounded-lg hover:bg-red-900/20 transition text-left"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
