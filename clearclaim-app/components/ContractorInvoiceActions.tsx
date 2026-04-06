'use client';

import { useState } from 'react';
import JobLinesTable from './JobLinesTable';
import ReviewForm from './ReviewForm';
import StatusBadge from './StatusBadge';

interface JobLine {
  id: number;
  job_code: string;
  area: string;
  description: string;
  line_value: number;
}

interface Attachment {
  id: number;
  file_path: string;
  filename: string;
}

interface ContractorInvoiceActionsProps {
  invoice: {
    id: number;
    invoice_number: string;
    status: string;
    amount: number;
    vat_amount: number;
    cis_rate: number;
    cis_amount?: number;
    retention_rate?: number;
    retention_amount?: number;
    retention_released?: number;
    retention_release_date?: string;
    application_number?: number;
    cumulative_value?: number;
    previous_certified?: number;
    this_application?: number;
    work_from: string;
    work_to: string;
    cost_code?: string;
    po_reference?: string;
    submitted_at: string;
    reviewed_at?: string;
    description: string;
    notes?: string;
    reviewer_comment?: string;
  };
  jobLines: JobLine[];
  attachments: Attachment[];
  flaggedLineKeys: string[];
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-blue-400 mb-0.5">{label}</dt>
      <dd className="text-white text-sm font-medium">{value}</dd>
    </div>
  );
}

