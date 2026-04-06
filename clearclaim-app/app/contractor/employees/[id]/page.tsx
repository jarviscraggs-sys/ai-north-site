import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
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

export default async function ContractorEmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session!.user as any;
  const { id } = await params;
  const db = getDb();

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!employee || employee.contractor_id !== Number(user.id)) return notFound();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const timesheets = db.prepare(`
    SELECT t.*, p.name as project_name FROM timesheets t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.employee_id = ? ORDER BY t.week_starting DESC LIMIT 10
  `).all(id) as any[];

  const holidays = db.prepare(`
    SELECT * FROM holiday_requests WHERE employee_id = ? ORDER BY start_date DESC
  `).all(id) as any[];

  const hoursThisMonth = (db.prepare(`SELECT COALESCE(SUM(total_hours),0) as h FROM timesheets WHERE employee_id = ? AND week_starting >= ?`).get(id, monthStart) as any)?.h || 0;
  const allTimesheets = db.prepare(`SELECT total_hours FROM timesheets WHERE employee_id = ? AND status = 'approved'`).all(id) as any[];
  const avgHours = allTimesheets.length > 0 ? (allTimesheets.reduce((s: number, t: any) => s + t.total_hours, 0) / allTimesheets.length).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/employees" className="text-sm text-gray-400 hover:text-white transition">← Back to Employees</Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Profile */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {employee.name[0]}
            </div>
            <div>
              <div className="text-white font-semibold">{employee.name}</div>
              <div className="text-gray-400 text-sm">{employee.role}</div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium mt-1 inline-block ${employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'}`}>
                {employee.status}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-gray-300">{employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Start Date</span>
              <span className="text-gray-300">{employee.start_date ? new Date(employee.start_date).toLocaleDateString('en-GB') : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hourly Rate</span>
              <span className="text-gray-300">{employee.hourly_rate > 0 ? `£${Number(employee.hourly_rate).toFixed(2)}` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {[
            { label: 'Hours This Month', value: `${hoursThisMonth}h`, color: 'text-blue-300' },
            { label: 'Avg Hours/Week', value: `${avgHours}h`, color: 'text-purple-300' },
            { label: 'Holidays Used', value: `${employee.holiday_used}/${employee.holiday_allowance}d`, color: 'text-emerald-300' },
          ].map(s => (
            <div key={s.label} className="bg-[#161b22] border border-white/10 rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timesheet history */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-semibold text-white">Timesheets</h2>
            <Link href={`/contractor/timesheets?employee_id=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {timesheets.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No timesheets</div>
            ) : timesheets.map((t: any) => (
              <Link key={t.id} href={`/contractor/timesheets/${t.id}`} className="flex justify-between items-center px-6 py-3 hover:bg-white/5 transition">
                <div>
                  <div className="text-sm text-white">w/c {new Date(t.week_starting).toLocaleDateString('en-GB')}</div>
                  <div className="text-xs text-gray-500">{t.project_name || 'No project'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">{t.total_hours}h</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Holiday history */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Holiday Requests</h2>
          </div>
          <div className="divide-y divide-white/5">
            {holidays.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No holiday requests</div>
            ) : holidays.map((h: any) => (
              <Link key={h.id} href={`/contractor/holidays/${h.id}`} className="flex justify-between items-center px-6 py-3 hover:bg-white/5 transition">
                <div>
                  <div className="text-sm text-white">{new Date(h.start_date).toLocaleDateString('en-GB')} → {new Date(h.end_date).toLocaleDateString('en-GB')}</div>
                  <div className="text-xs text-gray-500 capitalize">{h.type} · {h.days_requested} days</div>
                </div>
                <StatusBadge status={h.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
