'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';

const navSections = [
  {
    label: 'Invoices',
    items: [
      { href: '/contractor', label: 'Dashboard', icon: '📊', exact: true },
      { href: '/contractor/invoices', label: 'Invoices', icon: '📋' },
      { href: '/contractor/invoices/import', label: 'Import Invoices', icon: '📥' },
      { href: '/contractor/variations', label: 'Variations', icon: '📝' },
      { href: '/contractor/disputes', label: 'Disputes', icon: '⚖️' },
      { href: '/contractor/retention', label: 'Retention', icon: '🔒' },
    ],
  },
  {
    label: 'Subcontractors',
    items: [
      { href: '/contractor/subcontractors', label: 'Subcontractors', icon: '👷' },
      { href: '/contractor/compliance', label: 'Compliance', icon: '🛡️' },
      { href: '/contractor/projects', label: 'Projects', icon: '🏗️' },
    ],
  },
  {
    label: 'HR',
    items: [
      { href: '/contractor/employees', label: 'Employees', icon: '👤' },
      { href: '/contractor/timesheets', label: 'Timesheets', icon: '⏱️' },
      { href: '/contractor/timesheets/payroll', label: 'Payroll', icon: '💰' },
      { href: '/contractor/holidays', label: 'Holidays', icon: '🏖️' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/contractor/payments', label: 'Payments', icon: '💳' },
      { href: '/contractor/payments/schedule', label: 'Cash Flow', icon: '💸' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/contractor/reports', label: 'Monthly Reports', icon: '📈' },
      { href: '/contractor/reports/cis', label: 'CIS Return', icon: '🧾' },
      { href: '/contractor/audit', label: 'Audit Log', icon: '📋' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/contractor/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function ContractorNav({ user }: { user?: any }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a1628] border-b border-blue-900/50 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-lg">ClearClaim</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0a1628] border-r border-blue-900/30 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-blue-900/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">ClearClaim</p>
                <p className="text-blue-400 text-xs">Contractor Portal</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="px-3 py-4 flex-1 overflow-y-auto">
          {navSections.map((section, sIdx) => (
            <div key={section.label} className={sIdx > 0 ? 'mt-4' : ''}>
              {/* Section label + divider */}
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-500/60 whitespace-nowrap">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-blue-900/40" />
              </div>

              {/* Section items */}
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition
                    ${isActive(item.href, item.exact)
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-300 hover:bg-blue-900/40 hover:text-white'}
                  `}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User info + signout */}
        <div className="px-4 py-4 border-t border-blue-900/30 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-blue-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = '/login'; }}
            className="w-full text-xs text-blue-400 hover:text-white py-2 px-3 rounded-lg hover:bg-red-900/20 transition text-left"
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
