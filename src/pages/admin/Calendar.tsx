import React, { useState } from 'react'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  date: string
  title: string
  type: EventType
}

const events: CalendarEvent[] = [
  { date: '2025-12-15', title: 'Final', type: 'exam' },
  { date: '2025-12-16', title: 'Final', type: 'exam' },
  { date: '2025-12-17', title: 'Final', type: 'exam' },
  { date: '2025-12-18', title: 'Final', type: 'exam' },
  { date: '2025-12-19', title: 'Final', type: 'exam' },
  { date: '2025-12-20', title: 'End of First', type: 'class' },
  { date: '2025-12-21', title: 'Christmas', type: 'holiday' },
  { date: '2025-12-25', title: 'Christmas', type: 'holiday' },
  { date: '2025-12-30', title: 'Rizal Day', type: 'holiday' },
]

const getEventsForDate = (iso: string) =>
  events.filter((e) => e.date === iso)

const eventBadgeClasses: Record<EventType, string> = {
  holiday: 'bg-rose-500',
  exam: 'bg-orange-500',
  class: 'bg-emerald-500',
  enrollment: 'bg-blue-500',
  event: 'bg-violet-500',
}

const legendLabel: Record<EventType, string> = {
  holiday: 'Holidays',
  exam: 'Examinations',
  class: 'Classes',
  enrollment: 'Enrollment',
  event: 'Events',
}

const AdminCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2025-12-20')

  const daysInMonth = 31
  const firstDayOfWeek = new Date('2025-12-01').getDay()

  const weeks: Array<Array<number | null>> = []
  let currentDay = 1 - firstDayOfWeek
  while (currentDay <= daysInMonth) {
    const week: Array<number | null> = []
    for (let i = 0; i < 7; i++) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        week.push(null)
      } else {
        week.push(currentDay)
      }
      currentDay++
    }
    weeks.push(week)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold">School Calendar Editor</p>
            <p className="mt-1 text-xs text-blue-100">
              Manage academic calendar events for 2025–2026
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 shadow-sm"
          >
            + Add Event
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar editor */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            {/* Month bar */}
            <div className="bg-blue-700 text-white flex items-center justify-between px-4 py-3 rounded-t-lg">
              <button
                type="button"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-400 text-white/90"
              >
                {'<'}
              </button>
              <div className="text-xs text-center">
                <p className="font-semibold">December 2025</p>
              </div>
              <button
                type="button"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-400 text-white/90"
              >
                {'>'}
              </button>
            </div>

            {/* Weekdays */}
            <div className="px-4 pt-3 pb-1 grid grid-cols-7 text-[11px] font-medium text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="px-4 pb-4 space-y-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 text-xs">
                  {week.map((day, di) => {
                    if (!day) {
                      return (
                        <div
                          key={di}
                          className="h-16 border border-slate-100 bg-slate-50"
                        />
                      )
                    }

                    const iso = `2025-12-${day.toString().padStart(2, '0')}`
                    const dayEvents = getEventsForDate(iso)
                    const isSelected = selectedDate === iso

                    return (
                      <button
                        key={di}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        className={`h-16 border border-slate-100 text-left px-2 py-1 align-top ${
                          isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                              isSelected
                                ? 'bg-blue-700 text-white'
                                : 'text-slate-700'
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.map((ev, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] text-white ${eventBadgeClasses[ev.type]}`}
                            >
                              {ev.title}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: manage events */}
          <aside className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-4 flex flex-col items-center justify-center text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-900 mb-2">
              Click a date to manage events
            </p>
            <div className="h-14 w-14 rounded-full border border-slate-200 flex items-center justify-center mb-2">
              <span className="text-slate-400 text-2xl">📅</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select a date in the calendar to add, edit, or remove events.
            </p>
          </aside>
        </section>

        {/* Legend */}
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Event Types
          </h3>
          <div className="flex flex-wrap gap-6 text-xs text-slate-700">
            {(Object.keys(eventBadgeClasses) as EventType[]).map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <span
                  className={`h-3 w-3 rounded-full ${eventBadgeClasses[type]}`}
                />
                <span>{legendLabel[type]}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminCalendar


