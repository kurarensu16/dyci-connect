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

const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const Calendar: React.FC = () => {
  // STATES
  const [currentYear, setCurrentYear] = useState(2025)
  const [currentMonth, setCurrentMonth] = useState(6) // July = 6
  const [selectedDate, setSelectedDate] = useState<string>('2025-07-01')
  const [selectedDates, setSelectedDates] = useState<string[]>(['2025-07-01'])
  const [isTargetRunnerOpen, setIsTargetRunnerOpen] = useState(false)
  const [eventTargetMode, setEventTargetMode] = useState<'multiple' | 'range'>(
    'multiple'
  )
  const [targetAction, setTargetAction] = useState<'add' | 'delete'>('add')
  const [manualTargetDate, setManualTargetDate] = useState('2025-07-01')
  const [rangeStartDay, setRangeStartDay] = useState<number | ''>('')
  const [rangeEndDay, setRangeEndDay] = useState<number | ''>('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEventIndexes, setSelectedEventIndexes] = useState<number[]>([])
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

  const toIsoByDay = (day: number) =>
    `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`

  const rangeDates =
    rangeStartDay === '' || rangeEndDay === ''
      ? []
      : (() => {
          const start = Math.min(rangeStartDay, rangeEndDay)
          const end = Math.max(rangeStartDay, rangeEndDay)
          if (start < 1 || end > daysInMonth) return []
          const dates: string[] = []
          for (let day = start; day <= end; day++) {
            dates.push(toIsoByDay(day))
          }
          return dates
        })()

  const activeTargetDates = Array.from(
    new Set(
      eventTargetMode === 'range'
        ? rangeDates
        : selectedDates.length > 0
          ? selectedDates
          : [selectedDate]
    )
  )

  const runTargetAction = () => {
    if (activeTargetDates.length === 0) return

    if (targetAction === 'add') {
      if (!newEventTitle.trim()) return
      setEvents([
        ...events,
        ...activeTargetDates.map((date) => ({
          date,
          title: newEventTitle.trim(),
          type: newEventType,
        })),
      ])
      setNewEventTitle('')
      setSelectedEventIndexes([])
      setIsTargetRunnerOpen(false)
      return
    }

    setEvents(events.filter((event) => !activeTargetDates.includes(event.date)))
    setSelectedEventIndexes([])
    setIsTargetRunnerOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold">School Calendar Editor</p>
            <p className="mt-1 text-xs text-blue-100">
              Manage academic calendar events
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

              <div className="flex items-center gap-2">
                <select
                  className="bg-blue-600 border border-blue-400 rounded px-2 py-1 text-xs text-white"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index} className="text-slate-900">
                      {month}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="w-20 bg-blue-600 border border-blue-400 rounded px-2 py-1 text-xs text-white"
                  value={currentYear}
                  onChange={(e) => {
                    const parsedYear = Number(e.target.value)
                    if (!Number.isNaN(parsedYear)) setCurrentYear(parsedYear)
                  }}
                />
              </div>

              {/* NEXT */}
              <button
                onClick={() => {
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
                    const isMultiPicked = selectedDates.includes(iso)
                    const isInRange = rangeDates.includes(iso)

                    return (
                      <button
                        key={di}
                        onClick={() => {
                          setSelectedDate(iso)
                          setManualTargetDate(iso)
                          setSelectedEventIndexes([])
                        }}
                        className={`h-16 border border-slate-100 text-left px-2 py-1 ${
                          isSelected
                            ? 'bg-blue-50'
                            : 'bg-white hover:bg-slate-50'
                        } ${!isSelected && (isMultiPicked || isInRange) ? 'bg-blue-50/60' : ''}`}
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
            <button
              className="w-full bg-blue-700 text-white py-1 rounded"
              onClick={() => setIsTargetRunnerOpen(true)}
            >
              Open Target Dates
            </button>

            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">Events on selected date</p>
                <button
                  className="text-red-500 disabled:text-slate-400"
                  disabled={selectedEventIndexes.length === 0}
                  onClick={() => {
                    setEvents(
                      events.filter((_, index) => !selectedEventIndexes.includes(index))
                    )
                    setSelectedEventIndexes([])
                  }}
                >
                  Delete Selected ({selectedEventIndexes.length})
                </button>
              </div>
              {events
                .map((event, idx) => ({ event, idx }))
                .filter(({ event }) => event.date === selectedDate)
                .map(({ event, idx }) => (
                  <div key={idx} className="flex justify-between items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEventIndexes.includes(idx)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEventIndexes((prev) => [...prev, idx])
                          } else {
                            setSelectedEventIndexes((prev) =>
                              prev.filter((value) => value !== idx)
                            )
                          }
                        }}
                      />
                      <span>{event.title}</span>
                    </label>
                    <button
                      className="text-red-500"
                      onClick={() => {
                        setEvents(events.filter((_, index) => index !== idx))
                        setSelectedEventIndexes([])
                      }}
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

      {isTargetRunnerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-lg p-4 text-xs">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Target Dates Runner</p>
              <button
                className="text-slate-500"
                onClick={() => setIsTargetRunnerOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mb-2 rounded border border-slate-200 p-1 grid grid-cols-2 gap-1 bg-slate-50">
              <button
                className={`py-1 rounded ${eventTargetMode === 'multiple' ? 'bg-white border border-slate-300' : 'text-slate-600'}`}
                onClick={() => setEventTargetMode('multiple')}
              >
                Multiple Dates
              </button>
              <button
                className={`py-1 rounded ${eventTargetMode === 'range' ? 'bg-white border border-slate-300' : 'text-slate-600'}`}
                onClick={() => setEventTargetMode('range')}
              >
                Date Range
              </button>
            </div>

            {eventTargetMode === 'multiple' ? (
              <div className="mb-2 border border-slate-200 rounded p-2">
                <p className="font-medium mb-1">Target Dates</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    className="flex-1 border px-2 py-1 rounded"
                    value={manualTargetDate}
                    onChange={(e) => setManualTargetDate(e.target.value)}
                  />
                  <button
                    className="border border-slate-300 px-2 rounded"
                    onClick={() => {
                      if (!manualTargetDate) return
                      setSelectedDates((prev) =>
                        prev.includes(manualTargetDate)
                          ? prev
                          : [...prev, manualTargetDate]
                      )
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-auto">
                  {selectedDates.length === 0 && (
                    <p className="text-slate-500">No dates selected</p>
                  )}
                  {selectedDates.map((date) => (
                    <div key={date} className="flex items-center justify-between">
                      <span>{date}</span>
                      <button
                        className="text-red-500"
                        onClick={() =>
                          setSelectedDates((prev) => prev.filter((d) => d !== date))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-2 border border-slate-200 rounded p-2 space-y-2">
                <p className="font-medium">Range in Current Month</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    placeholder="From day"
                    className="w-full border px-2 py-1 rounded"
                    value={rangeStartDay}
                    onChange={(e) => {
                      const value = e.target.value
                      setRangeStartDay(value ? Number(value) : '')
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    placeholder="To day"
                    className="w-full border px-2 py-1 rounded"
                    value={rangeEndDay}
                    onChange={(e) => {
                      const value = e.target.value
                      setRangeEndDay(value ? Number(value) : '')
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Example: 1 to 7 uses day 1-7 of selected month.
                </p>
              </div>
            )}

            <select
              className="w-full border px-2 py-1 rounded mb-2"
              value={targetAction}
              onChange={(e) => setTargetAction(e.target.value as 'add' | 'delete')}
            >
              <option value="add">Add Events</option>
              <option value="delete">Delete Events</option>
            </select>

            {targetAction === 'add' && (
              <>
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
              </>
            )}

            <div className="flex items-center justify-between">
              <p className="text-slate-500">Target count: {activeTargetDates.length}</p>
              <button
                className="bg-blue-700 text-white px-3 py-1 rounded disabled:bg-slate-300"
                disabled={activeTargetDates.length === 0}
                onClick={runTargetAction}
              >
                Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
