import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';

interface DashboardData {
  stats: {
    totalBookings: number;
    todayBookings: number;
    newEnquiries: number;
    totalCustomers: number;
  };
  todayBookings: {
    id: number;
    time: string;
    customer_name: string;
    service: string;
    status: string;
    customer_phone: string;
  }[];
  recentEnquiries: {
    id: number;
    customer_name: string;
    customer_phone: string;
    message: string;
    status: string;
    created_at: string;
  }[];
  business: {
    name: string;
    bot_token: string | null;
  };
}

function statusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const totalBookings = (db.prepare('SELECT COUNT(*) as c FROM bookings WHERE business_id = ?').get(session.businessId) as { c: number }).c;
  const todayBookings = (db.prepare("SELECT COUNT(*) as c FROM bookings WHERE business_id = ? AND date = ?").get(session.businessId, today) as { c: number }).c;
  const newEnquiries = (db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE business_id = ? AND status = 'new'").get(session.businessId) as { c: number }).c;
  const totalCustomers = (db.prepare("SELECT COUNT(DISTINCT customer_name) as c FROM bookings WHERE business_id = ?").get(session.businessId) as { c: number }).c;

  const todayBookingList = db.prepare(
    "SELECT id, time, customer_name, service, status, customer_phone FROM bookings WHERE business_id = ? AND date = ? ORDER BY time ASC"
  ).all(session.businessId, today) as DashboardData['todayBookings'];

  const recentEnquiries = db.prepare(
    "SELECT id, customer_name, customer_phone, message, status, created_at FROM enquiries WHERE business_id = ? ORDER BY created_at DESC LIMIT 5"
  ).all(session.businessId) as DashboardData['recentEnquiries'];

  const business = db.prepare("SELECT name, bot_token FROM businesses WHERE id = ?").get(session.businessId) as DashboardData['business'];

  const stats = { totalBookings, todayBookings, newEnquiries, totalCustomers };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{business.name}</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${business.bot_token ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
          <span className={`w-2 h-2 rounded-full ${business.bot_token ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
          {business.bot_token ? 'Bot Active' : 'Bot Inactive'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Bookings" value={stats.totalBookings} icon="📋" color="blue" />
        <StatCard title="Today's Bookings" value={stats.todayBookings} icon="📅" color="green" />
        <StatCard title="New Enquiries" value={stats.newEnquiries} icon="💬" color="yellow" />
        <StatCard title="Total Customers" value={stats.totalCustomers} icon="👥" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bookings */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Today's Appointments</h2>
            <p className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="p-6 space-y-3">
            {todayBookingList.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No appointments today</p>
            ) : (
              todayBookingList.map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-sm font-mono text-slate-300 w-12 shrink-0">{booking.time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{booking.customer_name}</p>
                    <p className="text-slate-400 text-xs">{booking.service}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border capitalize ${statusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Enquiries */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Recent Enquiries</h2>
            <p className="text-sm text-slate-400 mt-1">Latest messages from customers</p>
          </div>
          <div className="p-6 space-y-3">
            {recentEnquiries.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No enquiries yet</p>
            ) : (
              recentEnquiries.map((enq) => (
                <div key={enq.id} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium text-sm">{enq.customer_name}</p>
                    {enq.status === 'new' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">New</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs line-clamp-2">{enq.message}</p>
                  <p className="text-slate-600 text-xs mt-1">{new Date(enq.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-600/30',
    green: 'from-green-600/20 to-green-600/5 border-green-600/30',
    yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-600/30',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-600/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-6`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{title}</p>
    </div>
  );
}
