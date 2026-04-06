'use client';

import { useState, useEffect, useCallback } from 'react';

interface ComplianceItem {
  id: number;
  subcontractor_id: number;
  subcontractor_name: string;
  subcontractor_company: string;
  document_type: string;
  document_name: string;
  expiry_date: string;
  status: string;
  notes: string;
}

const DOC_TYPES: Record<string, string> = {
  public_liability: 'Public Liability',
  employers_liability: 'Employers Liability',
  professional_indemnity: 'Professional Indemnity',
  cscs: 'CSCS Card',
  cis_registration: 'CIS Registration',
  vat_registration: 'VAT Registration',
  other: 'Other',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    valid: 'bg-green-500/20 text-green-300 border-green-500/30',
    expiring_soon: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    expired: 'bg-red-500/20 text-red-300 border-red-500/30',
    missing: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

type FilterType = 'all' | 'expired' | 'expiring_soon';

export default function ComplianceOverviewPage() {
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/compliance')
      .then(r => r.json())
      .then(d => setCompliance(d.compliance || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const expiringSoonCount = compliance.filter(c => c.status === 'expiring_soon').length;
  const expiredCount = compliance.filter(c => c.status === 'expired').length;

  const filtered = compliance.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🛡️ Compliance Tracker</h1>
        <p className="text-blue-300 mt-1 text-sm">Monitor subcontractor documents and certifications</p>
      </div>

      {(expiringSoonCount > 0 || expiredCount > 0) && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <p className="text-amber-300 font-semibold text-sm">
            ⚠️ {expiringSoonCount} document{expiringSoonCount !== 1 ? 's' : ''} expiring within 30 days
            {expiredCount > 0 && ` · ${expiredCount} expired`}
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['all', 'expiring_soon', 'expired'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-blue-900/20 text-blue-300 hover:text-white border border-blue-900/40'
            }`}
          >
            {f === 'all' ? 'All' : f === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
            {f !== 'all' && (
              <span className="ml-2 text-xs opacity-75">
                ({f === 'expiring_soon' ? expiringSoonCount : expiredCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-blue-300 text-sm">Loading compliance data...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <p className="text-blue-300">No compliance documents found for this filter.</p>
        </div>
      ) : (
        <div className="bg-[#0a1628] border border-blue-900/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/30">
                <th className="text-left text-blue-400 font-medium px-4 py-3">Subcontractor</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Document Type</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Document Name</th>
                <th className="text-left text-blue-400 font-medium px-4 py-3">Expiry Date</th>
                <th className="text-center text-blue-400 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-blue-900/20 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{item.subcontractor_company || item.subcontractor_name}</p>
                    <p className="text-blue-400 text-xs">{item.subcontractor_name}</p>
                  </td>
                  <td className="px-4 py-3 text-blue-300">{DOC_TYPES[item.document_type] || item.document_type}</td>
                  <td className="px-4 py-3 text-white">{item.document_name}</td>
                  <td className="px-4 py-3 text-blue-300">
                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
