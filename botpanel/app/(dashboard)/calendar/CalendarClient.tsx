'use client';

import { useState } from 'react';

interface Booking {
  id: number;
  customer_name: string;
  customer_phone: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

function statusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-yellow-500';
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }
}

export default function CalendarClient({ bookings: initialBookings }: { bookings: Booking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Make Monday = 0

  // Group bookings by date
  const bookingsByDate: Record<string, Booking[]> = {};
  for (const b of bookings) {
    if (!bookingsByDate[b.date]) bookingsByDate[b.date] = [];
    bookingsByDate[b.date].push(b);
  }

  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  function formatDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  async function updateStatus(id: number, status: string) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));
    }
  }

  const selectedBookings = selectedDay ? (bookingsByDate[selectedDay] || []) : [];

  return (
    <div className="flex gap-6">
      {/* Calendar */}
      <div className="flex-1">
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          {/* Calendar header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            >
              ◀
            </button>
            <h2 className="text-lg font-semibold text-white">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            >
              ▶
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-700">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month starts */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 border-b border-r border-slate-700/50 bg-slate-900/30" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(day);
              const dayBookings = bookingsByDate[dateStr] || [];
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDay;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`h-20 border-b border-r border-slate-700/50 p-2 cursor-pointer transition ${
                    isSelected ? 'bg-blue-900/30 border-blue-500/50' : 'hover:bg-slate-700/30'
                  }`}
                >
                  <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}>
                    {day}
                  </div>
                  {/* Booking dots */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayBookings.slice(0, 3).map((b) => (
                      <span key={b.id} className={`w-2 h-2 rounded-full ${statusColor(b.status)}`} />
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-xs text-slate-500">+{dayBookings.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Pending</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Confirmed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Cancelled</span>
        </div>
      </div>

      {/* Side panel */}
      {selectedDay && (
        <div className="w-80 bg-slate-800 rounded-xl border border-slate-700 h-fit">
          <div className="p-5 border-b border-slate-700">
            <h3 className="font-semibold text-white">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">{selectedBookings.length} appointment{selectedBookings.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {selectedBookings.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No appointments</p>
            ) : (
              selectedBookings.map((b) => (
                <div key={b.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm">{b.time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm font-medium">{b.customer_name}</p>
                  <p className="text-slate-400 text-xs">{b.service}</p>
                  {b.customer_phone && <p className="text-slate-500 text-xs mt-1">📞 {b.customer_phone}</p>}
                  <div className="flex gap-2 mt-2">
                    {b.status !== 'confirmed' && (
                      <button
                        onClick={() => updateStatus(b.id, 'confirmed')}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition"
                      >
                        Confirm
                      </button>
                    )}
                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => updateStatus(b.id, 'cancelled')}
                        className="text-xs px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
