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

export default async function EmployeeDashboard() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as any;
  if (!user.employeeId) return <div className="text-red-400">Employee record not found.</div>;
  const db = getDb();

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(user.employeeId) as any;
  if (!employee) return <div className="text-red-400">Employee record not found.</div>;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().split('T')[0];

  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const hoursThisWeek = (db.prepare(`SELECT COALESCE(SUM(total_hours),0) as h FROM timesheets WHERE employee_id = ? AND week_starting = ?`).get(user.employeeId, weekStart) as any)?.h || 0;
  const hoursThisMonth = (db.prepare(`SELECT COALESCE(SUM(total_hours),0) as h FROM timesheets WHERE employee_id = ? AND week_starting >= ?`).get(user.employeeId, monthStart) as any)?.h || 0;
  const pendingTimesheets = (db.prepare(`SELECT COUNT(*) as c FROM timesheets WHERE employee_id = ? AND status = 'pending'`).get(user.employeeId) as any)?.c || 0;
  const holidayRemaining = employee.holiday_allowance - employee.holiday_used;

  const recentTimesheets = db.prepare(`
    SELECT t.*, p.name as project_name FROM timesheets t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.employee_id = ? ORDER BY t.week_starting DESC LIMIT 5
  `).all(user.employeeId) as any[];

  const upcomingHolidays = db.prepare(`
    SELECT * FROM holiday_requests WHERE employee_id = ? AND status = 'approved' AND end_date >= date('now')
    ORDER BY start_date ASC LIMIT 3
  `).all(user.employeeId) as any[];

  const statCards = [
    { label: 'Hours This Week', value: `${hoursThisWeek}h`, color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', icon: '⏱️' },
    { label: 'Hours This Month', value: `${hoursThisMonth}h`, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', icon: '📅' },
    { label: 'Holiday Remaining', value: `${holidayRemaining} days`, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', icon: '🏖️' },
    { label: 'Pending Timesheets', value: pendingTimesheets, color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', icon: '📋' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {employee.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 mt-1">{employee.role} · {employee.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-4`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-xs text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/employee/timesheets/submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
          ➕ Submit Timesheet
        </Link>
        <Link href="/employee/holidays/request" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">
          🏖️ Request Holiday
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Timesheets */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-semibold text-white">Recent Timesheets</h2>
            <Link href="/employee/timesheets" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentTimesheets.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No timesheets yet</div>
            )}
            {recentTimesheets.map((t: any) => (
              <Link key={t.id} href={`/employee/timesheets/${t.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition">
                <div>
                  <div className="text-sm font-medium text-white">w/c {new Date(t.week_starting).toLocaleDateString('en-GB')}</div>
                  <div className="text-xs text-gray-500">{t.project_name || 'No project'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">{t.total_hours}h</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-semibold text-white">Upcoming Holidays</h2>
            <Link href="/employee/holidays" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {upcomingHolidays.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No upcoming holidays</div>
            )}
            {upcomingHolidays.map((h: any) => (
              <Link key={h.id} href={`/employee/holidays/${h.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition">
                <div>
                  <div className="text-sm font-medium text-white">
                    {new Date(h.start_date).toLocaleDateString('en-GB')} → {new Date(h.end_date).toLocaleDateString('en-GB')}
                  </div>
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
