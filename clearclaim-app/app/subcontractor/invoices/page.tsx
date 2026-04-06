import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: 'Pending',  color: 'text-amber-300',  bg: 'bg-amber-500/20 border-amber-500/30',  dot: 'bg-amber-400'  },
  approved: { label: 'Approved', color: 'text-green-300',  bg: 'bg-green-500/20 border-green-500/30',  dot: 'bg-green-400'  },
  rejected: { label: 'Rejected', color: 'text-red-300',    bg: 'bg-red-500/20 border-red-500/30',      dot: 'bg-red-400'    },
  queried:  { label: 'Queried',  color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/30',dot: 'bg-orange-400' },
};

export default async function SubcontractorInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();
  const userId = parseInt(user.id);

  const params = await searchParams;
  const filterStatus = params?.status || 'all';
  const search = params?.q || '';

  const allInvoices = db.prepare(`
    SELECT * FROM invoices
    WHERE subcontractor_id = ?
    ORDER BY submitted_at DESC
  `).all(userId) as any[];

  // Count per status
  const counts: Record<string, number> = { all: allInvoices.length };
  for (const inv of allInvoices) {
    counts[inv.status] = (counts[inv.status] || 0) + 1;
  }

  // Filter
  let filtered = allInvoices;
  if (filterStatus !== 'all') {
    filtered = filtered.filter(i => i.status === filterStatus);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(i =>
      i.invoice_number?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }

  const tabs = ['all', 'pending', 'approved', 'queried', 'rejected'];

  function fmt(n: number) {
    return `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Invoices</h1>
          <p className="text-blue-300 mt-1">{allInvoices.length} invoice{allInvoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/subcontractor/submit"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm transition"
        >
          + Submit Invoice
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(tab => {
          const isActive = filterStatus === tab;
          const cfg = statusConfig[tab];
          const count = counts[tab] || 0;
          return (
            <Link
              key={tab}
              href={`/subcontractor/invoices?status=${tab}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-white/5 text-blue-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="capitalize">{tab === 'all' ? 'All' : cfg?.label || tab}</span>
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-blue-300'
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="GET" action="/subcontractor/invoices" className="mb-5">
        <input type="hidden" name="status" value={filterStatus} />
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm">🔍</span>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by invoice number..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg transition">
            Go
          </button>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-semibold">No invoices found</p>
          <p className="text-blue-400/60 text-sm mt-1">
            {filterStatus !== 'all' ? `No ${filterStatus} invoices` : 'Submit your first invoice to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-blue-400 font-medium px-5 py-3">Invoice #</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Description</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Amount</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-xs text-blue-400 font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const cfg = statusConfig[inv.status] || statusConfig.pending;
                  return (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3">
                        <Link href={`/subcontractor/invoice/${inv.id}`} className="text-blue-300 hover:text-white font-medium text-sm">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-blue-200 text-sm max-w-[200px] truncate">
                        {inv.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-blue-300 text-sm">
                        {new Date(inv.submitted_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {fmt(inv.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/subcontractor/invoice/${inv.id}`} className="text-xs text-blue-400 hover:text-white transition">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
