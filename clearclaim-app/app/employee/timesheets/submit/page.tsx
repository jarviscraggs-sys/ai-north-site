'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

type DayKey = typeof DAYS[number];

export default function SubmitTimesheetPage() {
  const router = useRouter();
  const [weekStarting, setWeekStarting] = useState(getMondayOfCurrentWeek());
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [hours, setHours] = useState<Record<DayKey, string>>({ mon: '0', tue: '0', wed: '0', thu: '0', fri: '0', sat: '0', sun: '0' });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || [])).catch(() => {});
  }, []);

  const totalHours = DAYS.reduce((sum, d) => sum + (parseFloat(hours[d]) || 0), 0);
  const hasOvertimeDay = DAYS.some(d => (parseFloat(hours[d]) || 0) > 8);
  const hasOvertimeWeek = totalHours > 40;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body: any = { week_starting: weekStarting, notes: notes || undefined };
      if (projectId) body.project_id = Number(projectId);
      DAYS.forEach(d => { body[`${d}_hours`] = parseFloat(hours[d]) || 0; });

      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit timesheet');
        return;
      }
      router.push('/employee/timesheets');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Submit Timesheet</h1>
        <p className="text-gray-400 text-sm mt-1">Log your hours for the week</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
        )}

        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Week Starting (Monday)</label>
            <input
              type="date"
              value={weekStarting}
              onChange={e => setWeekStarting(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project (optional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— No project —</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hours grid */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Daily Hours</h2>
          <div className="grid grid-cols-7 gap-3">
            {DAYS.map(day => {
              const val = parseFloat(hours[day]) || 0;
              const isOT = val > 8;
              return (
                <div key={day}>
                  <label className="block text-xs text-gray-400 text-center mb-1">{DAY_LABELS[day]}</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hours[day]}
                    onChange={e => setHours(h => ({ ...h, [day]: e.target.value }))}
                    className={`w-full px-2 py-2 text-center rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition
                      ${isOT ? 'bg-amber-500/10 border border-amber-500/50' : 'bg-white/5 border border-white/10'}`}
                  />
                  {isOT && <div className="text-xs text-amber-400 text-center mt-1">OT</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-sm text-gray-400">Total Hours</span>
            <div className="text-right">
              <span className={`text-xl font-bold ${hasOvertimeWeek ? 'text-amber-300' : 'text-white'}`}>{totalHours}h</span>
              {hasOvertimeDay && <div className="text-xs text-amber-400">⚠️ Some days exceed 8 hours</div>}
              {hasOvertimeWeek && <div className="text-xs text-amber-400">⚠️ Weekly overtime ({totalHours - 40}h over 40)</div>}
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes about this timesheet..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || totalHours === 0}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Submitting...' : 'Submit Timesheet'}
          </button>
          <a href="/employee/timesheets" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl transition text-center">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
