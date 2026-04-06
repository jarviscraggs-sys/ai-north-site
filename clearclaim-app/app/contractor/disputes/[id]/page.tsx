'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Dispute {
  id: number;
  invoice_number: string;
  invoice_amount: number;
  invoice_date: string;
  work_from: string;
  work_to: string;
  subcontractor_name: string;
  subcontractor_company: string;
  dispute_type: string;
  description: string;
  amount_disputed: number | null;
  status: string;
  pay_less_notice_date: string | null;
  payment_due_date: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface TimelineEntry {
  id: number;
  user_name: string;
  action: string;
  detail: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-red-500/20 text-red-300 border-red-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  escalated: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DisputeDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteAction, setNoteAction] = useState('note');
  const [noteDetail, setNoteDetail] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const loadData = async () => {
    const [dRes, tRes] = await Promise.all([
      fetch(`/api/disputes/${id}`),
      fetch(`/api/disputes/${id}/timeline`),
    ]);
    const dData = await dRes.json();
    const tData = await tRes.json();
    setDispute(dData.dispute);
    setTimeline(tData.entries || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const addNote = async () => {
    if (!noteDetail.trim()) return;
    setAddingNote(true);
    await fetch(`/api/disputes/${id}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: noteAction, detail: noteDetail }),
    });
    setNoteDetail('');
    await loadData();
    setAddingNote(false);
  };

  const resolveDispute = async () => {
    setResolving(true);
    await fetch(`/api/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolution_notes: resolutionNotes }),
    });
    await loadData();
    setResolving(false);
    setShowResolveForm(false);
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  if (loading) return <div className="text-blue-300 p-8">Loading...</div>;
  if (!dispute) return <div className="text-red-400 p-8">Dispute not found</div>;

  const invoiceDate = dispute.invoice_date?.split('T')[0] || dispute.invoice_date;
  const paymentDue = dispute.payment_due_date || (invoiceDate ? addDays(invoiceDate, 30) : null);
  const payLessDeadline = dispute.pay_less_notice_date || (paymentDue ? addDays(paymentDue, -7) : null);
  const now = new Date().toISOString().split('T')[0];
  const noticePassed = payLessDeadline ? payLessDeadline < now : false;
  const paymentPassed = paymentDue ? paymentDue < now : false;
  const daysOpen = daysBetween(dispute.created_at, new Date().toISOString());
  const daysOverdue = paymentDue && paymentPassed ? daysBetween(paymentDue, new Date().toISOString()) : 0;

  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/disputes" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">
          ← Back to Disputes
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dispute #{dispute.id}</h1>
            <p className="text-blue-300 mt-1">{dispute.subcontractor_company} · Invoice {dispute.invoice_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold px-3 py-1 rounded-lg border capitalize ${statusColors[dispute.status] || 'bg-white/10 text-white border-white/20'}`}>
              {dispute.status.replace('_', ' ')}
            </span>
            {dispute.status !== 'resolved' && (
              <>
                {dispute.status === 'open' && (
                  <button onClick={() => updateStatus('in_progress')} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition">
                    Mark In Progress
                  </button>
                )}
                <button onClick={() => setShowResolveForm(true)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition">
                  ✓ Resolve
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Dispute Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Dispute Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-blue-400 text-xs mb-1">Type</p><p className="text-white capitalize">{dispute.dispute_type}</p></div>
              <div><p className="text-blue-400 text-xs mb-1">Disputed Amount</p><p className="text-white font-semibold">{dispute.amount_disputed ? `£${fmt(dispute.amount_disputed)}` : '—'}</p></div>
              <div className="col-span-2"><p className="text-blue-400 text-xs mb-1">Description</p><p className="text-blue-200">{dispute.description}</p></div>
              <div><p className="text-blue-400 text-xs mb-1">Subcontractor</p><p className="text-white">{dispute.subcontractor_company}</p><p className="text-blue-400/60 text-xs">{dispute.subcontractor_name}</p></div>
              <div><p className="text-blue-400 text-xs mb-1">Days Open</p><p className={`font-semibold ${daysOpen > 30 ? 'text-red-400' : 'text-white'}`}>{dispute.status !== 'resolved' ? `${daysOpen} days` : 'Resolved'}</p></div>
            </div>
            {dispute.resolution_notes && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <p className="text-green-400 text-xs font-semibold mb-1">Resolution Notes</p>
                <p className="text-green-200 text-sm">{dispute.resolution_notes}</p>
              </div>
            )}
          </div>

          {/* Invoice Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Invoice Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-blue-400 text-xs mb-1">Invoice Number</p>
                <Link href={`/contractor/invoice/${dispute.id}`} className="text-blue-300 hover:text-white">{dispute.invoice_number}</Link>
              </div>
              <div><p className="text-blue-400 text-xs mb-1">Invoice Amount</p><p className="text-white font-semibold">£{fmt(dispute.invoice_amount)}</p></div>
              <div><p className="text-blue-400 text-xs mb-1">Submitted</p><p className="text-white">{new Date(dispute.invoice_date).toLocaleDateString('en-GB')}</p></div>
              <div><p className="text-blue-400 text-xs mb-1">Work Period</p><p className="text-white text-sm">{dispute.work_from && new Date(dispute.work_from).toLocaleDateString('en-GB')} – {dispute.work_to && new Date(dispute.work_to).toLocaleDateString('en-GB')}</p></div>
            </div>
          </div>
        </div>

        {/* Construction Act Compliance Panel */}
        <div className="space-y-4">
          <div className={`border rounded-2xl p-5 ${noticePassed ? 'bg-red-500/10 border-red-500/40' : 'bg-white/5 border-white/10'}`}>
            <h2 className="text-white font-semibold mb-4">⚖️ Construction Act</h2>
            <div className="space-y-3">
              <div>
                <p className="text-blue-400 text-xs mb-1">Invoice Date</p>
                <p className="text-white text-sm">{new Date(dispute.invoice_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-1">Payment Due</p>
                <p className={`text-sm font-medium ${paymentPassed ? 'text-red-400' : 'text-white'}`}>
                  {paymentDue ? new Date(paymentDue).toLocaleDateString('en-GB') : '—'}
                  {paymentPassed && <span className="ml-2 text-red-400">({daysOverdue}d overdue)</span>}
                </p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-1">Pay Less Notice Deadline</p>
                <p className={`text-sm font-medium ${noticePassed ? 'text-red-400' : 'text-amber-300'}`}>
                  {payLessDeadline ? new Date(payLessDeadline).toLocaleDateString('en-GB') : '—'}
                </p>
                <p className="text-blue-400/60 text-xs">(7 days before payment due)</p>
              </div>
            </div>

            {noticePassed && dispute.status !== 'resolved' && (
              <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-300 text-sm font-semibold">⚠️ Pay less notice deadline passed</p>
                <p className="text-red-200/70 text-xs mt-1">You may no longer be able to withhold payment under the Construction Act without legal risk.</p>
              </div>
            )}
            {!noticePassed && payLessDeadline && dispute.status !== 'resolved' && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-amber-300 text-sm font-semibold">Pay Less Notice must be served by:</p>
                <p className="text-amber-200 text-sm font-bold mt-1">{new Date(payLessDeadline).toLocaleDateString('en-GB')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Form */}
      {showResolveForm && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6">
          <h3 className="text-white font-semibold mb-3">Resolve Dispute</h3>
          <textarea
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            placeholder="Resolution notes (what was agreed, outcome, etc.)..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-blue-400/50 focus:outline-none focus:border-blue-500 mb-3"
            rows={3}
          />
          <div className="flex gap-3">
            <button onClick={resolveDispute} disabled={resolving} className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
              {resolving ? 'Resolving...' : 'Confirm Resolved'}
            </button>
            <button onClick={() => setShowResolveForm(false)} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Timeline</h2>

        {/* Add Entry Form */}
        {dispute.status !== 'resolved' && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex gap-3 mb-3">
              <select
                value={noteAction}
                onChange={e => setNoteAction(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="note">📝 Note</option>
                <option value="call">📞 Phone Call</option>
                <option value="email">✉️ Email Sent</option>
                <option value="letter">📮 Letter Sent</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="offer">💰 Settlement Offer</option>
                <option value="legal">⚖️ Legal Action</option>
              </select>
            </div>
            <textarea
              value={noteDetail}
              onChange={e => setNoteDetail(e.target.value)}
              placeholder="Add a timeline entry..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-blue-400/50 focus:outline-none focus:border-blue-500 mb-3"
              rows={2}
            />
            <button
              onClick={addNote}
              disabled={addingNote || !noteDetail.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
            >
              {addingNote ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        )}

        {/* Timeline Entries */}
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <p className="text-blue-400/60 text-sm text-center py-4">No timeline entries yet</p>
          ) : timeline.map(entry => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="w-px flex-1 bg-blue-900/50 mt-1" />
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="text-blue-400/50 text-xs">·</span>
                  <span className="text-blue-400/60 text-xs">{entry.user_name}</span>
                  <span className="text-blue-400/50 text-xs">·</span>
                  <span className="text-blue-400/60 text-xs">{new Date(entry.created_at).toLocaleDateString('en-GB')} {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {entry.detail && <p className="text-blue-200 text-sm">{entry.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
