'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface JobLine {
  id: number;
  job_code: string;
  area: string;
  description: string;
  line_value: string;
}

let lineCounter = 1;

function emptyLine(): JobLine {
  return { id: lineCounter++, job_code: '', area: '', description: '', line_value: '' };
}

export default function SubmitInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [flagCount, setFlagCount] = useState(0);

  const [jobLines, setJobLines] = useState<JobLine[]>([emptyLine()]);

  const [cisRate, setCisRate] = useState('0');
  const [vatRate, setVatRate] = useState('20');
  const [retentionRate, setRetentionRate] = useState('5.0');
  const [retentionReleaseDate, setRetentionReleaseDate] = useState('');
  const [applicationInfo, setApplicationInfo] = useState<{ appNumber: number; previousCertified: number } | null>(null);
  const [appInfoLoading, setAppInfoLoading] = useState(true);

  const [projects, setProjects] = useState<Array<{ id: number; name: string; reference: string }>>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/invoices?limit=1')
      .then(res => res.json())
      .then(data => {
        const invoices = data.invoices || [];
        const approved = invoices.filter((i: any) => i.status === 'approved');
        const maxApp = invoices.reduce((max: number, i: any) => Math.max(max, i.application_number || 0), 0);
        const lastApprovedCumulative = approved.length > 0
          ? approved.reduce((latest: any, i: any) => {
              if (!latest || (i.application_number || 0) > (latest.application_number || 0)) return i;
              return latest;
            }, null)?.cumulative_value || 0
          : 0;
        setApplicationInfo({ appNumber: maxApp + 1, previousCertified: lastApprovedCumulative });
      })
      .catch(() => setApplicationInfo({ appNumber: 1, previousCertified: 0 }))
      .finally(() => setAppInfoLoading(false));
  }, []);

  const totalValue = jobLines.reduce((sum, l) => sum + (parseFloat(l.line_value) || 0), 0);
  const vatAmount = totalValue * (parseFloat(vatRate) / 100);
  const cisAmount = totalValue * (parseInt(cisRate) / 100);
  const retentionRateNum = parseFloat(retentionRate) || 0;
  const retentionAmount = totalValue * (retentionRateNum / 100);
  const netPayment = totalValue + vatAmount - cisAmount - retentionAmount;

  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const updateLine = (id: number, field: keyof JobLine, value: string) => {
    setJobLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const addLine = () => setJobLines(prev => [...prev, emptyLine()]);

  const removeLine = (id: number) => {
    setJobLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

    formData.set('job_lines', JSON.stringify(jobLines.map(l => ({
      job_code: l.job_code.trim(),
      area: l.area.trim(),
      description: l.description.trim(),
      line_value: parseFloat(l.line_value),
    }))));

    formData.set('vat_amount', vatAmount.toFixed(2));
    formData.set('vat_rate', vatRate);
    formData.set('retention_rate', retentionRate);
    if (retentionReleaseDate) formData.set('retention_release_date', retentionReleaseDate);
    if (applicationInfo) {
      formData.set('cumulative_value', totalValue.toFixed(2));
    }
    if (projectId) formData.set('project_id', projectId);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit invoice');
        return;
      }

      setFlagCount(data.flagCount || 0);
      setSuccess(true);
      setTimeout(() => router.push('/subcontractor'), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Invoice Submitted!</h1>
        {flagCount > 0 ? (
          <div className="mt-4 p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-300 text-sm">
            ⚠️ Our system flagged {flagCount} potential duplicate match{flagCount > 1 ? 'es' : ''} on this invoice. The contractor will review this.
          </div>
        ) : null}
        <p className="text-blue-400 mt-4">Redirecting to your invoices...</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";
  const labelCls = "block text-sm font-medium text-blue-300 mb-1.5";
  const sectionHdr = "text-base font-semibold text-white mb-4 pb-2 border-b border-white/10";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Submit Invoice</h1>
        <p className="text-blue-300 mt-1">Submit a new invoice or valuation for payment</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Invoice Details */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className={sectionHdr}>Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Invoice Number <span className="text-red-400">*</span></label>
              <input name="invoice_number" type="text" required placeholder="e.g. INV-2024-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purchase Order Reference</label>
              <input name="po_reference" type="text" placeholder="e.g. PO-12345" className={inputCls} />
            </div>
            {projects.length > 0 && (
              <div>
                <label className={labelCls}>Project</label>
                <select
                  name="project_id"
                  className={inputCls}
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                >
                  <option value="">— No project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.reference ? ` (${p.reference})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className={labelCls}>Overall Description / Application Summary <span className="text-red-400">*</span></label>
            <textarea
              name="job_description"
              required
              rows={2}
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
              <input name="work_from" type="date" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Work Period To <span className="text-red-400">*</span></label>
              <input name="work_to" type="date" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cost Code / Work Package</label>
              <input name="cost_code" type="text" placeholder="e.g. ELEC-01" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Job Lines */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-white">📋 Job Lines <span className="text-red-400">*</span></h2>
            <span className="text-xs text-blue-400">{jobLines.length} line{jobLines.length > 1 ? 's' : ''}</span>
          </div>
          <p className="text-xs text-blue-400 mb-4">Add one line per job code / area of work. The total will be calculated automatically.</p>

          <div className="space-y-3">
            {jobLines.map((line, idx) => (
              <div key={line.id} className="border border-white/10 rounded-xl p-4 bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Line {idx + 1}</span>
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
            ))}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-blue-500/40 text-blue-400 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-300 hover:bg-white/5 transition"
          >
            + Add Job Line
          </button>
        </div>

        {/* Application for Payment */}
        {!appInfoLoading && applicationInfo && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className={sectionHdr}>📋 Application for Payment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Application Number</label>
                <div className={`${inputCls} opacity-50 cursor-not-allowed`}>
                  App {applicationInfo.appNumber}
                </div>
              </div>
              <div>
                <label className={labelCls}>Previously Certified (£)</label>
                <div className={`${inputCls} opacity-50 cursor-not-allowed`}>
                  £{applicationInfo.previousCertified.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className={labelCls}>This Application (£)</label>
                <div className={`${inputCls} text-blue-300 font-semibold cursor-not-allowed bg-blue-500/10 border-blue-500/30`}>
                  £{(totalValue - applicationInfo.previousCertified).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-400/70 mt-2">This application = Total Line Values − Previously Certified</p>
          </div>
        )}

        {/* Retention */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className={sectionHdr}>🔒 Retention</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Retention Rate %</label>
              <select
                name="retention_rate"
                className={inputCls}
                value={retentionRate}
                onChange={e => setRetentionRate(e.target.value)}
              >
                <option value="0">0% — No retention</option>
                <option value="2.5">2.5%</option>
                <option value="5.0">5% (typical)</option>
                <option value="10">10%</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Retention Amount (auto)</label>
              <div className={`${inputCls} opacity-50 cursor-not-allowed`}>
                £{retentionAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <label className={labelCls}>Expected Release Date</label>
              <input
                type="date"
                name="retention_release_date"
                className={inputCls}
                value={retentionReleaseDate}
                onChange={e => setRetentionReleaseDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className={sectionHdr}>Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>VAT Rate</label>
              <select
                name="vat_rate"
                className={inputCls}
                value={vatRate}
                onChange={e => setVatRate(e.target.value)}
              >
                <option value="0">0% — Zero rated / exempt</option>
                <option value="5">5% — Reduced rate</option>
                <option value="20">20% — Standard rate</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>CIS Deduction Rate</label>
              <select
                name="cis_rate"
                className={inputCls}
                value={cisRate}
                onChange={e => setCisRate(e.target.value)}
              >
                <option value="0">0% — Not registered / Gross payment</option>
                <option value="20">20% — Standard CIS deduction</option>
                <option value="30">30% — Higher rate (unregistered)</option>
              </select>
            </div>
          </div>

          {/* Live payment summary */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-4">Payment Summary (auto-calculated)</p>

            {/* Job lines breakdown */}
            {jobLines.some(l => l.line_value) && (
              <div className="mb-4 overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-xs text-blue-200 border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left py-2 px-3 font-semibold text-blue-400">Job Code</th>
                      <th className="text-left py-2 px-3 font-semibold text-blue-400">Area</th>
                      <th className="text-left py-2 px-3 font-semibold text-blue-400">Description</th>
                      <th className="text-right py-2 px-3 font-semibold text-blue-400">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobLines.map((line) => (
                      <tr key={line.id} className="border-b border-white/5">
                        <td className="py-2 px-3">{line.job_code || '—'}</td>
                        <td className="py-2 px-3">{line.area || '—'}</td>
                        <td className="py-2 px-3 text-blue-400">{line.description ? (line.description.length > 40 ? line.description.slice(0, 40) + '…' : line.description) : '—'}</td>
                        <td className="py-2 px-3 text-right text-white">£{fmt(parseFloat(line.line_value) || 0)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/20 bg-white/5">
                      <td colSpan={3} className="py-2 px-3 text-right text-xs font-bold text-blue-300 uppercase tracking-wide">Total (ex VAT)</td>
                      <td className="py-2 px-3 text-right font-bold text-white">£{fmt(totalValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-300">Gross Amount (ex VAT)</span>
                <span className="font-semibold text-white">£{fmt(totalValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-300">VAT ({vatRate}%)</span>
                <span className="font-semibold text-white">£{fmt(vatAmount)}</span>
              </div>
              {parseInt(cisRate) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">CIS Deduction ({cisRate}%)</span>
                  <span className="font-semibold text-red-400">− £{fmt(cisAmount)}</span>
                </div>
              )}
              {retentionRateNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">Retention ({retentionRate}%)</span>
                  <span className="font-semibold text-amber-400">− £{fmt(retentionAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-3 mt-2">
                <span className="text-white uppercase tracking-wide text-xs">Net Payment Due</span>
                <span className="text-green-400 text-base">£{fmt(netPayment)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Attachments */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className={sectionHdr}>Additional Information</h2>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" rows={2} placeholder="Any additional notes or special instructions..." className={inputCls} />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Attachments (PDF, images)</label>
            <input
              name="attachments"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              className="w-full text-sm text-blue-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600/40 file:text-blue-200 hover:file:bg-blue-600/60 cursor-pointer transition"
            />
            <p className="text-xs text-blue-400/70 mt-1">PDF, JPG, PNG — max 10MB each</p>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3 pt-2 pb-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 text-sm"
          >
            {loading ? 'Submitting...' : `Submit Invoice — £${fmt(totalValue)} total`}
          </button>
          <button
            type="button"
            onClick={() => router.push('/subcontractor')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
