import React, { useState } from 'react'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  date: string // ISO date string '2025-12-20'
  title: string
  type: EventType
  description?: string
}

const events: CalendarEvent[] = [
  { date: '2025-12-15', title: 'Final Examination', type: 'exam' },
  { date: '2025-12-16', title: 'Final Examination', type: 'exam' },
  { date: '2025-12-17', title: 'Final Examination', type: 'exam' },
  { date: '2025-12-18', title: 'Final Examination', type: 'exam' },
  { date: '2025-12-19', title: 'Final Examination', type: 'exam' },
  { date: '2025-12-20', title: 'End of First Semester', type: 'class', description: 'Classes' },
  { date: '2025-12-21', title: 'Christmas Break', type: 'holiday' },
  { date: '2025-12-25', title: 'Christmas Day', type: 'holiday' },
  { date: '2025-12-30', title: 'Rizal Day', type: 'holiday' },
]

const getEventsForDate = (iso: string) =>
  events.filter((e) => e.date === iso)

const formatDateLong = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const FacultyCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2025-12-20')

  const daysInMonth = 31
  const firstDayOfWeek = new Date('2025-12-01').getDay() // 0=Sun

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

  const selectedEvents = getEventsForDate(selectedDate)

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">School Calendar</h1>
          <p className="mt-1 text-xs text-blue-100">
            Academic Year 2025–2026
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar panel */}
          <section className="flex-1 bg-white rounded-2xl shadow-md border border-slate-100 p-4">
            {/* Month header */}
            <div className="bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center justify-between mb-3">
              <button
                type="button"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-300 text-white/90"
              >
                {'<'}
              </button>
              <div className="text-center text-xs">
                <p className="font-semibold">December</p>
                <p className="text-blue-100">2025</p>
              </div>
              <button
                type="button"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-300 text-white/90"
              >
                {'>'}
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 text-[11px] font-medium text-slate-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 text-xs">
                  {week.map((day, di) => {
                    if (!day) {
                      return <div key={di} className="h-16 border border-slate-100 bg-slate-50" />
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
                              isSelected ? 'bg-blue-600 text-white' : 'text-slate-700'
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
          </section>

          {/* Selected date events panel */}
          <aside className="w-full lg:w-80 bg-white rounded-2xl shadow-md border border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Selected Date Events
            </h2>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700 mb-3">
              {formatDateLong(selectedDate)}
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">
                No scheduled events for this date.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-emerald-800">
                      {ev.title}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      {ev.description || legendLabel[ev.type]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Legend */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Event Types</h3>
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

export default FacultyCalendar


