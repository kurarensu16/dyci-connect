import React, { useState, useEffect } from 'react'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  date: string
  title: string
  type: EventType
  description?: string
}

const FacultyCalendar: React.FC = () => {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10))
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth())
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Fetch events from backend
  useEffect(() => {
    fetch('/api/events') // <-- replace with your backend endpoint
      .then((res) => res.json())
      .then((data: CalendarEvent[]) => setEvents(data))
      .catch((err) => console.error('Error fetching events:', err))
  }, [])

  const getEventsForDate = (iso: string) => events.filter((e) => e.date === iso)

  const formatDateLong = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()

  const weeks: Array<Array<number | null>> = []
  let currentDay = 1 - firstDayOfWeek
  while (currentDay <= daysInMonth) {
    const week: Array<number | null> = []
    for (let i = 0; i < 7; i++) {
      week.push(currentDay < 1 || currentDay > daysInMonth ? null : currentDay)
      currentDay++
    }
    weeks.push(week)
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
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
          <h1 className="text-xl font-semibold">Faculty Calendar</h1>
          <p className="mt-1 text-xs text-blue-100">
            Academic Year {currentYear}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar panel */}
          <section className="flex-1 bg-white rounded-2xl shadow-md border border-slate-100 p-4">
            {/* Month header */}
            <div className="bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center justify-between mb-3">
              {/* Left arrow */}
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-300 text-white/90"
              >
                {'<'}
              </button>

              {/* Month & Year dropdowns */}
              <div className="flex items-center gap-2">
                <select
                  className="rounded px-2 py-1 text-sm text-white bg-blue-600 border border-blue-400"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx} className="text-black">
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded px-2 py-1 text-sm text-white bg-blue-600 border border-blue-400"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                >
                  {Array.from({ length: 201 }, (_, i) => 1900 + i).map((y) => (
                    <option key={y} value={y} className="text-black">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right arrow */}
              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-blue-300 text-white/90"
              >
                {'>'}
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 text-[11px] font-medium text-slate-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 text-xs">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="h-16 border border-slate-100 bg-slate-50" />

                    const iso = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
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
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Selected Date Events</h2>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700 mb-3">
              {formatDateLong(selectedDate)}
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No scheduled events for this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev, idx) => (
                  <div key={idx} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-800">{ev.title}</p>
                    <p className="mt-1 text-[11px] text-emerald-700">{ev.description || legendLabel[ev.type]}</p>
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
                <span className={`h-3 w-3 rounded-full ${eventBadgeClasses[type]}`} />
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