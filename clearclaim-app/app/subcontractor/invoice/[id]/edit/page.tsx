import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import EditInvoiceForm from './EditInvoiceForm';

export const dynamic = 'force-dynamic';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND subcontractor_id = ?').get(id, user.id) as any;
  if (!invoice) notFound();

  if (!['queried', 'rejected'].includes(invoice.status)) {
    redirect(`/subcontractor/invoice/${id}`);
  }

  const jobLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id) as any[];
  const attachments = db.prepare('SELECT * FROM attachments WHERE invoice_id = ?').all(id) as any[];

  // Parse queried line keys from reviewer_comment
  // Format: "Queried lines: JOB-001/Block A, JOB-003/Roof | Query: ..."
  const queriedLineKeys = new Set<string>();
  if (invoice.status === 'queried' && invoice.reviewer_comment) {
    const match = invoice.reviewer_comment.match(/^Queried lines: ([^|]+)/);
    if (match) {
      const linePart = match[1].trim();
      if (!linePart.startsWith('General query')) {
        linePart.split(',').forEach((seg: string) => {
          queriedLineKeys.add(seg.trim().toLowerCase());
        });
      }
    }
  }

  // Extract just the human-readable query message for the banner
  let queryDisplay = invoice.reviewer_comment || 'No reason provided.';
  if (invoice.reviewer_comment) {
    const qMatch = invoice.reviewer_comment.match(/\| Query: (.+)$/);
    if (qMatch) queryDisplay = qMatch[1];
  }

  return (
    <div>
      <div className="mb-6">
        <a href={`/subcontractor/invoice/${id}`} className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block">
          ← Back to Invoice
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Invoice</h1>
        <p className="text-gray-500 mt-1">Update your invoice and resubmit for review</p>
      </div>

      {/* Reason banner */}
      <div className={`mb-6 p-4 rounded-2xl border ${invoice.status === 'queried' ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-200'}`}>
        <p className={`text-xs font-semibold mb-1 ${invoice.status === 'queried' ? 'text-amber-700' : 'text-red-600'}`}>
          {invoice.status === 'queried' ? '❓ QUERY FROM CONTRACTOR' : '✗ REJECTION REASON'}
        </p>
        <p className={`text-sm ${invoice.status === 'queried' ? 'text-amber-800' : 'text-red-800'}`}>
          {queryDisplay}
        </p>
        {queriedLineKeys.size > 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            ⚠️ Lines highlighted in amber below are being queried — please review and update them.
          </p>
        )}
      </div>

      <EditInvoiceForm
        invoiceId={parseInt(id)}
        invoice={invoice}
        existingLines={jobLines}
        existingAttachments={attachments}
        queriedLineKeys={Array.from(queriedLineKeys)}
      />
    </div>
  );
}
