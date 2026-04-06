'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JobLine {
  id: number;
  job_code: string;
  area: string;
  description: string;
  line_value: number;
}

interface ReviewFormProps {
  invoiceId: number;
  currentStatus: string;
  currentComment: string | null;
  jobLines?: JobLine[];
  // Inline-query props (provided by ContractorInvoiceActions wrapper)
  queryMode?: boolean;
  onSetQueryMode?: (mode: boolean) => void;
  selectedLineIds?: Set<number>;
  onClearSelection?: () => void;
}

export default function ReviewForm({
  invoiceId,
  currentStatus,
  currentComment,
  jobLines = [],
  // query-mode props (with internal fallbacks for standalone use)
  queryMode: externalQueryMode,
  onSetQueryMode,
  selectedLineIds: externalSelectedLineIds,
  onClearSelection,
}: ReviewFormProps) {
  const [status, setStatus] = useState(currentStatus);
  const [comment, setComment] = useState(currentComment || '');
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Internal query-mode state (used when this component is standalone / no wrapper)
  const [internalQueryMode, setInternalQueryMode] = useState(false);
  const [internalSelectedLineIds, setInternalSelectedLineIds] = useState<Set<number>>(new Set());

  const [generalQuery, setGeneralQuery] = useState(false);
  const [queryComment, setQueryComment] = useState('');

  const router = useRouter();

  // Determine whether we're using external (wrapper-managed) or internal state
  const isExternallyControlled =
    externalQueryMode !== undefined && onSetQueryMode !== undefined;

  const queryMode = isExternallyControlled ? externalQueryMode! : internalQueryMode;
  const selectedLineIds = isExternallyControlled
    ? externalSelectedLineIds ?? new Set<number>()
    : internalSelectedLineIds;

  const setQueryMode = (val: boolean) => {
    if (isExternallyControlled) {
      onSetQueryMode!(val);
    } else {
      setInternalQueryMode(val);
    }
  };

  const clearAllSelection = () => {
    if (isExternallyControlled && onClearSelection) {
      onClearSelection();
    } else {
      setInternalSelectedLineIds(new Set());
    }
  };

  const fmt = (n: number) =>
    Number(n).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const canSubmitQuery =
    queryComment.trim().length > 0 && (selectedLineIds.size > 0 || generalQuery);

  // Approve / Reject
  const handleSubmit = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewer_comment: comment || null }),
      });
      if (res.ok) {
        setStatus(newStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  // Send query
  const handleQuery = async () => {
    if (!canSubmitQuery) return;
    setLoading(true);

    let queriedLinesStr: string;
    if (generalQuery) {
      queriedLinesStr = 'General query (no specific lines)';
    } else {
      const selected = jobLines.filter((l) => selectedLineIds.has(l.id));
      queriedLinesStr = selected.map((l) => `${l.job_code}/${l.area}`).join(', ');
    }

    const combined = `Queried lines: ${queriedLinesStr} | Query: ${queryComment.trim()}`;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'queried', reviewer_comment: combined }),
      });
      if (res.ok) {
        setStatus('queried');
        setSaved(true);
        setQueryMode(false);
        clearAllSelection();
        setGeneralQuery(false);
        setQueryComment('');
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  // Resolve queried invoice
  const handleResolve = async (newStatus: 'approved' | 'rejected') => {
    if (!resolutionNote.trim()) return;
    setLoading(true);

    const originalQuery = currentComment || '';
    const combined = `${originalQuery} | Resolution: ${resolutionNote.trim()}`;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewer_comment: combined }),
      });
      if (res.ok) {
        setStatus(newStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-4">Review Invoice</h2>

      {saved && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">
          ✅ Status updated successfully
        </div>
      )}

      {/* ── PENDING — normal action buttons ── */}
      {status === 'pending' && !queryMode && (
        <>
          <div className="mb-4">
            <label className="text-xs text-blue-400 mb-1 block">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Add a general comment..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30 resize-none"
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleSubmit('approved')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
            >
              ✅ Approve Invoice
            </button>
            <button
              onClick={() => setQueryMode(true)}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
            >
              ❓ Query Invoice
            </button>
            <button
              onClick={() => handleSubmit('rejected')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
            >
              ✗ Reject Invoice
            </button>
          </div>
        </>
      )}

      {/* ── QUERY MODE — message + line counter (selection happens in table) ── */}
      {status === 'pending' && queryMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-300">Query Invoice</h3>
            <button
              onClick={() => {
                setQueryMode(false);
                clearAllSelection();
                setGeneralQuery(false);
                setQueryComment('');
              }}
              className="text-xs text-blue-400 hover:text-white transition"
            >
              ✕ Cancel
            </button>
          </div>

          {/* Selection summary — table handles the actual checkboxes */}
          {jobLines.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-sm">
              {selectedLineIds.size > 0 ? (
                <p className="text-amber-300">
                  <strong>{selectedLineIds.size}</strong> line
                  {selectedLineIds.size !== 1 ? 's' : ''} selected — tick rows in the
                  table above to add or remove them.
                </p>
              ) : generalQuery ? (
                <p className="text-blue-300">General query — no specific lines selected.</p>
              ) : (
                <p className="text-amber-400/80">
                  ← Tick rows in the table above to select lines, or use &quot;General
                  query&quot; below.
                </p>
              )}
            </div>
          )}

          {/* General query (no specific lines) */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
              generalQuery
                ? 'bg-blue-500/20 border-blue-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <input
              type="checkbox"
              checked={generalQuery}
              onChange={(e) => {
                setGeneralQuery(e.target.checked);
                if (e.target.checked) clearAllSelection();
              }}
              className="w-4 h-4 accent-blue-400 flex-shrink-0"
            />
            <span className="text-sm text-blue-300">General query (no specific lines)</span>
          </label>

          {selectedLineIds.size === 0 && !generalQuery && (
            <p className="text-xs text-amber-400">
              ⚠ Select at least one line in the table, or tick &quot;General query&quot;
            </p>
          )}

          {/* Query message */}
          <div>
            <label className="text-xs text-blue-400 mb-1 block">
              Query message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={queryComment}
              onChange={(e) => setQueryComment(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail so the subcontractor knows what to fix..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30 resize-none"
            />
          </div>

          <button
            onClick={handleQuery}
            disabled={loading || !canSubmitQuery}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
          >
            {loading ? 'Sending...' : '❓ Send Query'}
          </button>
        </div>
      )}

      {/* ── QUERIED — resolve panel ── */}
      {status === 'queried' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
            <p className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wide">
              Original Query
            </p>
            <p className="text-blue-200 text-sm whitespace-pre-wrap">
              {currentComment || 'No query text recorded.'}
            </p>
          </div>

          <div>
            <label className="text-xs text-blue-400 mb-1 block">
              Resolution Note <span className="text-red-400">*</span>
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              placeholder="Explain how this query has been resolved..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30 resize-none"
            />
            {!resolutionNote.trim() && (
              <p className="text-xs text-amber-400 mt-1">
                A resolution note is required before approving or rejecting.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleResolve('approved')}
              disabled={loading || !resolutionNote.trim()}
              className="py-2.5 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              ✓ Approve Invoice
            </button>
            <button
              onClick={() => handleResolve('rejected')}
              disabled={loading || !resolutionNote.trim()}
              className="py-2.5 px-4 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              ✗ Reject Invoice
            </button>
          </div>
        </div>
      )}

      {/* ── APPROVED / REJECTED — read-only ── */}
      {(status === 'approved' || status === 'rejected') && (
        <div className="text-center py-4">
          {status === 'approved' && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-300 font-semibold">✅ Invoice Approved</p>
              <p className="text-green-400/70 text-xs mt-1">No further action required.</p>
            </div>
          )}
          {status === 'rejected' && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-300 font-semibold">✗ Invoice Rejected</p>
              <p className="text-red-400/70 text-xs mt-1">No further action required.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-blue-400">Current status</p>
        <div className="mt-1">
          {status === 'approved' && (
            <span className="text-green-300 text-sm font-medium">✅ Approved</span>
          )}
          {status === 'rejected' && (
            <span className="text-red-300 text-sm font-medium">✗ Rejected</span>
          )}
          {status === 'queried' && (
            <span className="text-blue-300 text-sm font-medium">
              ❓ Queried — Awaiting Resolution
            </span>
          )}
          {status === 'pending' && (
            <span className="text-amber-300 text-sm font-medium">⏳ Pending Review</span>
          )}
        </div>
      </div>
    </div>
  );
}
