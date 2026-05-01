import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SubcontractorDisputeButton from '@/components/SubcontractorDisputeButton';

export const dynamic = 'force-dynamic';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending Review',        color: 'text-amber-300',  bg: 'bg-amber-500/20 border-amber-500/30',  icon: '⏳' },
  approved: { label: 'Approved',             color: 'text-green-300',  bg: 'bg-green-500/20 border-green-500/30',  icon: '✅' },
  rejected: { label: 'Rejected',             color: 'text-red-300',    bg: 'bg-red-500/20 border-red-500/30',      icon: '✗' },
  queried:  { label: 'Queried — Action Req.',color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/30',icon: '❓' },
};

export default async function SubInvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as any;
  const db = getDb();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND subcontractor_id = ?').get(id, user.id) as any;
  if (!invoice) notFound();

  const attachments = db.prepare('SELECT * FROM attachments WHERE invoice_id = ?').all(id) as any[];
  const jobLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id) as any[];
  const cfg = statusConfig[invoice.status] || statusConfig.pending;

  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const needsAttention = invoice.status === 'queried' || invoice.status === 'rejected';

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

  return (
    <div>
      <Link href="/subcontractor" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block transition">
        ← Back to My Invoices
      </Link>

      {/* Attention banner */}
      {needsAttention && (
        <>
        <div className="mb-4 p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-300">This invoice requires your attention</p>
              {invoice.reviewer_comment && (
                <p className="text-amber-200/80 text-sm mt-1">{invoice.reviewer_comment}</p>
              )}
            </div>
          </div>
          <Link
            href={`/subcontractor/invoice/${invoice.id}/edit`}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-xl transition"
          >
            ✏️ Edit &amp; Resubmit
          </Link>
        </div>
        <SubcontractorDisputeButton invoiceId={invoice.id} invoiceNumber={invoice.invoice_number} amount={invoice.amount} />
        </>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">Invoice {invoice.invoice_number}</h1>
              <p className="text-blue-400 text-sm mt-0.5">Submitted {new Date(invoice.submitted_at).toLocaleString('en-GB')}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${cfg.bg} ${cfg.color}`}>
              <span>{cfg.icon}</span> {cfg.label}
            </div>
          </div>

          {/* Status banners */}
          {invoice.status === 'queried' && invoice.reviewer_comment && (
            <div className="mt-4 p-4 bg-orange-500/15 border border-orange-500/30 rounded-xl">
              <p className="text-xs font-semibold text-orange-400 mb-1 uppercase tracking-wide">❓ Query from Contractor</p>
              <p className="text-orange-200 text-sm">{invoice.reviewer_comment}</p>
            </div>
          )}
          {invoice.status === 'rejected' && (
            <div className="mt-4 p-4 bg-red-500/15 border border-red-500/30 rounded-xl">
              <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wide">✗ Rejected</p>
              <p className="text-red-200 text-sm">{invoice.reviewer_comment || 'No reason provided.'}</p>
            </div>
          )}
          {invoice.status === 'approved' && (
            <div className="mt-4 p-4 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center justify-between gap-4">
              <p className="text-sm text-green-300">✅ This invoice has been approved. Payment will be processed in accordance with contract terms.</p>
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition"
              >
                📄 Download PDF
              </a>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Job Lines Table */}
          {jobLines.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">📋 Job Lines ({jobLines.length})</p>
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wide">Job Code</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wide">Area</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wide">Description</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobLines.map((line: any) => {
                      const lineKey = `${line.job_code}/${line.area}`.toLowerCase();
                      const isQueried = queriedLineKeys.has(lineKey);
                      return (
                        <tr key={line.id} className={`border-b border-white/5 hover:bg-white/5 transition ${isQueried ? 'bg-amber-500/10' : ''}`}>
                          <td className="py-2.5 px-4 font-medium">
                            {isQueried && <span className="text-amber-400 mr-1">⚠️</span>}
                            <span className={isQueried ? 'text-amber-300 font-semibold' : 'text-white'}>{line.job_code}</span>
                          </td>
                          <td className={`py-2.5 px-4 ${isQueried ? 'text-amber-300' : 'text-blue-200'}`}>{line.area}</td>
                          <td className={`py-2.5 px-4 ${isQueried ? 'text-amber-200' : 'text-blue-300/80'}`}>{line.description}</td>
                          <td className={`py-2.5 px-4 text-right font-semibold ${isQueried ? 'text-amber-300' : 'text-white'}`}>£{fmt(line.line_value)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-white/20 bg-white/5">
                      <td colSpan={3} className="py-2.5 px-4 text-right font-bold text-blue-300 text-xs uppercase tracking-wide">Total</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">£{fmt(invoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            <Detail label="Total (ex VAT)" value={`£${fmt(invoice.amount)}`} large />
            <Detail label="VAT Amount" value={`£${fmt(invoice.vat_amount)}`} />
            {invoice.cis_rate > 0 ? (
              <>
                <Detail label={`CIS Deduction (${invoice.cis_rate}%)`} value={`− £${fmt(invoice.cis_amount || 0)}`} />
                <Detail label="Net Payment Due" value={`£${fmt(invoice.amount + invoice.vat_amount - (invoice.cis_amount || 0))}`} large />
              </>
            ) : (
              <Detail label="Total Inc VAT" value={`£${fmt(invoice.amount + invoice.vat_amount)}`} large />
            )}
            <Detail label="Work Period" value={`${new Date(invoice.work_from).toLocaleDateString('en-GB')} – ${new Date(invoice.work_to).toLocaleDateString('en-GB')}`} />
            {invoice.cost_code && <Detail label="Cost Code" value={invoice.cost_code} />}
            {invoice.po_reference && <Detail label="PO Reference" value={invoice.po_reference} />}
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-white">{invoice.description}</p>
          </div>

          {invoice.notes && (
            <div className="mb-4">
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-blue-200 text-sm">{invoice.notes}</p>
            </div>
          )}

          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Attachments</p>
              <div className="space-y-2">
                {attachments.map(att => (
                  <a key={att.id} href={`/api/files?path=${encodeURIComponent(att.file_path)}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm text-blue-300">
                    📎 {att.filename}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Edit button */}
          {needsAttention && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <Link
                href={`/subcontractor/invoice/${invoice.id}/edit`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition"
              >
                ✏️ Edit &amp; Resubmit Invoice
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-white font-${large ? 'bold text-lg' : 'medium'}`}>{value}</p>
    </div>
  );
}
