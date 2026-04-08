import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const bookings = db.prepare(
    'SELECT id, customer_name, customer_phone, service, date, time, status FROM bookings WHERE business_id = ? ORDER BY date ASC, time ASC'
  ).all(session.businessId) as {
    id: number;
    customer_name: string;
    customer_phone: string;
    service: string;
    date: string;
    time: string;
    status: string;
  }[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-slate-400 mt-1">Monthly overview of all appointments</p>
      </div>
      <CalendarClient bookings={bookings} />
    </div>
  );
}
