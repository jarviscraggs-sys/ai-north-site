'use client';

interface JobLine {
  id: number;
  job_code: string;
  area: string;
  description: string;
  line_value: number;
}

interface JobLinesTableProps {
  jobLines: JobLine[];
  queryMode: boolean;
  selectedLineIds: Set<number>;
  onToggleLine: (id: number) => void;
  flaggedLineKeys?: string[];
  totalAmount: number;
}

export default function JobLinesTable({
  jobLines,
  queryMode,
  selectedLineIds,
  onToggleLine,
  flaggedLineKeys = [],
  totalAmount,
}: JobLinesTableProps) {
  const flaggedSet = new Set(flaggedLineKeys.map((k) => k.toLowerCase()));

  const fmt = (n: number) =>
    Number(n).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-4">
        Job Lines ({jobLines.length})
        {queryMode && (
          <span className="ml-2 text-xs font-normal text-amber-400">
            — click a row to select it for the query
          </span>
        )}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-blue-200 border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {queryMode && <th className="py-2 pr-2 w-8" />}
              <th className="text-left py-2 pr-3 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Job Code
              </th>
              <th className="text-left py-2 pr-3 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Area
              </th>
              <th className="text-left py-2 pr-3 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Description
              </th>
              <th className="text-right py-2 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {jobLines.map((line) => {
              const sig = `${line.job_code} / ${line.area}`.toLowerCase();
              const isFlagged = flaggedSet.has(sig);
              const isSelected = queryMode && selectedLineIds.has(line.id);

              // Row background
              let rowBg = '';
              if (isSelected) {
                rowBg = 'bg-amber-500/20';
              } else if (isFlagged && !queryMode) {
                rowBg = 'bg-red-500/15';
              } else if (isFlagged && queryMode) {
                rowBg = 'bg-red-500/10 hover:bg-amber-500/10';
              } else if (queryMode) {
                rowBg = 'hover:bg-white/5';
              }

              return (
                <tr
                  key={line.id}
                  className={`border-b border-white/5 transition-colors ${rowBg} ${
                    queryMode ? 'cursor-pointer' : ''
                  }`}
                  onClick={queryMode ? () => onToggleLine(line.id) : undefined}
                >
                  {/* Checkbox cell */}
                  {queryMode && (
                    <td
                      className={`py-2.5 pr-2 ${
                        isSelected ? 'border-l-4 border-amber-400' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleLine(line.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-amber-400"
                      />
                    </td>
                  )}

                  {/* Job Code */}
                  <td
                    className={`py-2.5 pr-3 ${
                      !queryMode && isSelected
                        ? 'border-l-4 border-amber-400'
                        : ''
                    }`}
                  >
                    {isFlagged && <span className="text-red-400 mr-1">🚨</span>}
                    <span className={isFlagged ? 'text-red-300' : 'text-white'}>
                      {line.job_code}
                    </span>
                  </td>

                  {/* Area */}
                  <td className="py-2.5 pr-3">{line.area}</td>

                  {/* Description */}
                  <td className="py-2.5 pr-3 text-blue-300/80">{line.description}</td>

                  {/* Value */}
                  <td className="py-2.5 text-right font-medium text-white">
                    £{fmt(line.line_value)}
                  </td>
                </tr>
              );
            })}

            {/* Total row */}
            <tr className="border-t-2 border-white/20">
              {queryMode && <td />}
              <td
                colSpan={3}
                className="py-2.5 text-right font-bold text-white text-sm uppercase tracking-wide"
              >
                Total
              </td>
              <td className="py-2.5 text-right font-bold text-white text-base">
                £{fmt(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
