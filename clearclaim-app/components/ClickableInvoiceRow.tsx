'use client';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

export default function ClickableInvoiceRow({ inv, href }: { inv: any; href: string }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition group"
    >
      <td className="px-6 py-3">
        <p className="text-blue-300 group-hover:text-white font-medium text-sm">{inv.invoice_number}</p>
        <p className="text-blue-400/60 text-xs truncate max-w-[180px]">{inv.description}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-white text-sm">{inv.subcontractor_company}</p>
        <p className="text-blue-400/60 text-xs">{inv.subcontractor_name}</p>
      </td>
      <td className="px-4 py-3 text-white text-sm font-medium">
        £{inv.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={inv.status} />
      </td>
      <td className="px-4 py-3">
        {inv.flag_count > 0 && <FlagBadge score={inv.max_flag_score} />}
      </td>
      <td className="px-4 py-3 text-blue-400/60 text-xs">
        {new Date(inv.submitted_at).toLocaleDateString('en-GB')}
      </td>
    </tr>
  );
}
