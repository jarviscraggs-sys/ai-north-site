import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';
import BookingsClient from './BookingsClient';

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const bookings = db.prepare(
    'SELECT * FROM bookings WHERE business_id = ? ORDER BY date DESC, time DESC'
  ).all(session.businessId) as {
    id: number;
    customer_name: string;
    customer_phone: string;
    service: string;
    date: string;
    time: string;
    notes: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-slate-400 mt-1">Manage all your customer appointments</p>
      </div>
      <BookingsClient bookings={bookings} />
    </div>
  );
}
