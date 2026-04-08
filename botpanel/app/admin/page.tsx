import getDb from '@/lib/db';

interface StatRow {
  count: number;
}

interface Business {
  id: number;
  name: string;
  type: string;
  email: string;
  created_at: string;
  bookings_count: number;
}

function getWeekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function getMonthAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

const TYPE_LABELS: Record<string, string> = {
  hair_beauty: 'Hair & Beauty',
  restaurant_takeaway: 'Restaurant & Takeaway',
  tradesman_contractor: 'Tradesman & Contractor',
  estate_agent: 'Estate Agent',
  gym_pt: 'Gym & PT',
  professional_services: 'Professional Services',
  other: 'Other',
  salon: 'Salon',
};

export default function AdminDashboard() {
  const db = getDb();

  const totalBusinesses = (db.prepare('SELECT COUNT(*) as count FROM businesses').get() as StatRow).count;
  const totalBookings = (db.prepare('SELECT COUNT(*) as count FROM bookings').get() as StatRow).count;
  const totalEnquiries = (db.prepare('SELECT COUNT(*) as count FROM enquiries').get() as StatRow).count;
  const newThisWeek = (db.prepare("SELECT COUNT(*) as count FROM businesses WHERE created_at >= ?").get(getWeekAgo()) as StatRow).count;

  // Active this month: businesses that have had bookings or enquiries in last 30 days
  const activeThisMonth = (db.prepare(`
    SELECT COUNT(DISTINCT business_id) as count FROM (
      SELECT business_id FROM bookings WHERE created_at >= ?
      UNION
      SELECT business_id FROM enquiries WHERE created_at >= ?
    )
  `).get(getMonthAgo(), getMonthAgo()) as StatRow).count;

  const recentSignups = db.prepare(`
    SELECT 
      b.id, b.name, b.type, b.email, b.created_at,
      COUNT(bk.id) as bookings_count
    FROM businesses b
    LEFT JOIN bookings bk ON bk.business_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all() as Business[];

  const stats = [
    { label: 'Total Businesses', value: totalBusinesses, icon: '🏢', color: 'sky' },
    { label: 'Active This Month', value: activeThisMonth, icon: '📈', color: 'green' },
    { label: 'Total Bookings', value: totalBookings, icon: '📋', color: 'violet' },
    { label: 'Total Enquiries', value: totalEnquiries, icon: '💬', color: 'amber' },
    { label: 'New This Week', value: newThisWeek, icon: '✨', color: 'pink' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of all businesses on Clayo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent signups */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
          <p className="text-sm text-slate-400">Last 10 businesses to join</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-6 py-3 font-medium">Business</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Joined</th>
                <th className="text-right px-6 py-3 font-medium">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((biz) => (
                <tr key={biz.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4 text-white font-medium">{biz.name}</td>
                  <td className="px-6 py-4 text-slate-400">{TYPE_LABELS[biz.type] || biz.type}</td>
                  <td className="px-6 py-4 text-slate-400">{biz.email}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(biz.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">{biz.bookings_count}</td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No businesses yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
