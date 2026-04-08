'use client';

import { useState } from 'react';

interface Enquiry {
  id: number;
  customer_name: string;
  customer_phone: string;
  message: string;
  status: string;
  created_at: string;
}

export default function EnquiriesClient({ enquiries: initialEnquiries }: { enquiries: Enquiry[] }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function markAsRead(id: number) {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    });
    if (res.ok) {
      setEnquiries(enquiries.map((e) => (e.id === id ? { ...e, status: 'read' } : e)));
    }
  }

  const newCount = enquiries.filter((e) => e.status === 'new').length;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
          <span className="text-sm text-slate-400">Total </span>
          <span className="text-white font-bold">{enquiries.length}</span>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-400">Unread </span>
          <span className="text-blue-300 font-bold">{newCount}</span>
        </div>
      </div>

      {/* Enquiries list */}
      <div className="space-y-3">
        {enquiries.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center text-slate-500">
            No enquiries yet
          </div>
        ) : (
          enquiries.map((enq) => (
            <div
              key={enq.id}
              className={`bg-slate-800 border rounded-xl transition ${enq.status === 'new' ? 'border-blue-500/40' : 'border-slate-700'}`}
            >
              <div
                className="p-5 cursor-pointer"
                onClick={() => {
                  setExpanded(expanded === enq.id ? null : enq.id);
                  if (enq.status === 'new') markAsRead(enq.id);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{enq.customer_name}</span>
                      {enq.status === 'new' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">New</span>
                      )}
                    </div>
                    {enq.customer_phone && (
                      <p className="text-sm text-slate-500 mb-1">📞 {enq.customer_phone}</p>
                    )}
                    <p className={`text-sm ${expanded === enq.id ? 'text-slate-300' : 'text-slate-400 line-clamp-2'}`}>
                      {enq.message}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      {new Date(enq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(enq.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-slate-500 text-lg">{expanded === enq.id ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {expanded === enq.id && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-700 mt-0">
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{enq.message}</p>
                  </div>
                  {enq.status === 'new' && (
                    <button
                      onClick={() => markAsRead(enq.id)}
                      className="mt-3 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
