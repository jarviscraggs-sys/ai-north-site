import { getDb } from '@/lib/db';
import Link from 'next/link';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SubcontractorsPage() {
  const db = getDb();

  const subcontractors = db.prepare(`
    SELECT u.id, u.name, u.company, u.email, u.created_at,
      COUNT(i.id) as invoice_count,
      SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN i.status = 'queried' THEN 1 ELSE 0 END) as queried_count,
      SUM(CASE WHEN i.status = 'approved' THEN i.amount ELSE 0 END) as total_approved_value,
      SUM(i.amount) as total_submitted_value
    FROM users u
    LEFT JOIN invoices i ON u.id = i.subcontractor_id
    WHERE u.role = 'subcontractor'
    GROUP BY u.id
    ORDER BY u.company
  `).all() as any[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subcontractors</h1>
          <p className="text-blue-300 mt-1">{subcontractors.length} registered subcontractors</p>
        </div>
        <Link
          href="/contractor/subcontractors/invite"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition"
        >
          + Invite Subcontractor
        </Link>
      </div>

      <div className="grid gap-4">
        {subcontractors.map(sub => (
          <div key={sub.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-white font-bold text-lg">{sub.company}</h2>
                <p className="text-blue-300 text-sm mt-0.5">{sub.name} · {sub.email}</p>
                <p className="text-blue-400/50 text-xs mt-1">Registered {new Date(sub.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/contractor/subcontractors/${sub.id}/cis-verify`}
                  className="text-sm text-amber-400 hover:text-white border border-amber-500/30 hover:border-amber-400 px-4 py-2 rounded-xl transition"
                >
                  🔍 CIS Verify
                </Link>
                <Link
                  href={`/contractor/subcontractors/${sub.id}`}
                  className="text-sm text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-400 px-4 py-2 rounded-xl transition"
                >
                  View Profile →
                </Link>
                <Link
                  href={`/contractor/invoices?subcontractor_id=${sub.id}`}
                  className="text-sm text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-400 px-4 py-2 rounded-xl transition"
                >
                  View Invoices →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MiniStat label="Total Invoices" value={sub.invoice_count || 0} />
              <MiniStat label="Pending" value={sub.pending_count || 0} color="amber" />
              <MiniStat label="Approved" value={sub.approved_count || 0} color="green" />
              <MiniStat label="Queried" value={sub.queried_count || 0} color="blue" />
              <MiniStat label="Rejected" value={sub.rejected_count || 0} color="red" />
              <MiniStat
                label="Approved Value"
                value={`£${((sub.total_approved_value || 0) / 1000).toFixed(0)}k`}
                color="green"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'default' }: { label: string; value: any; color?: string }) {
  const colors: Record<string, string> = {
    default: 'text-white',
    amber: 'text-amber-300',
    green: 'text-green-300',
    red: 'text-red-300',
    blue: 'text-blue-300',
  };
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-blue-400/70 mt-0.5">{label}</p>
    </div>
  );
}
