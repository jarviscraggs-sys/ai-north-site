import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import ContractorNav from '@/components/ContractorNav';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();

  const entries = db.prepare(`
    SELECT a.*, i.invoice_number
    FROM audit_log a
    LEFT JOIN invoices i ON a.invoice_id = i.id
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all() as any[];

  const actionIcon: Record<string, string> = {
    submitted: '📤',
    approved: '✅',
    rejected: '❌',
    queried: '❓',
    resubmitted: '🔄',
    pdf_downloaded: '📄',
    retention_released: '🔓',
  };

  const actionColor: Record<string, string> = {
    submitted: 'text-blue-300',
    approved: 'text-green-300',
    rejected: 'text-red-300',
    queried: 'text-amber-300',
    resubmitted: 'text-purple-300',
    pdf_downloaded: 'text-blue-200',
    retention_released: 'text-teal-300',
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <ContractorNav user={user} />
      <div className="lg:ml-64 p-6 pt-16 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-blue-400 text-sm mt-1">Full history of all actions across all invoices</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-blue-400 text-sm">{entries.length} entries</p>
            </div>
            <div className="divide-y divide-white/5">
              {entries.length === 0 && (
                <p className="text-blue-400 text-center py-12">No audit entries yet.</p>
              )}
              {entries.map((e: any) => (
                <div key={e.id} className="px-6 py-4 flex items-start gap-4">
                  <span className="text-xl mt-0.5">{actionIcon[e.action] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${actionColor[e.action] || 'text-white'}`}>
                        {e.action.charAt(0).toUpperCase() + e.action.slice(1).replace('_', ' ')}
                      </span>
                      {e.invoice_number && (
                        <a href={`/contractor/invoice/${e.invoice_id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                          {e.invoice_number}
                        </a>
                      )}
                      <span className="text-blue-400/60 text-xs">by {e.user_name}</span>
                    </div>
                    {e.detail && <p className="text-blue-300/70 text-xs mt-1">{e.detail}</p>}
                  </div>
                  <span className="text-blue-400/50 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
