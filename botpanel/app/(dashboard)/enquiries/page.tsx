import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';
import EnquiriesClient from './EnquiriesClient';

export default async function EnquiriesPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const enquiries = db.prepare(
    'SELECT * FROM enquiries WHERE business_id = ? ORDER BY created_at DESC'
  ).all(session.businessId) as {
    id: number;
    customer_name: string;
    customer_phone: string;
    message: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Enquiries</h1>
        <p className="text-slate-400 mt-1">Customer messages and questions</p>
      </div>
      <EnquiriesClient enquiries={enquiries} />
    </div>
  );
}
