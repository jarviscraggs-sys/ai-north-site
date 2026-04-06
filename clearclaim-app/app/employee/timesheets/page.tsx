import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    rejected: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status}
    </span>
  );
}

export const dynamic = 'force-dynamic';

export default async function EmployeeTimesheetsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as any;
  const db = getDb();

  const timesheets = db.prepare(`
    SELECT t.*, p.name as project_name FROM timesheets t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.employee_id = ?
    ORDER BY t.week_starting DESC
  `).all(user.employeeId) as any[];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Timesheets</h1>
          <p className="text-gray-400 text-sm mt-1">{timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/employee/timesheets/submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
          ➕ Submit Timesheet
        </Link>
      </div>

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {timesheets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-400">No timesheets yet. Submit your first one!</p>
            <Link href="/employee/timesheets/submit" className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
              Submit Timesheet
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Week Starting</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {timesheets.map((t: any) => (
                <tr key={t.id} className="hover:bg-white/5 transition cursor-pointer">
                  <td className="px-6 py-3">
                    <Link href={`/employee/timesheets/${t.id}`} className="block text-white text-sm font-medium">
                      {new Date(t.week_starting).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-300">{t.total_hours}h {t.total_hours > 40 ? <span className="text-amber-400 text-xs">⚠️ OT</span> : ''}</td>
                  <td className="px-6 py-3 text-sm text-gray-400">{t.project_name || '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-6 py-3 text-sm text-gray-400 truncate max-w-xs">{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
