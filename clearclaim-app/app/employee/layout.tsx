import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmployeeNav from '@/components/EmployeeNav';
import ChatWidget from '@/components/ChatWidget';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'employee') redirect('/login');

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <EmployeeNav user={session.user} />
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
      <ChatWidget role="employee" />
    </div>
  );
}
