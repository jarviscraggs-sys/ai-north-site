import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SubcontractorNav from '@/components/SubcontractorNav';
import ChatWidget from '@/components/ChatWidget';

export default async function SubcontractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'subcontractor') redirect('/login');

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <SubcontractorNav user={session.user} />
      <main className="max-w-5xl mx-auto px-4 py-8 pt-20">
        {children}
      </main>
      <ChatWidget role="subcontractor" />
    </div>
  );
}
