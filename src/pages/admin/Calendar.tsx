import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { fetchSchoolSettings, updateAcademicYear, removeGraduates } from '../../lib/api/settings'

type EventType = 'holiday' | 'exam' | 'class' | 'enrollment' | 'event'

interface CalendarEvent {
  id?: string
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
  const { user } = useAuth()
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

  // GLOBAL SETTINGS
  const [globalAcademicYear, setGlobalAcademicYear] = useState('2025-2026')
  const [savingYear, setSavingYear] = useState(false)
  const [showRemoveGradsModal, setShowRemoveGradsModal] = useState(false)
  const [removingGrads, setRemovingGrads] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await fetchSchoolSettings()
      if (data) {
        setGlobalAcademicYear(data.current_academic_year)
      }
    }
    loadSettings()

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
    events.filter((e: CalendarEvent) => e.date === iso)

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

  const runTargetAction = async () => {
    if (activeTargetDates.length === 0) return

    if (targetAction === 'add') {
      if (!newEventTitle.trim()) return
      
      const newEvents = activeTargetDates.map((date) => ({
        date,
        title: newEventTitle.trim(),
        type: newEventType,
      }))

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(newEvents)
        .select()

      if (error) {
        console.error('Error adding events:', error)
        return
      }

      if (data) {
        setEvents([...events, ...data])
      }

      setNewEventTitle('')
      setSelectedEventIndexes([])
      setIsTargetRunnerOpen(false)
      return
    }

    const eventsToDelete = events.filter((event: CalendarEvent) => activeTargetDates.includes(event.date) && event.id)
    const idsToDelete = eventsToDelete.map((e: CalendarEvent) => e.id as string)
    
    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', idsToDelete)
        
      if (error) {
        console.error('Error deleting events:', error)
        return
      }
    }

    setEvents(events.filter((event: CalendarEvent) => !activeTargetDates.includes(event.date)))
    setSelectedEventIndexes([])
    setIsTargetRunnerOpen(false)
  }

  const handleRemoveGrads = async () => {
    setRemovingGrads(true)
    const { count, error } = await removeGraduates()
    setRemovingGrads(false)
    setShowRemoveGradsModal(false)
    if (error) toast.error(error)
    else if (count === 0) toast('No 4th year students found to remove.')
    else toast.success(`Removed ${count} graduated student${count !== 1 ? 's' : ''} from the system.`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Remove Graduates Confirmation Modal */}
      {showRemoveGradsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Remove Graduated Students</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove all <span className="font-semibold text-rose-700">4th Year</span> students from the system database. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRemoveGradsModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleRemoveGrads} disabled={removingGrads} className="px-4 py-2 rounded-lg bg-rose-700 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                {removingGrads ? 'Removing…' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dark blue header bar, matching dashboard */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Welcome back, {user?.user_metadata?.full_name || 'Admin'}!
            </h1>
            <p className="mt-1 text-xs text-blue-100">
              Configure academic milestones and events for the institution.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-900/50 outline outline-1 outline-blue-400/30 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-blue-200">Active Academic Year:</span>
              <input 
                type="text" 
                value={globalAcademicYear} 
                onChange={(e) => setGlobalAcademicYear(e.target.value)} 
                className="w-28 bg-transparent border-b border-blue-400/50 text-white text-sm font-bold focus:outline-none focus:border-white px-1 py-0.5"
                placeholder="e.g. 2025-2026"
              />
              <button 
                onClick={async () => {
                  setSavingYear(true)
                  const { error } = await updateAcademicYear(globalAcademicYear)
                  setSavingYear(false)
                  if (!error) toast.success('Academic Year updated. All users must re-accept the Conforme.')
                  else toast.error(error)
                }}
                disabled={savingYear}
                className="px-2 py-1 ml-1 bg-white hover:bg-slate-100 text-blue-800 rounded text-[10px] font-bold disabled:opacity-50 transition-colors"
                title="Save Global Academic Year"
              >
                {savingYear ? 'Saving...' : 'Save'}
              </button>
            </div>
            <button
              onClick={() => setShowRemoveGradsModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors"
            >
              Remove Graduates
            </button>
            <button
              onClick={() => setIsTargetRunnerOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            >
              <span>Bulk Actions</span>
            </button>
          </div>
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
                    {monthOptions[currentMonth]} {currentYear}
                  </h2>
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    <button
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11)
                          setCurrentYear(currentYear - 1)
                        } else {
                          setCurrentMonth(currentMonth - 1)
                        }
                      }}
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
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0)
                          setCurrentYear(currentYear + 1)
                        } else {
                          setCurrentMonth(currentMonth + 1)
                        }
                      }}
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
                    {monthOptions.map((month, index) => (
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
                            className="h-32 bg-slate-50/50 border-r border-slate-50 last:border-r-0"
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
                      const isToday = new Date().toISOString().slice(0, 10) === iso

                      return (
                        <button
                          key={di}
                          onClick={() => {
                            setSelectedDate(iso)
                            setManualTargetDate(iso)
                            setSelectedEventIndexes([])
                          }}
                          className={`h-32 border-r border-slate-50 last:border-r-0 text-left px-3 py-3 group relative transition-all ${
                            isSelected ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50'
                          } ${!isSelected && (isMultiPicked || isInRange) ? 'bg-indigo-50/20' : ''}`}
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

          {/* RIGHT PANEL - MANAGE EVENTS */}
          <aside className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sticky top-24">
              <div className="mb-6">
                <h3 className="text-sm uppercase font-black text-slate-400 tracking-widest mb-1">Schedule Details</h3>
                <p className="text-2xl font-black text-slate-900 leading-tight">
                  {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Events</p>
                  {selectedEventIndexes.length > 0 && (
                     <button
                        className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors"
                        onClick={async () => {
                          const selectedEventsData = events.filter((_: CalendarEvent, index: number) => selectedEventIndexes.includes(index))
                          const idsToDelete = selectedEventsData.filter((e: CalendarEvent) => e.id !== undefined).map((e: CalendarEvent) => e.id as string)

                          if (idsToDelete.length > 0) {
                            const { error } = await supabase
                              .from('calendar_events')
                              .delete()
                              .in('id', idsToDelete)

                            if (error) {
                              console.error('Error deleting selected events:', error)
                              return
                            }
                          }

                          setEvents(
                            events.filter((_: CalendarEvent, index: number) => !selectedEventIndexes.includes(index))
                          )
                          setSelectedEventIndexes([])
                        }}
                      >
                        Delete ({selectedEventIndexes.length})
                      </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                  {events.filter((e: CalendarEvent) => e.date === selectedDate).length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">No Events</p>
                    </div>
                  ) : (
                    events
                      .map((event: CalendarEvent, idx: number) => ({ event, idx }))
                      .filter(({ event }: { event: CalendarEvent }) => event.date === selectedDate)
                      .map(({ event, idx }: { event: CalendarEvent; idx: number }) => (
                        <div key={event.id || idx} className="group relative flex items-center gap-3 p-3 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={selectedEventIndexes.includes(idx)}
                            className="h-4 w-4 rounded border-slate-300 text-dyci-blue focus:ring-dyci-blue/30"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.checked) {
                                setSelectedEventIndexes((prev: number[]) => [...prev, idx])
                              } else {
                                setSelectedEventIndexes((prev: number[]) =>
                                  prev.filter((value: number) => value !== idx)
                                )
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{event.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${eventBadgeClasses[event.type]}`} />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{event.type}</span>
                            </div>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                            onClick={async () => {
                              if (event.id) {
                                const { error } = await supabase
                                  .from('calendar_events')
                                  .delete()
                                  .eq('id', event.id)

                                if (error) {
                                  console.error('Error deleting event:', error)
                                  return
                                }
                              }
                              setEvents(events.filter((_: CalendarEvent, index: number) => index !== idx))
                              setSelectedEventIndexes([])
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setManualTargetDate(selectedDate)
                    setIsTargetRunnerOpen(true)
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Add New Event
                </button>
              </div>
            </div>
          </aside>
        </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsTargetRunnerOpen(false)} />
          <div className="w-full max-w-lg bg-white rounded-[32px] border border-slate-200 shadow-2xl p-8 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Bulk Schedule Tool</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure multiple entries</p>
              </div>
              <button
                className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                onClick={() => setIsTargetRunnerOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${eventTargetMode === 'multiple' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setEventTargetMode('multiple')}
                >
                  Individual
                </button>
                <button
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${eventTargetMode === 'range' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setEventTargetMode('range')}
                >
                  Range
                </button>
              </div>

              {eventTargetMode === 'multiple' ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="date"
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-dyci-blue/10 outline-none transition-all"
                      value={manualTargetDate}
                      onChange={(e) => setManualTargetDate(e.target.value)}
                    />
                    <button
                      className="px-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                      onClick={() => {
                        if (!manualTargetDate) return
                        setSelectedDates((prev: string[]) =>
                          prev.includes(manualTargetDate)
                            ? prev
                            : [...prev, manualTargetDate]
                        )
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto custom-scrollbar p-1">
                    {selectedDates.length === 0 && (
                      <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add dates above</p>
                      </div>
                    )}
                    {selectedDates.map((date) => (
                      <div key={date} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl group">
                        <span className="text-xs font-bold text-slate-700">{date}</span>
                        <button
                          className="text-slate-400 hover:text-red-500 transition-colors font-black"
                          onClick={() =>
                            setSelectedDates((prev: string[]) => prev.filter((d: string) => d !== date))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Day</label>
                      <input
                        type="number"
                        min={1}
                        max={daysInMonth}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-dyci-blue/10 outline-none"
                        value={rangeStartDay}
                        onChange={(e) => setRangeStartDay(e.target.value ? Number(e.target.value) : '')}
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Day</label>
                       <input
                        type="number"
                        min={1}
                        max={daysInMonth}
                         className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-dyci-blue/10 outline-none"
                        value={rangeEndDay}
                        onChange={(e) => setRangeEndDay(e.target.value ? Number(e.target.value) : '')}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Action</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none"
                      value={targetAction}
                      onChange={(e) => setTargetAction(e.target.value as 'add' | 'delete')}
                    >
                      <option value="add">Add Events</option>
                      <option value="delete">Delete Events</option>
                    </select>
                 </div>
                 {targetAction === 'add' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none"
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value as EventType)}
                      >
                        <option value="holiday">Holiday</option>
                        <option value="exam">Exam</option>
                        <option value="class">Class</option>
                        <option value="enrollment">Enrollment</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                 )}
              </div>

              {targetAction === 'add' && (
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Description</label>
                   <input
                    type="text"
                    placeholder="e.g. Midterm Examinations"
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-dyci-blue/10 outline-none transition-all text-slate-900"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected</span>
                   <span className="text-xl font-black text-dyci-blue">{activeTargetDates.length} Days</span>
                </div>
                <button
                  className="px-8 py-4 bg-dyci-blue text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-dyci-blue/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all disabled:bg-slate-200 disabled:shadow-none"
                  disabled={activeTargetDates.length === 0}
                  onClick={runTargetAction}
                >
                  Run Transformation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
