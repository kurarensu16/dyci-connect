import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  id?: string
  date: string
  title: string
  type: EventType
  description?: string
}

const StudentCalendar: React.FC = () => {
  const { user } = useAuth()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10))
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth())
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('calendar_events').select('*')
      if (error) {
        console.error('Error fetching events:', error)
      } else if (data) {
        setEvents(data)
      }
    }
    fetchEvents()
  }, [])

  const getEventsForDate = (iso: string) =>
    events.filter((e: CalendarEvent) => e.date === iso)



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
      setCurrentYear((y: number) => y - 1)
    } else {
      setCurrentMonth((m: number) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y: number) => y + 1)
    } else {
      setCurrentMonth((m: number) => m + 1)
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
      {/* Dark blue header bar, like admin dashboard */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">
            Welcome back, {user?.user_metadata?.full_name || 'Student'}!
          </h1>
          <p className="mt-1 text-xs text-blue-100">
            Here&apos;s what&apos;s happening with your academic journey today.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* CALENDAR */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              {/* MONTH BAR */}
              <div className="bg-slate-50 border-b border-slate-100 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800 w-48 transition-all">
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    <button
                      onClick={prevMonth}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors text-slate-600"
                    >
                      <span className="text-lg">←</span>
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date()
                        setCurrentMonth(d.getMonth())
                        setCurrentYear(d.getFullYear())
                      }}
                      className="px-3 text-xs font-bold text-slate-500 hover:text-dyci-blue transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={nextMonth}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors text-slate-600"
                    >
                      <span className="text-lg">→</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-dyci-blue/20 outline-none transition-all"
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  >
                    {monthNames.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-dyci-blue/20 outline-none transition-all"
                    value={currentYear}
                    onChange={(e) => {
                      const parsedYear = Number(e.target.value)
                      if (!Number.isNaN(parsedYear)) setCurrentYear(parsedYear)
                    }}
                  />
                </div>
              </div>

              {/* WEEKDAYS */}
              <div className="px-6 grid grid-cols-7 border-b border-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-3 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* DAYS GRID */}
              <div className="">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-slate-50 last:border-0">
                    {week.map((day, di) => {
                      if (!day) {
                        return (
                          <div
                            key={di}
                            className="h-24 bg-slate-50/50 border-r border-slate-50 last:border-r-0"
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
                      const isToday = new Date().toISOString().slice(0, 10) === iso

                      return (
                        <button
                          key={di}
                          onClick={() => setSelectedDate(iso)}
                          className={`h-24 border-r border-slate-50 last:border-r-0 text-left px-3 py-2 group relative transition-all ${
                            isSelected ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                                isSelected
                                  ? 'bg-dyci-blue text-white shadow-lg shadow-dyci-blue/30 scale-110'
                                  : isToday 
                                    ? 'bg-dyci-red text-white shadow-lg shadow-dyci-red/30'
                                    : 'text-slate-700 group-hover:text-dyci-blue'
                              }`}
                            >
                              {day}
                            </span>
                          </div>

                          <div className="space-y-1.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((ev: CalendarEvent, idx: number) => (
                              <div
                                key={ev.id || idx}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold text-white truncate shadow-sm ${eventBadgeClasses[ev.type]}`}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[9px] font-black text-slate-400 pl-1 uppercase tracking-tighter">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                          
                          {isSelected && (
                             <div className="absolute inset-0 border-2 border-dyci-blue rounded-none pointer-events-none" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* LEGEND */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest mb-4">
                  Event Color Key
                </h3>
                <div className="flex flex-wrap gap-8">
                  {(Object.keys(eventBadgeClasses) as EventType[]).map((type) => (
                    <div key={type} className="flex items-center space-x-3 group cursor-default">
                      <span
                        className={`h-4 w-4 rounded-full shadow-inner ring-4 ring-slate-50 transition-transform group-hover:scale-125 ${eventBadgeClasses[type]}`}
                      />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{legendLabel[type]}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          {/* RIGHT PANEL - SELECTED DATE */}
          <aside className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sticky top-24">
              <div className="mb-6 border-b border-slate-100 pb-6">
                <h3 className="text-sm uppercase font-black text-slate-400 tracking-widest mb-1">Schedule Details</h3>
                <p className="text-2xl font-black text-slate-900 leading-tight">
                  {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Events</p>

                <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                  {selectedEvents.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 px-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                         <span className="text-slate-400">📅</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">No Events Scheduled</p>
                      <p className="text-[10px] text-slate-400 mt-1">Check another date for activities</p>
                    </div>
                  ) : (
                    selectedEvents.map((event: CalendarEvent, idx: number) => (
                        <div key={event.id || idx} className="group relative flex flex-col gap-1 p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all shadow-sm">
                          <div className="flex items-center gap-2">
                             <span className={`h-2 w-2 rounded-full ${eventBadgeClasses[event.type]}`} />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{event.type}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 leading-snug">{event.title}</p>
                          {event.description && (
                             <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                          )}
                        </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default StudentCalendar