'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function getWorkingDatesInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const dates: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const HOLIDAY_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'compassionate', label: 'Compassionate Leave' },
  { value: 'other', label: 'Other' },
];

interface DayData {
  employees: { name: string; initials: string; status: string; isMe: boolean }[];
  count: number;
  atCapacity: boolean;
}

function RequestHolidayForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('annual');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allowance, setAllowance] = useState<{ used: number; total: number } | null>(null);
  const [calendarConflicts, setCalendarConflicts] = useState<{ date: string; dayData: DayData; maxPerDay: number }[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const workingDays = countWorkingDays(startDate, endDate);
  const remaining = allowance ? allowance.total - allowance.used : 0;
  const remainingAfter = remaining - workingDays;
  const notEnoughDays = type === 'annual' && workingDays > remaining;

  const atCapacityConflicts = calendarConflicts.filter(c => c.dayData.atCapacity);
  const hasCapacityBlock = atCapacityConflicts.length > 0;

  useEffect(() => {
    fetch('/api/employees/me').then(r => r.json()).then(e => {
      if (e.id) setAllowance({ used: e.holiday_used, total: e.holiday_allowance });
    }).catch(() => {});
  }, []);

  // Check conflicts when dates change
  useEffect(() => {
    if (!startDate || !endDate || workingDays === 0) {
      setCalendarConflicts([]);
      return;
    }

    const months = new Set<string>();
    const dates = getWorkingDatesInRange(startDate, endDate);
    dates.forEach(d => months.add(d.slice(0, 7)));

    setCheckingConflicts(true);
    Promise.all([...months].map(m => fetch(`/api/holidays/calendar?month=${m}`).then(r => r.json())))
      .then(results => {
        const merged: Record<string, DayData> = {};
        let maxPerDay = 1;
        for (const r of results) {
          if (r.days) Object.assign(merged, r.days);
          if (r.maxPerDay) maxPerDay = r.maxPerDay;
        }
        const conflicts: { date: string; dayData: DayData; maxPerDay: number }[] = [];
        for (const d of dates) {
          if (merged[d]) conflicts.push({ date: d, dayData: merged[d], maxPerDay });
        }
        setCalendarConflicts(conflicts);
      })
      .catch(() => {})
      .finally(() => setCheckingConflicts(false));
  }, [startDate, endDate, workingDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (notEnoughDays) { setError('Not enough holiday allowance remaining.'); return; }
    if (workingDays === 0) { setError('Please select valid dates with at least 1 working day.'); return; }
    if (hasCapacityBlock) {
      const conflict = atCapacityConflicts[0];
      const name = conflict.dayData.employees.filter(e => !e.isMe).map(e => e.name).join(', ');
      const dateFormatted = new Date(conflict.date + 'T12:00:00').toLocaleDateString('en-GB');
      setError(`${name || 'Another employee'} is already off on ${dateFormatted} — this would exceed the team limit`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, days_requested: workingDays, type, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit request');
        return;
      }
      router.push('/employee/holidays');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Request Holiday</h1>
        <p className="text-gray-400 text-sm mt-1">Submit a holiday request for your manager to review</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
        )}

        <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {startDate && endDate && workingDays > 0 && (
            <div className={`rounded-lg p-3 text-sm ${notEnoughDays ? 'bg-red-900/20 border border-red-500/30' : 'bg-emerald-900/20 border border-emerald-500/30'}`}>
              <p className={notEnoughDays ? 'text-red-300' : 'text-emerald-300'}>
                This request will use <strong>{workingDays} working day{workingDays !== 1 ? 's' : ''}</strong>
                {allowance && (
                  <>
                    {' '}({remaining} remaining{' '}
                    {notEnoughDays
                      ? <span className="text-red-400">— not enough!</span>
                      : <>→ <strong>{remainingAfter} after</strong></>
                    })
                  </>
                )}
              </p>
            </div>
          )}

          {/* Conflict warnings */}
          {checkingConflicts && (
            <div className="text-xs text-gray-500">Checking team availability...</div>
          )}

          {!checkingConflicts && calendarConflicts.length > 0 && (
            <div className="space-y-2">
              {atCapacityConflicts.length > 0 && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm font-medium mb-2">⚠ Team capacity conflict</p>
                  {atCapacityConflicts.map(c => (
                    <div key={c.date} className="text-xs text-red-400">
                      {new Date(c.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' — '}
                      {c.dayData.employees.filter(e => !e.isMe).map(e => e.name).join(', ')} already off
                      ({c.dayData.count}/{c.maxPerDay} max)
                    </div>
                  ))}
                </div>
              )}

              {calendarConflicts.filter(c => !c.dayData.atCapacity).length > 0 && (
                <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-300 text-sm font-medium mb-2">ℹ Others also off on some of these days</p>
                  {calendarConflicts.filter(c => !c.dayData.atCapacity).slice(0, 5).map(c => (
                    <div key={c.date} className="text-xs text-amber-400">
                      {new Date(c.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' — '}
                      {c.dayData.employees.filter(e => !e.isMe).map(e => e.name).join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Leave Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {HOLIDAY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional information..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || workingDays === 0 || notEnoughDays || hasCapacityBlock}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          <a href="/employee/holidays" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl transition text-center">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

export default function RequestHolidayPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
      <RequestHolidayForm />
    </Suspense>
  );
}
