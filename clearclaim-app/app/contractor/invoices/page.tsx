import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import FlagBadge from '@/components/FlagBadge';
import InvoiceFilters from '@/components/InvoiceFilters';

export const dynamic = 'force-dynamic';

export default async function ContractorInvoicesPage({ searchParams }: { searchParams: Promise<any> }) {
  const db = getDb();
  const sp = await searchParams;

  let query = `
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company,
    (SELECT COUNT(*) FROM ai_flags WHERE invoice_id = i.id) as flag_count,
    (SELECT MAX(confidence_score) FROM ai_flags WHERE invoice_id = i.id) as max_flag_score
    FROM invoices i JOIN users u ON i.subcontractor_id = u.id WHERE 1=1
  `;
  const params: any[] = [];

  if (sp.status) { query += ' AND i.status = ?'; params.push(sp.status); }
  if (sp.subcontractor_id) { query += ' AND i.subcontractor_id = ?'; params.push(sp.subcontractor_id); }
  if (sp.date_from) { query += ' AND i.submitted_at >= ?'; params.push(sp.date_from); }
  if (sp.date_to) { query += ' AND i.submitted_at <= ?'; params.push(sp.date_to + ' 23:59:59'); }
  if (sp.amount_min) { query += ' AND i.amount >= ?'; params.push(parseFloat(sp.amount_min)); }
  if (sp.amount_max) { query += ' AND i.amount <= ?'; params.push(parseFloat(sp.amount_max)); }
  if (sp.flagged === 'true') { query += ' AND (SELECT COUNT(*) FROM ai_flags WHERE invoice_id = i.id) > 0'; }
  if (sp.job_code) { query += ' AND i.job_code LIKE ?'; params.push(`%${sp.job_code}%`); }

  query += ' ORDER BY i.submitted_at DESC';

  const invoices = db.prepare(query).all(...params) as any[];

  const subcontractors = db.prepare(`SELECT id, name, company FROM users WHERE role = 'subcontractor' ORDER BY company`).all() as any[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All Invoices</h1>
          <p className="text-blue-300 mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link
          href="/contractor/invoices/import"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2"
        >
          📥 Import Invoices
        </Link>
      </div>

      <InvoiceFilters subcontractors={subcontractors} currentFilters={sp} />

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-blue-400 font-medium px-6 py-3">Invoice #</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Job / Area</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Description</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Amount</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Period</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">AI</th>
                <th className="text-left text-xs text-blue-400 font-medium px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-blue-400/60">No invoices found matching filters</td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-3">
                    <Link href={`/contractor/invoice/${inv.id}`} className="text-blue-300 hover:text-white font-medium text-sm">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{inv.subcontractor_company}</p>
                    <p className="text-blue-400/60 text-xs">{inv.subcontractor_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {inv.job_code ? (
                      <>
                        <p className="text-amber-300 text-xs font-medium">{inv.job_code}</p>
                        {inv.area && <p className="text-blue-400/60 text-xs truncate max-w-[140px]">{inv.area}</p>}
                      </>
                    ) : (
                      <p className="text-blue-400/40 text-xs">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-blue-200 text-sm truncate max-w-[180px]">{inv.description}</p>
                  </td>
                  <td className="px-4 py-3 text-white text-sm font-medium whitespace-nowrap">
                    £{inv.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-blue-300/70 text-xs whitespace-nowrap">
                    {new Date(inv.work_from).toLocaleDateString('en-GB')} – {new Date(inv.work_to).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    {inv.flag_count > 0 && <FlagBadge score={inv.max_flag_score} />}
                  </td>
                  <td className="px-4 py-3 text-blue-400/60 text-xs whitespace-nowrap">
                    {new Date(inv.submitted_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
