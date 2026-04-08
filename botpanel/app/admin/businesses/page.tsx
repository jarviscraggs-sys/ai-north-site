import getDb from '@/lib/db';
import AdminBusinessesClient from './AdminBusinessesClient';

interface Business {
  id: number;
  name: string;
  type: string;
  email: string;
  phone: string | null;
  created_at: string;
  bookings_count: number;
  enquiries_count: number;
}

export default function AdminBusinessesPage() {
  const db = getDb();

  const businesses = db.prepare(`
    SELECT 
      b.id, b.name, b.type, b.email, b.phone, b.created_at,
      COUNT(DISTINCT bk.id) as bookings_count,
      COUNT(DISTINCT eq.id) as enquiries_count
    FROM businesses b
    LEFT JOIN bookings bk ON bk.business_id = b.id
    LEFT JOIN enquiries eq ON eq.business_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all() as Business[];

  return <AdminBusinessesClient businesses={businesses} />;
}
