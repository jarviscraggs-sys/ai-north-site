'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JobLine {
  id: number;
  job_code: string;
  area: string;
  description: string;
  line_value: string;
}

let lineCounter = 100;

function makeId() { return lineCounter++; }

export default function EditInvoiceForm({
  invoiceId,
  invoice,
  existingLines,
  existingAttachments,
  queriedLineKeys = [],
}: {
  invoiceId: number;
  invoice: any;
  existingLines: any[];
  existingAttachments: any[];
  queriedLineKeys?: string[];
}) {
  const router = useRouter();
  const queriedKeySet = new Set(queriedLineKeys.map(k => k.toLowerCase()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-populate job lines from existing
  const [jobLines, setJobLines] = useState<JobLine[]>(
    existingLines.length > 0
      ? existingLines.map(l => ({
          id: makeId(),
          job_code: l.job_code || '',
          area: l.area || '',
          description: l.description || '',
          line_value: String(l.line_value || ''),
        }))
      : [{ id: makeId(), job_code: '', area: '', description: '', line_value: '' }]
  );

  const [vatRate, setVatRate] = useState(String(invoice.vat_rate ?? 20));
  const [cisRate, setCisRate] = useState(String(invoice.cis_rate ?? 0));

  // Computed totals
  const totalValue = jobLines.reduce((sum, l) => sum + (parseFloat(l.line_value) || 0), 0);
  const vatAmount = totalValue * (parseFloat(vatRate) / 100);
  const cisAmount = totalValue * (parseInt(cisRate) / 100);
  const netPayment = totalValue + vatAmount - cisAmount;

  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Job line helpers
  const updateLine = (id: number, field: keyof JobLine, value: string) => {
    setJobLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };
  const addLine = () => setJobLines(prev => [...prev, { id: makeId(), job_code: '', area: '', description: '', line_value: '' }]);
  const removeLine = (id: number) => {
    setJobLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate lines
    for (const line of jobLines) {
      if (!line.job_code.trim() || !line.area.trim() || !line.description.trim() || !line.line_value) {
        setError('Please complete all fields in every job line.');
        setLoading(false);
        return;
      }
      if (parseFloat(line.line_value) <= 0) {
        setError('All job line values must be greater than 0.');
        setLoading(false);
        return;
      }
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      job_description: formData.get('job_description') as string,
      work_from: formData.get('work_from') as string,
      work_to: formData.get('work_to') as string,
      cost_code: formData.get('cost_code') as string,
      po_reference: formData.get('po_reference') as string,
      notes: formData.get('notes') as string,
      vat_rate: vatRate,
      cis_rate: cisRate,
      job_lines: jobLines.map(l => ({
        job_code: l.job_code.trim(),
        area: l.area.trim(),
        description: l.description.trim(),
        line_value: parseFloat(l.line_value),
      })),
    };

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resubmit invoice');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/subcontractor/invoice/${invoiceId}`), 2500);
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Invoice Resubmitted!</h1>
        <p className="text-blue-300">Your invoice has been updated and sent back for review.</p>
        <div className="mt-4 p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-300 text-sm">
          ⏳ Resubmitted — awaiting review
        </div>
        <p className="text-blue-400 text-sm mt-4">Redirecting...</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";
  const labelCls = "block text-sm font-medium text-blue-300 mb-1.5";
  const sectionHdr = "text-base font-semibold text-white mb-4 pb-2 border-b border-white/10";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Invoice Number (read-only) */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className={sectionHdr}>Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Invoice Number</label>
            <div className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-blue-400 text-sm cursor-not-allowed">
              {invoice.invoice_number}
              <span className="ml-2 text-xs text-blue-400/50">(cannot be changed)</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Purchase Order Reference</label>
            <input
              name="po_reference"
              type="text"
              defaultValue={invoice.po_reference || ''}
              placeholder="e.g. PO-12345"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Overall Description / Application Summary <span className="text-red-400">*</span></label>
          <textarea
            name="job_description"
            required
            rows={2}
            defaultValue={invoice.description || ''}
            placeholder="Brief summary of this invoice application..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Work Period */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className={sectionHdr}>Work Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Work Period From <span className="text-red-400">*</span></label>
            <input
              name="work_from"
              type="date"
              required
              defaultValue={invoice.work_from ? invoice.work_from.split('T')[0] : ''}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Work Period To <span className="text-red-400">*</span></label>
            <input
              name="work_to"
              type="date"
              required
              defaultValue={invoice.work_to ? invoice.work_to.split('T')[0] : ''}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cost Code / Work Package</label>
            <input
              name="cost_code"
              type="text"
              defaultValue={invoice.cost_code || ''}
              placeholder="e.g. ELEC-01"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Job Lines */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">📋 Job Lines <span className="text-red-400">*</span></h2>
          <span className="text-xs text-blue-400">{jobLines.length} line{jobLines.length > 1 ? 's' : ''}</span>
        </div>
        <p className="text-xs text-blue-400 mb-4">Edit job lines below. You can add, remove, or update any line.</p>

        <div className="space-y-3">
          {jobLines.map((line, idx) => {
            const lineKey = `${line.job_code}/${line.area}`.toLowerCase();
            const isQueried = queriedKeySet.has(lineKey);
            return (
            <div key={line.id} className={`border rounded-xl p-4 ${isQueried ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isQueried ? 'text-amber-300' : 'text-blue-400'}`}>
                  {isQueried && '⚠️ '}
                  Line {idx + 1}
                  {isQueried && ' — Queried'}
                </span>
                {jobLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-red-400 hover:text-red-300 font-medium transition px-2 py-1 rounded-lg hover:bg-red-500/10"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Job Code <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JOB-2024-001"
                    className={inputCls}
                    value={line.job_code}
                    onChange={e => updateLine(line.id, 'job_code', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Area / Section <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block A – Level 2"
                    className={inputCls}
                    value={line.area}
                    onChange={e => updateLine(line.id, 'area', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className={labelCls}>Description of Work <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrical first fix – cable containment"
                    className={inputCls}
                    value={line.description}
                    onChange={e => updateLine(line.id, 'description', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Value (£) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className={inputCls}
                    value={line.line_value}
                    onChange={e => updateLine(line.id, 'line_value', e.target.value)}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 w-full py-2.5 border-2 border-dashed border-blue-500/40 text-blue-400 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-300 hover:bg-white/5 transition"
        >
          + Add Job Line
        </button>
      </div>

      {/* Financial Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className={sectionHdr}>Financial Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>VAT Rate</label>
            <select className={inputCls} value={vatRate} onChange={e => setVatRate(e.target.value)}>
              <option value="0">0% — Zero rated / exempt</option>
              <option value="5">5% — Reduced rate</option>
              <option value="20">20% — Standard rate</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>CIS Deduction Rate</label>
            <select className={inputCls} value={cisRate} onChange={e => setCisRate(e.target.value)}>
              <option value="0">0% — Not registered / Gross payment</option>
              <option value="20">20% — Standard CIS deduction</option>
              <option value="30">30% — Higher rate (unregistered)</option>
            </select>
          </div>
        </div>

        {/* Live summary */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">Payment Summary (auto-calculated)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-blue-400">Total (ex VAT)</p>
              <p className="text-sm font-semibold text-white">£{fmt(totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-400">VAT ({vatRate}%)</p>
              <p className="text-sm font-semibold text-white">£{fmt(vatAmount)}</p>
            </div>
            {parseInt(cisRate) > 0 && (
              <div>
                <p className="text-xs text-red-400">CIS Deduction ({cisRate}%)</p>
                <p className="text-sm font-semibold text-red-400">− £{fmt(cisAmount)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-blue-400">Net Payment Due</p>
              <p className="text-sm font-bold text-green-400">£{fmt(netPayment)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Attachments */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className={sectionHdr}>Additional Information</h2>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={invoice.notes || ''}
            placeholder="Any additional notes or special instructions..."
            className={inputCls}
          />
        </div>

        {/* Existing attachments */}
        {existingAttachments.length > 0 && (
          <div className="mt-4">
            <label className={labelCls}>Existing Attachments</label>
            <div className="space-y-2">
              {existingAttachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 text-sm text-blue-300">
                  📎 {att.filename}
                  <span className="text-xs text-blue-400/50 ml-1">(kept)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className={labelCls}>Add New Attachments (optional)</label>
          <input
            name="new_attachments"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            className="w-full text-sm text-blue-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600/40 file:text-blue-200 hover:file:bg-blue-600/60 cursor-pointer transition"
          />
          <p className="text-xs text-blue-400/70 mt-1">PDF, JPG, PNG — max 10MB each</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2 pb-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
        >
          {loading ? 'Resubmitting...' : `✏️ Resubmit Invoice — £${fmt(totalValue)} total`}
        </button>
        <a
          href={`/subcontractor/invoice/${invoiceId}`}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition flex items-center text-sm font-semibold"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
