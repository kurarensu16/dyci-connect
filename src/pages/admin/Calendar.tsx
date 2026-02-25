import React, { useState } from 'react'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  date: string
  title: string
  type: EventType
}

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

const Calendar: React.FC = () => {
  // STATES
  const [currentYear, setCurrentYear] = useState(2025)
  const [currentMonth, setCurrentMonth] = useState(6) // July = 6
  const [selectedDate, setSelectedDate] = useState<string>('2025-07-01')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventType, setNewEventType] = useState<EventType>('holiday')

  // DYNAMIC DAYS
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()

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

  const getEventsForDate = (iso: string) =>
    events.filter((e) => e.date === iso)

  const monthName = new Date(currentYear, currentMonth).toLocaleString(
    'default',
    { month: 'long' }
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold">School Calendar Editor</p>
            <p className="mt-1 text-xs text-blue-100">
              Manage academic calendar events (July 2025 – July 2026)
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CALENDAR */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            {/* MONTH BAR */}
            <div className="bg-blue-700 text-white flex items-center justify-between px-4 py-3 rounded-t-lg">
              {/* PREV */}
              <button
                onClick={() => {
                  if (currentYear === 2025 && currentMonth === 6) return
                  if (currentMonth === 0) {
                    setCurrentMonth(11)
                    setCurrentYear(currentYear - 1)
                  } else {
                    setCurrentMonth(currentMonth - 1)
                  }
                }}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-400"
              >
                {'<'}
              </button>

              <p className="font-semibold">
                {monthName} {currentYear}
              </p>

              {/* NEXT */}
              <button
                onClick={() => {
                  if (currentYear === 2026 && currentMonth === 6) return
                  if (currentMonth === 11) {
                    setCurrentMonth(0)
                    setCurrentYear(currentYear + 1)
                  } else {
                    setCurrentMonth(currentMonth + 1)
                  }
                }}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-400"
              >
                {'>'}
              </button>
            </div>

            {/* WEEKDAYS */}
            <div className="px-4 pt-3 pb-1 grid grid-cols-7 text-[11px] font-medium text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* DAYS GRID */}
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

                    const iso = `${currentYear}-${(currentMonth + 1)
                      .toString()
                      .padStart(2, '0')}-${day
                      .toString()
                      .padStart(2, '0')}`

                    const dayEvents = getEventsForDate(iso)
                    const isSelected = selectedDate === iso

                    return (
                      <button
                        key={di}
                        onClick={() => setSelectedDate(iso)}
                        className={`h-16 border border-slate-100 text-left px-2 py-1 ${
                          isSelected
                            ? 'bg-blue-50'
                            : 'bg-white hover:bg-slate-50'
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

          {/* RIGHT PANEL - MANAGE EVENTS */}
          <aside className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-4 text-xs">
            <p className="font-semibold mb-2">Manage Events</p>
            <p className="mb-2 text-slate-600">Selected: {selectedDate}</p>

            <input
              type="text"
              placeholder="Event title"
              className="w-full border px-2 py-1 rounded mb-2"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
            />

            <select
              className="w-full border px-2 py-1 rounded mb-2"
              value={newEventType}
              onChange={(e) =>
                setNewEventType(e.target.value as EventType)
              }
            >
              <option value="holiday">Holiday</option>
              <option value="exam">Exam</option>
              <option value="class">Class</option>
              <option value="enrollment">Enrollment</option>
              <option value="event">Event</option>
            </select>

            <button
              className="w-full bg-blue-700 text-white py-1 rounded"
              onClick={() => {
                if (!newEventTitle) return
                setEvents([
                  ...events,
                  { date: selectedDate, title: newEventTitle, type: newEventType },
                ])
                setNewEventTitle('')
              }}
            >
              Add Event
            </button>

            <div className="mt-4 space-y-1">
              {events
                .filter((e) => e.date === selectedDate)
                .map((e, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>{e.title}</span>
                    <button
                      className="text-red-500"
                      onClick={() =>
                        setEvents(events.filter((_, idx) => idx !== i))
                      }
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          </aside>
        </section>

        {/* LEGEND */}
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

export default Calendar