export default function ContractorInvoiceActions({
  invoice,
  jobLines,
  attachments,
  flaggedLineKeys,
}: ContractorInvoiceActionsProps) {
  const [queryMode, setQueryMode] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeType, setDisputeType] = useState('payment');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeAmount, setDisputeAmount] = useState('');
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [disputeRaised, setDisputeRaised] = useState(false);

  const toggleLine = (id: number) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedLineIds(new Set());
  };

  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim()) return;
    setRaisingDispute(true);
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          subcontractor_id: (invoice as any).subcontractor_id,
          dispute_type: disputeType,
          description: disputeDescription,
          amount_disputed: disputeAmount ? parseFloat(disputeAmount) : null,
        }),
      });
      if (res.ok) {
        setDisputeRaised(true);
        setShowDisputeModal(false);
      }
    } finally {
      setRaisingDispute(false);
    }
  };

  const handleRetentionRelease = async () => {
    setReleaseLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_amount: parseFloat(releaseAmount) }),
      });
      if (res.ok) {
        setShowReleaseModal(false);
        window.location.reload();
      }
    } catch {
      // silent
    } finally {
      setReleaseLoading(false);
    }
  };

  const fmt = (n: number) =>
    Number(n).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const retentionHeld = (invoice.retention_amount || 0) - (invoice.retention_released || 0);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Job Lines Table */}
          {jobLines.length > 0 && (
            <JobLinesTable
              jobLines={jobLines}
              queryMode={queryMode}
              selectedLineIds={selectedLineIds}
              onToggleLine={toggleLine}
              flaggedLineKeys={flaggedLineKeys}
              totalAmount={invoice.amount}
            />
          )}

          {/* Invoice Details */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Invoice Details</h2>
            {invoice.application_number && (
              <div className="mb-4 p-3 bg-blue-900/30 rounded-xl border border-blue-500/30">
                <p className="text-blue-200 text-sm font-semibold">
                  Application for Payment No. {invoice.application_number}
                </p>
                {(invoice.cumulative_value || 0) > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-blue-400">Total to Date</p>
                      <p className="text-white font-semibold">£{fmt(invoice.cumulative_value || 0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-400">Previously Certified</p>
                      <p className="text-white font-semibold">£{fmt(invoice.previous_certified || 0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-400">This Application</p>
                      <p className="text-white font-semibold">£{fmt(invoice.this_application || invoice.amount)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem label="Invoice Number" value={invoice.invoice_number} />
              <DetailItem label="Status" value={<StatusBadge status={invoice.status} />} />
              <DetailItem label="Total (ex VAT)" value={`£${fmt(invoice.amount)}`} />
              <DetailItem label="VAT Amount" value={`£${fmt(invoice.vat_amount)}`} />
              <DetailItem
                label="Total Inc VAT"
                value={`£${fmt(invoice.amount + invoice.vat_amount)}`}
              />
              {invoice.cis_rate > 0 && (
                <DetailItem
                  label={`CIS Deduction (${invoice.cis_rate}%)`}
                  value={
                    <span className="text-red-400">
                      − £{fmt(invoice.cis_amount || 0)}
                    </span>
                  }
                />
              )}
              {(invoice.retention_amount || 0) > 0 && (
                <DetailItem
                  label={`Retention (${invoice.retention_rate}%)`}
                  value={
                    <span className="text-amber-400">
                      − £{fmt(invoice.retention_amount || 0)}
                    </span>
                  }
                />
              )}
              {(invoice.retention_released || 0) > 0 && (
                <DetailItem
                  label="Retention Released"
                  value={<span className="text-green-400">£{fmt(invoice.retention_released || 0)}</span>}
                />
              )}
              {invoice.retention_release_date && (
                <DetailItem
                  label="Retention Release Date"
                  value={new Date(invoice.retention_release_date).toLocaleDateString('en-GB')}
                />
              )}
              <DetailItem
                label="Net Payment Due"
                value={
                  <span className="text-green-400 font-bold">
                    £{fmt(
                      invoice.amount +
                        invoice.vat_amount -
                        (invoice.cis_amount || 0) -
                        retentionHeld
                    )}
                  </span>
                }
              />
              <DetailItem
                label="Work Period"
                value={`${new Date(invoice.work_from).toLocaleDateString(
                  'en-GB'
                )} – ${new Date(invoice.work_to).toLocaleDateString('en-GB')}`}
              />
              {invoice.cost_code && (
                <DetailItem label="Cost Code" value={invoice.cost_code} />
              )}
              {invoice.po_reference && (
                <DetailItem label="PO Reference" value={invoice.po_reference} />
              )}
              <DetailItem
                label="Submitted"
                value={new Date(invoice.submitted_at).toLocaleString('en-GB')}
              />
              {invoice.reviewed_at && (
                <DetailItem
                  label="Reviewed"
                  value={new Date(invoice.reviewed_at).toLocaleString('en-GB')}
                />
              )}
            </dl>

            <div className="mt-4">
              <p className="text-xs text-blue-400 mb-1">
                Description / Application Summary
              </p>
              <p className="text-blue-200 text-sm">{invoice.description}</p>
            </div>

            {invoice.notes && (
              <div className="mt-4">
                <p className="text-xs text-blue-400 mb-1">Notes</p>
                <p className="text-blue-200 text-sm">{invoice.notes}</p>
              </div>
            )}

            {invoice.reviewer_comment && (
              <div className="mt-4 p-3 bg-blue-900/30 rounded-xl border border-blue-500/30">
                <p className="text-xs text-blue-400 mb-1">Contractor Comment</p>
                <p className="text-blue-200 text-sm">{invoice.reviewer_comment}</p>
              </div>
            )}

            {/* Retention release button */}
            {invoice.status === 'approved' && retentionHeld > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-amber-400 mb-2">
                  Retention held: £{fmt(retentionHeld)}
                </p>
                <button
                  onClick={() => {
                    setReleaseAmount(retentionHeld.toFixed(2));
                    setShowReleaseModal(true);
                  }}
                  className="text-sm px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl transition"
                >
                  Release Retention
                </button>
              </div>
            )}

            {/* Raise Dispute — queried or rejected invoices */}
            {(invoice.status === 'queried' || invoice.status === 'rejected') && (
              <div className="mt-4 pt-4 border-t border-white/10">
                {disputeRaised ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-amber-300 text-sm font-semibold">⚖️ Dispute raised successfully</p>
                    <a href="/contractor/disputes" className="text-blue-400 hover:text-white text-xs mt-1 block">View disputes →</a>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="text-sm px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition"
                  >
                    ⚖️ Raise Dispute
                  </button>
                )}
              </div>
            )}

            {/* Export buttons — approved invoices only */}
            {invoice.status === 'approved' && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-blue-400 mb-2">Export</p>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`/api/invoices/${invoice.id}/export?format=quickbooks`}
                    className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition font-medium"
                  >
                    📤 QuickBooks
                  </a>
                  <a
                    href={`/api/invoices/${invoice.id}/export?format=xero`}
                    className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition font-medium"
                  >
                    📤 Xero
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Attachments</h2>
              <div className="space-y-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition"
                  >
                    <span>📎</span>
                    <span className="text-blue-300 text-sm">{att.filename}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — Review Panel ── */}
        <div>
          <ReviewForm
            invoiceId={invoice.id}
            currentStatus={invoice.status}
            currentComment={invoice.reviewer_comment ?? null}
            jobLines={jobLines}
            queryMode={queryMode}
            onSetQueryMode={setQueryMode}
            selectedLineIds={selectedLineIds}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {/* Raise Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">⚖️ Raise Dispute</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-blue-300 mb-1.5 block">Dispute Type</label>
                <select
                  value={disputeType}
                  onChange={e => setDisputeType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="payment">Payment Dispute</option>
                  <option value="quality">Quality Issue</option>
                  <option value="scope">Scope Dispute</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-300 mb-1.5 block">Description *</label>
                <textarea
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="Describe the dispute..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-sm text-blue-300 mb-1.5 block">Disputed Amount (£) — optional</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={disputeAmount}
                  onChange={e => setDisputeAmount(e.target.value)}
                  placeholder={invoice.amount.toFixed(2)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRaiseDispute}
                disabled={raisingDispute || !disputeDescription.trim()}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {raisingDispute ? 'Raising...' : 'Raise Dispute'}
              </button>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-5 py-2.5 border border-white/20 text-blue-300 hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention Release Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Release Retention</h3>
            <p className="text-blue-300 text-sm mb-4">
              Releasing retention for invoice{' '}
              <strong className="text-white">{invoice.invoice_number}</strong>.
              A notification will be sent to the subcontractor.
            </p>
            <div className="mb-4">
              <label className="text-sm text-blue-300 mb-1.5 block">Amount to Release (£)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={releaseAmount}
                onChange={e => setReleaseAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRetentionRelease}
                disabled={releaseLoading || !releaseAmount}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
              >
                {releaseLoading ? 'Releasing...' : 'Confirm Release'}
              </button>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="px-5 py-2.5 border border-white/20 text-blue-300 hover:text-white rounded-xl transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
