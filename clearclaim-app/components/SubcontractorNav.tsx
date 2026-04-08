'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import NotificationBell from './NotificationBell';

export default function SubcontractorNav({ user }: { user?: any }) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/subcontractor', label: '📊 Dashboard', exact: true },
    { href: '/subcontractor/invoices', label: '📋 My Invoices' },
    { href: '/subcontractor/submit', label: 'Submit Invoice' },
    { href: '/subcontractor/variations', label: 'Variations' },
    { href: '/subcontractor/returns', label: 'Returns' },
    { href: '/subcontractor/compliance', label: '🛡️ Compliance' },
    { href: '/subcontractor/disputes', label: '⚖️ Disputes' },
    { href: '/subcontractor/settings', label: 'Settings' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628] border-b border-blue-900/40 shadow-lg shadow-black/20">
      <div className="max-w-5xl mx-auto px-4 py-0 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-white text-sm">ClearClaim</span>
              <span className="text-blue-400 text-xs ml-2 hidden sm:inline">Subcontractor</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive(link.href, link.exact)
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* User + sign out */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
            <p className="text-xs text-blue-400 leading-tight">{(user as any)?.company}</p>
          </div>
          {/* Avatar initial */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = '/login'; }}
            className="text-xs text-blue-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
