import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const business = db.prepare(
    'SELECT id, name, type, phone, email, address, bot_token, system_prompt FROM businesses WHERE id = ?'
  ).get(session.businessId) as {
    id: number;
    name: string;
    type: string;
    phone: string;
    email: string;
    address: string;
    bot_token: string;
    system_prompt: string;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your business and bot configuration</p>
      </div>
      <SettingsClient business={business} />
    </div>
  );
}
