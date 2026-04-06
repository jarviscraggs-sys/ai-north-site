'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Project {
  id: number;
  name: string;
  reference: string;
  address: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: string;
  total_invoiced: number;
  total_approved: number;
  total_variations: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  subcontractor_name: string;
  subcontractor_company: string;
  amount: number;
  status: string;
  submitted_at: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    queried: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    on_hold: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/projects/${params.id}`)
      .then(r => r.json())
      .then(d => {
        setProject(d.project || null);
        setInvoices(d.invoices || []);
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-300 text-sm">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-blue-300">Project not found.</p>
        <Link href="/contractor/projects" className="mt-4 inline-block text-blue-400 hover:text-white text-sm">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const adjustedContractValue = project.contract_value + project.total_variations;
  const remaining = adjustedContractValue - project.total_approved;
  const pct = adjustedContractValue > 0 ? Math.min(100, (project.total_approved / adjustedContractValue) * 100) : 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/contractor/projects" className="text-blue-400 hover:text-white transition text-sm">
          ← Back to Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {statusBadge(project.status)}
          </div>
          {project.reference && <p className="text-blue-400 text-sm">Ref: {project.reference}</p>}
          {project.address && <p className="text-blue-400/70 text-xs mt-0.5">{project.address}</p>}
        </div>
      </div>

      {/* Contract Value Tracker */}
      {pct > 90 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <p className="text-red-300 font-semibold text-sm">⚠️ This project is over 90% spent</p>
          <p className="text-red-400/80 text-xs mt-1">Approved spend ({fmt(project.total_approved)}) has exceeded 90% of the adjusted contract value ({fmt(adjustedContractValue)}).</p>
        </div>
      )}

      <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-5">💰 Contract Value Tracker</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-blue-400 text-xs mb-1">Contract Value</p>
            <p className="text-white font-bold text-lg">{fmt(project.contract_value)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-1">Variations Added</p>
            <p className="text-green-300 font-bold text-lg">{fmt(project.total_variations)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-1">Adjusted Contract Value</p>
            <p className="text-white font-bold text-lg">{fmt(adjustedContractValue)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-1">Invoiced to Date</p>
            <p className="text-white font-semibold">{fmt(project.total_invoiced)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-1">Approved to Date</p>
            <p className="text-green-300 font-semibold">{fmt(project.total_approved)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-1">Remaining</p>
            <p className={`font-semibold ${remaining < 0 ? 'text-red-300' : 'text-white'}`}>{fmt(Math.max(0, remaining))}</p>
          </div>
        </div>

        {adjustedContractValue > 0 && (
          <div>
            <div className="flex justify-between text-xs text-blue-400 mb-1">
              <span>% Spent (approved vs adjusted contract)</span>
              <span className={pct > 90 ? 'text-red-400 font-bold' : pct > 75 ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-blue-900/30 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct > 75 && pct <= 90 && (
              <p className="text-amber-400 text-xs mt-2">⚠️ Over 75% spent — approaching contract limit</p>
            )}
          </div>
        )}
      </div>

      {/* Project dates */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">Start Date</p>
          <p className="text-white">{project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : '—'}</p>
        </div>
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-4">
          <p className="text-blue-400 text-xs mb-1">End Date</p>
          <p className="text-white">{project.end_date ? new Date(project.end_date).toLocaleDateString('en-GB') : '—'}</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-blue-900/30">
          <h2 className="text-base font-semibold text-white">Invoices ({invoices.length})</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-blue-400 text-sm">No invoices for this project yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="text-left text-blue-400 font-medium px-4 py-3">Invoice #</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                <th className="text-right text-blue-400 font-medium px-4 py-3">Amount</th>
                <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Submitted</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-blue-900/20 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-mono font-semibold">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{inv.subcontractor_company || inv.subcontractor_name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-blue-400 text-xs">
                    {new Date(inv.submitted_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contractor/invoice/${inv.id}`}
                      className="text-xs text-blue-400 hover:text-white"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
