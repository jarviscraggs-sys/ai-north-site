export default function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string; label: string }> = {
    pending:  { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  dot: 'bg-amber-400',  label: 'Pending'  },
    approved: { bg: 'bg-green-500/20 text-green-300 border-green-500/30',  dot: 'bg-green-400',  label: 'Approved' },
    rejected: { bg: 'bg-red-500/20 text-red-300 border-red-500/30',        dot: 'bg-red-400',    label: 'Rejected' },
    queried:  { bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30', dot: 'bg-orange-400', label: 'Queried'  },
  };

  const cfg = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
