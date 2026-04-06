import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ContractorNav from '@/components/ContractorNav';
import ChatWidget from '@/components/ChatWidget';

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'contractor') redirect('/login');

  return (
    <div className="min-h-screen bg-[#0f1f3d]">
      <ContractorNav user={session.user} />
      <main className="ml-0 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
      <ChatWidget role="contractor" />
    </div>
  );
}
