import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ContractorInvoiceActions from '@/components/ContractorInvoiceActions';

export const dynamic = 'force-dynamic';

export default async function ContractorInvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const invoice = db
    .prepare(
      `SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email
       FROM invoices i JOIN users u ON i.subcontractor_id = u.id WHERE i.id = ?`
    )
    .get(id) as any;

  if (!invoice) notFound();

  const attachments = db
    .prepare('SELECT * FROM attachments WHERE invoice_id = ?')
    .all(id) as any[];

  const jobLines = db
    .prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id')
    .all(id) as any[];

  const flags = db
    .prepare(
      `SELECT f.*,
        i2.invoice_number as matched_invoice_number,
        i2.amount as matched_amount,
        i2.description as matched_description,
        i2.work_from as matched_work_from,
        i2.work_to as matched_work_to,
        i2.cost_code as matched_cost_code,
        i2.job_code as matched_job_code,
        i2.area as matched_area,
        i2.cis_rate as matched_cis_rate,
        i2.cis_amount as matched_cis_amount,
        i2.status as matched_status,
        i2.submitted_at as matched_submitted_at
       FROM ai_flags f
       JOIN invoices i2 ON f.matched_invoice_id = i2.id
       WHERE f.invoice_id = ?
       ORDER BY f.confidence_score DESC`
    )
    .all(id) as any[];

  // For each flagged invoice, load its lines too
  const matchedLinesMap: Record<number, any[]> = {};
  for (const flag of flags) {
    matchedLinesMap[flag.matched_invoice_id] = db
      .prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id')
      .all(flag.matched_invoice_id) as any[];
  }

  // Build set of flagged line signatures from flag reasons
  const flaggedLineSigs = new Set<string>();
  for (const flag of flags) {
    const matches = flag.reason.matchAll(/Line "([^"]+)"/g);
    for (const m of matches) {
      flaggedLineSigs.add(m[1].toLowerCase());
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/contractor/invoices"
          className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block"
        >
          ← Back to Invoices
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-blue-300 mt-1">
              {invoice.subcontractor_company} · {invoice.subcontractor_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            {invoice.status === 'approved' && (
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition"
              >
                📄 Download PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* AI Flags */}
      {flags.length > 0 && (
        <div className="mb-6">
          {flags.map((flag: any) => {
            const matchedLines = matchedLinesMap[flag.matched_invoice_id] || [];
            return (
              <div
                key={flag.id}
                className={`rounded-2xl border p-5 mb-3 ${
                  flag.confidence_score > 70
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {flag.confidence_score > 70 ? '🚨' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-sm font-bold ${
                          flag.confidence_score > 70
                            ? 'text-red-300'
                            : 'text-amber-300'
                        }`}
                      >
                        AI ALERT —{' '}
                        {flag.confidence_score > 70 ? 'HIGH RISK' : 'MEDIUM RISK'} (
                        {flag.confidence_score}% confidence)
                      </span>
                      <span className="text-xs text-blue-400/60 uppercase tracking-wide">
                        {flag.flag_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p
                      className={`text-sm mb-3 ${
                        flag.confidence_score > 70 ? 'text-red-200' : 'text-amber-200'
                      }`}
                    >
                      {flag.reason}
                    </p>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-blue-400 mb-2 font-semibold uppercase tracking-wide">
                          This Invoice
                        </p>
                        <p className="text-white text-sm font-medium">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-white font-semibold mt-2">
                          £{fmt(invoice.amount)}
                        </p>
                        <p className="text-blue-300/70 text-xs mt-1">
                          {new Date(invoice.work_from).toLocaleDateString('en-GB')} –{' '}
                          {new Date(invoice.work_to).toLocaleDateString('en-GB')}
                        </p>
                        {jobLines.length > 0 && (
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full text-xs text-blue-200 border-collapse">
                              <thead>
                                <tr className="border-b border-white/10">
                                  <th className="text-left py-1 pr-2">Job Code</th>
                                  <th className="text-left py-1 pr-2">Area</th>
                                  <th className="text-right py-1">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobLines.map((l: any) => {
                                  const sig = `${l.job_code} / ${l.area}`.toLowerCase();
                                  const isFlagged = flaggedLineSigs.has(sig);
                                  return (
                                    <tr
                                      key={l.id}
                                      className={`border-b border-white/5 ${
                                        isFlagged ? 'bg-red-500/20 text-red-200' : ''
                                      }`}
                                    >
                                      <td className="py-1 pr-2">
                                        {isFlagged ? '🚨 ' : ''}
                                        {l.job_code}
                                      </td>
                                      <td className="py-1 pr-2">{l.area}</td>
                                      <td className="py-1 text-right">
                                        £{fmt(l.line_value)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-blue-400 mb-2 font-semibold uppercase tracking-wide">
                          Matched Invoice —{' '}
                          <Link
                            href={`/contractor/invoice/${flag.matched_invoice_id}`}
                            className="text-blue-300 hover:text-white underline"
                          >
                            {flag.matched_invoice_number}
                          </Link>
                        </p>
                        <p className="text-white text-sm font-medium">
                          {flag.matched_invoice_number}
                        </p>
                        <p className="text-white font-semibold mt-2">
                          £{fmt(flag.matched_amount)}
                        </p>
                        <p className="text-blue-300/70 text-xs mt-1">
                          {new Date(flag.matched_work_from).toLocaleDateString('en-GB')}{' '}
                          –{' '}
                          {new Date(flag.matched_work_to).toLocaleDateString('en-GB')}
                        </p>
                        {matchedLines.length > 0 && (
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full text-xs text-blue-200 border-collapse">
                              <thead>
                                <tr className="border-b border-white/10">
                                  <th className="text-left py-1 pr-2">Job Code</th>
                                  <th className="text-left py-1 pr-2">Area</th>
                                  <th className="text-right py-1">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matchedLines.map((l: any) => {
                                  const sig = `${l.job_code} / ${l.area}`.toLowerCase();
                                  const isFlagged = flaggedLineSigs.has(sig);
                                  return (
                                    <tr
                                      key={l.id}
                                      className={`border-b border-white/5 ${
                                        isFlagged ? 'bg-red-500/20 text-red-200' : ''
                                      }`}
                                    >
                                      <td className="py-1 pr-2">
                                        {isFlagged ? '🚨 ' : ''}
                                        {l.job_code}
                                      </td>
                                      <td className="py-1 pr-2">{l.area}</td>
                                      <td className="py-1 text-right">
                                        £{fmt(l.line_value)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="mt-2">
                          <StatusBadge status={flag.matched_status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive content — job lines + invoice details + review panel */}
      <ContractorInvoiceActions
        invoice={invoice}
        jobLines={jobLines}
        attachments={attachments}
        flaggedLineKeys={Array.from(flaggedLineSigs)}
      />
    </div>
  );
}
