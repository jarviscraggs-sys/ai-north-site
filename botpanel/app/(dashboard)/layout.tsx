import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar businessName={session.businessName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
