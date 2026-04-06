export default function FlagBadge({ score }: { score: number }) {
  if (!score) return null;
  
  const isHigh = score > 70;
  const isMed = score > 40;

  if (isHigh) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
        🚨 HIGH {score}%
      </span>
    );
  }
  if (isMed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        ⚠️ MED {score}%
      </span>
    );
  }
  return null;
}
