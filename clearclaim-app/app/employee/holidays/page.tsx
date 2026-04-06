'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface DayData {
  employees: { name: string; initials: string; status: string; isMe: boolean }[];
  count: number;
  atCapacity: boolean;
}

interface CalendarData {
  days: Record<string, DayData>;
  maxPerDay: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon ... 6=Sun for a given date
function getMondayBasedDay(date: Date) {
  return (date.getDay() + 6) % 7;
}

export default function EmployeeHolidaysPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<{ used: number; total: number } | null>(null);

  const monthStr = getMonthString(currentDate);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, empRes] = await Promise.all([
        fetch(`/api/holidays/calendar?month=${monthStr}`),
        fetch('/api/employees/me'),
      ]);
      const calJson = await calRes.json();
      const empJson = await empRes.json();
      setCalendarData(calJson);
      if (empJson.id) setAllowance({ used: empJson.holiday_used, total: empJson.holiday_allowance });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getMondayBasedDay(new Date(year, month, 1));
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build grid cells (nulls for padding, then day numbers)
  const cells: (number | null)[] = [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayData = selectedDay ? calendarData?.days[selectedDay] : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Holidays</h1>
          <p className="text-gray-400 text-sm mt-1">View and manage your time off</p>
        </div>
        <Link href="/employee/holidays/request"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
          ➕ Request Holiday
        </Link>
      </div>

      {/* Allowance bar */}
      {allowance && (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-6 mb-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{allowance.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-300">{allowance.used}</div>
              <div className="text-xs text-gray-400">Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-300">{allowance.total - allowance.used}</div>
              <div className="text-xs text-gray-400">Remaining</div>
            </div>
            <div className="flex-1">
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((allowance.used / allowance.total) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 transition">
            ← Prev
          </button>
          <h2 className="text-lg font-semibold text-white">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 transition">
            Next →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {DAYS.map(d => (
            <div key={d} className={`py-2 text-center text-xs font-medium ${d === 'Sat' || d === 'Sun' ? 'text-gray-600' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-white/5 bg-white/2" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayOfWeek = getMondayBasedDay(new Date(dateStr));
              const isWeekend = dayOfWeek >= 5;
              const isToday = dateStr === todayStr;
              const dayData = calendarData?.days[dateStr];
              const atCapacity = dayData?.atCapacity ?? false;
              const isSelected = selectedDay === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => !isWeekend && setSelectedDay(isSelected ? null : dateStr)}
                  className={`
                    min-h-[80px] p-1.5 border-b border-r border-white/5 relative
                    ${isWeekend ? 'bg-white/[0.02] cursor-default' : 'cursor-pointer hover:bg-white/5 transition'}
                    ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}
                    ${isSelected ? 'bg-white/10' : ''}
                    ${atCapacity && !isWeekend ? 'bg-red-900/10' : ''}
                  `}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday ? 'text-blue-400' :
                    isWeekend ? 'text-gray-600' : 'text-gray-300'
                  }`}>
                    {day}
                  </div>

                  {/* Capacity warning */}
                  {atCapacity && !isWeekend && (
                    <div className="text-[9px] text-red-400 font-medium mb-0.5">⚠ Full</div>
                  )}

                  {/* Employee chips */}
                  <div className="flex flex-wrap gap-0.5">
                    {dayData?.employees.map((emp, i) => (
                      <span
                        key={i}
                        title={emp.name}
                        className={`
                          inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold
                          ${emp.isMe ? 'bg-emerald-500 text-white' : 'bg-blue-500/70 text-white'}
                        `}
                      >
                        {emp.initials.slice(0, 2)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day popover */}
      {selectedDay && (
        <div className="mt-4 bg-[#161b22] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white text-sm">✕</button>
          </div>

          {!selectedDayData || selectedDayData.employees.length === 0 ? (
            <p className="text-gray-400 text-sm">No one off on this day.</p>
          ) : (
            <>
              {selectedDayData.atCapacity && (
                <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
                  ⚠ Team capacity reached ({selectedDayData.count}/{calendarData?.maxPerDay} employees off)
                </div>
              )}
              <div className="space-y-2">
                {selectedDayData.employees.map((emp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${emp.isMe ? 'bg-emerald-500' : 'bg-blue-500/70'} text-white`}>
                      {emp.initials}
                    </span>
                    <span className="text-sm text-white">
                      {emp.name}
                      {emp.isMe && <span className="ml-2 text-xs text-emerald-400">(you)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 pt-3 border-t border-white/10">
            <Link
              href={`/employee/holidays/request?start=${selectedDay}`}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition"
            >
              + Request holiday starting this day
            </Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> My holidays
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500/70 inline-block" /> Team holidays
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/50 inline-block" /> At capacity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full ring-2 ring-blue-500 inline-block" /> Today
        </span>
      </div>
    </div>
  );
}
