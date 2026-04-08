import getDb from '@/lib/db';

interface ActivityItem {
  type: 'signup' | 'booking';
  icon: string;
  title: string;
  subtitle: string;
  time: string;
}

export default function AdminActivityPage() {
  const db = getDb();

  // Recent signups
  const signups = db.prepare(`
    SELECT name, email, type, created_at FROM businesses
    ORDER BY created_at DESC
    LIMIT 20
  `).all() as { name: string; email: string; type: string; created_at: string }[];

  // Recent bookings (no customer message content)
  const bookings = db.prepare(`
    SELECT bk.service, bk.date, bk.time, bk.status, bk.created_at,
           b.name as business_name
    FROM bookings bk
    JOIN businesses b ON b.id = bk.business_id
    ORDER BY bk.created_at DESC
    LIMIT 20
  `).all() as { service: string; date: string; time: string; status: string; created_at: string; business_name: string }[];

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

  // Merge and sort
  const activity: ActivityItem[] = [
    ...signups.map((s) => ({
      type: 'signup' as const,
      icon: '🏢',
      title: `New business: ${s.name}`,
      subtitle: `${TYPE_LABELS[s.type] || s.type} · ${s.email}`,
      time: s.created_at,
    })),
    ...bookings.map((b) => ({
      type: 'booking' as const,
      icon: '📋',
      title: `Booking: ${b.service}`,
      subtitle: `${b.business_name} · ${b.date} at ${b.time} · ${b.status}`,
      time: b.created_at,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 40);

  function timeAgo(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Recent Activity</h1>
        <p className="text-slate-400 mt-1">Latest signups and bookings across the platform</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="divide-y divide-slate-700">
          {activity.map((item, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-700/30 transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                item.type === 'signup' ? 'bg-sky-500/10' : 'bg-violet-500/10'
              }`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.subtitle}</p>
              </div>
              <div className="text-slate-500 text-xs flex-shrink-0">{timeAgo(item.time)}</div>
            </div>
          ))}
          {activity.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
