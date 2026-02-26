import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { FaPlus, FaTrash, FaCalculator, FaListCheck, FaStar, FaPen, FaCheck } from 'react-icons/fa6'
import type { Grade } from '../../types'

type ToolsTab = 'gwa' | 'todo'

interface GradeInput {
  subject: string
  grade: string
  units: string
}

type TodoPriority = 'High' | 'Medium' | 'Low'

interface TodoItem {
  id: number
  label: string
  priority: TodoPriority
  done: boolean
}

const Tools: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ToolsTab>('gwa')

  // GWA calculator state
  const [grades, setGrades] = useState<Grade[]>([])
  const [gwa, setGwa] = useState<number | null>(null)
  const [newGrade, setNewGrade] = useState<GradeInput>({
    subject: '',
    grade: '',
    units: '',
  })
  const [loading, setLoading] = useState<boolean>(false)

  // Simple in-memory to-do list for students
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodoLabel, setNewTodoLabel] = useState<string>('')
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('Medium')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

  useEffect(() => {
    if (activeTab === 'gwa') {
      fetchGrades()
    }
  }, [activeTab])

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      const list = data || []
      setGrades(list)
      calculateGwa(list)
    } catch (error: any) {
      toast.error('Error loading grades')
    }
  }

  const calculateGwa = (gradeList: Grade[]) => {
    const validGrades = gradeList.filter((g) => g.grade && g.units)
    if (validGrades.length === 0) {
      setGwa(null)
      return
    }

    const totalUnits = validGrades.reduce(
      (sum, g) => sum + parseFloat(g.units.toString()),
      0,
    )
    if (!totalUnits || Number.isNaN(totalUnits)) {
      setGwa(null)
      return
    }

    const weightedSum = validGrades.reduce((sum, g) => {
      return (
        sum +
        parseFloat(g.grade.toString()) * parseFloat(g.units.toString())
      )
    }, 0)

    const computed = weightedSum / totalUnits
    setGwa(Number.isFinite(computed) ? parseFloat(computed.toFixed(2)) : null)
  }

  const addGrade = async () => {
    if (!newGrade.subject || !newGrade.grade || !newGrade.units) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from('grades').insert({
        user_id: user?.id,
        subject: newGrade.subject,
        grade: parseFloat(newGrade.grade),
        units: parseFloat(newGrade.units),
      })

      if (error) throw error

      toast.success('Grade added successfully')
      setNewGrade({ subject: '', grade: '', units: '' })

      // Optimistically update local grades & GWA instead of refetching
      if (data && data[0]) {
        const inserted = data[0] as Grade
        const updated = [inserted, ...grades]
        setGrades(updated)
        calculateGwa(updated)
      } else {
        fetchGrades()
      }
    } catch (error: any) {
      toast.error('Error adding grade')
    } finally {
      setLoading(false)
    }
  }

  const deleteGrade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Grade deleted')
      const remaining = grades.filter((g) => g.id !== id)
      setGrades(remaining)
      calculateGwa(remaining)
    } catch (error: any) {
      toast.error('Error deleting grade')
    }
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTodoLabel.trim()
    if (!trimmed) return

    // Simple DYCI-flavored auto-suggestions
    const suggestionLabel =
      trimmed === 'Request TOR'
        ? 'Request TOR from Registrar'
        : trimmed === 'Submit clearance'
          ? 'Submit clearance to department'
          : trimmed

    const newTodo: TodoItem = {
      id: Date.now(),
      label: suggestionLabel,
      priority: newTodoPriority,
      done: false,
    }
    setTodos((prev) => [newTodo, ...prev])
    setNewTodoLabel('')
  }

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  const deleteTodoItem = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const filteredBySearch = todos.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const activeTodos = filteredBySearch.filter((t) => !t.done)
  const completedTodos = filteredBySearch.filter((t) => t.done)

  const totalTasks = todos.length
  const completedCount = todos.filter((t) => t.done).length
  const pendingCount = todos.filter((t) => !t.done).length
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Personal Academic Tools</h1>
          <p className="mt-1 text-xs text-blue-100">
            Manage your grades and tasks in one convenient workspace.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex space-x-6 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('gwa')}
                className={`flex items-center border-b-2 py-3 px-1 transition-colors ${activeTab === 'gwa'
                  ? 'border-white text-white'
                  : 'border-transparent text-blue-100 hover:text-white'
                  }`}
              >
                <FaCalculator className="mr-2 h-4 w-4" />
                GWA Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('todo')}
                className={`flex items-center border-b-2 py-3 px-1 transition-colors ${activeTab === 'todo'
                  ? 'border-white text-white'
                  : 'border-transparent text-blue-100 hover:text-white'
                  }`}
              >
                <FaListCheck className="mr-2 h-4 w-4" />
                To-Do List
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'gwa' && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 sm:p-8">
            {/* Current GWA summary */}
            <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-600">Your Current GWA</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {gwa !== null ? gwa.toFixed(2) : '—'}
                </p>
              </div>
              <span
                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${gwa === null
                  ? 'bg-slate-100 text-slate-600'
                  : gwa <= 3
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                  }`}
              >
                {gwa === null ? 'N/A' : gwa <= 3 ? 'PASS' : 'FAILED'}
              </span>
            </div>

            {/* Table header labels */}
            <div className="grid grid-cols-12 text-xs font-semibold text-slate-500 mb-2 px-2">
              <span className="col-span-6">Subject Name</span>
              <span className="col-span-3 text-center">Units</span>
              <span className="col-span-3 text-center">Grade</span>
            </div>

            {/* Existing grades */}
            <div className="space-y-2 mb-4">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="grid grid-cols-12 gap-3 items-center bg-slate-50 rounded-lg px-3 py-2"
                >
                  <div className="col-span-6">
                    <input
                      value={grade.subject}
                      disabled
                      className="w-full rounded-md border border-transparent bg-transparent text-sm text-slate-800"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      value={grade.units}
                      disabled
                      className="w-full text-center rounded-md border border-transparent bg-transparent text-sm text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="w-full text-center rounded-md border border-transparent bg-transparent text-sm text-slate-800">
                      {grade.grade}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteGrade(grade.id)}
                      className="text-rose-500 hover:text-rose-600 text-sm"
                      aria-label="Delete grade"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add subject row */}
            <div className="grid grid-cols-12 gap-3 items-center mb-4">
              <div className="col-span-6">
                <input
                  type="text"
                  placeholder="Subject code (e.g., SOE313)"
                  value={newGrade.subject}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, subject: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.5"
                  placeholder="Units"
                  value={newGrade.units}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, units: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Grade (1.0–5.0)"
                  value={newGrade.grade}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, grade: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addGrade}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FaPlus className="mr-2 h-3 w-3" />
              {loading ? 'Adding...' : 'Add Subject'}
            </button>

            {/* Grading scale reference */}
            <div className="mt-8 rounded-xl bg-slate-50 px-4 py-4 text-[11px] text-slate-600">
              <p className="font-semibold mb-2">Grading Scale Reference:</p>
              <div className="flex flex-wrap gap-6">
                <span>1.0 – Pass</span>
                <span>3.0 – INC (Incomplete)</span>
                <span>5.0 – Failed</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Note: This GWA calculator is for personal reference only. Official grades and GWA
                are maintained by the Registrar&apos;s Office.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'todo' && (
          <div className="bg-white rounded-[1.25rem] shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col md:flex-row gap-0 sm:gap-5">
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Bar with Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                <div className="flex-1 bg-slate-50 rounded-full px-4 py-1.5 flex items-center w-full max-w-xs">
                  <input
                    type="text"
                    placeholder="Search task..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[13px] text-slate-700 placeholder-slate-400 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                    <FaTrash className="w-3 h-3" />
                  </button>
                  <button className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-yellow-500 hover:bg-yellow-50 transition-colors">
                    <FaStar className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                {/* <p className="text-sm text-slate-500 mb-1">Hello there, what's up?</p> */}
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                    You've got <span className="text-blue-500">{activeTodos.length}</span> tasks today!
                  </h2>
                  <button
                    onClick={() => setIsAddingTask(!isAddingTask)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full transition-colors"
                  >
                    Add New
                  </button>
                </div>
              </div>

              {isAddingTask && (
                <form
                  onSubmit={(e) => {
                    handleAddTodo(e)
                    setIsAddingTask(false)
                  }}
                  className="mb-8 bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="text"
                    value={newTodoLabel}
                    onChange={(e) => setNewTodoLabel(e.target.value)}
                    placeholder="What do you need to do?"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-700"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white rounded-xl px-6 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* Ongoing tasks */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-slate-800">Ongoing</h3>
                  <button
                    onClick={() => setTodos((prev) => prev.filter((t) => t.done))}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                  >
                    Delete All
                  </button>
                </div>
                <div className="space-y-2.5">
                  {activeTodos.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic px-2">No ongoing tasks</p>
                  ) : (
                    activeTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-0 bg-white border border-slate-100 shadow-xs rounded-[10px] px-4 py-2.5 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                          ></button>
                          <span className="text-[13px] font-medium text-slate-700 break-words">
                            {todo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0 flex-wrap sm:flex-nowrap">
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                          <span
                            className={`text-[10px] font-bold px-3 py-1 rounded-full ${todo.priority === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : todo.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                              }`}
                          >
                            {todo.priority === 'High'
                              ? 'Critical'
                              : todo.priority === 'Medium'
                                ? 'Urgent'
                                : 'Normal'}
                          </span>
                          <button className="h-6 w-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-colors">
                            <FaPen className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => deleteTodoItem(todo.id)}
                            className="h-6 w-6 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors"
                          >
                            <FaTrash className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed tasks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-slate-800">Completed</h3>
                  <button
                    onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                  >
                    Delete All
                  </button>
                </div>
                <div className="space-y-2.5">
                  {completedTodos.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic px-2">No completed tasks yet</p>
                  ) : (
                    completedTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-0 bg-white border border-slate-100 shadow-xs rounded-[10px] px-4 py-2.5 opacity-75 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="h-4 w-4 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white transition-colors"
                          >
                            <FaCheck className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[13px] font-medium text-slate-400 line-through break-words">
                            {todo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0 flex-wrap sm:flex-nowrap">
                          <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Important
                          </span>
                          <button
                            onClick={() => deleteTodoItem(todo.id)}
                            className="h-6 w-6 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors"
                          >
                            <FaTrash className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="w-full md:w-64 bg-slate-50 rounded-[1.25rem] p-4 flex flex-col gap-4 shrink-0">
              <h3 className="font-bold text-slate-800 text-base">Results Summary</h3>

              <div className="bg-white rounded-[10px] p-4 shadow-xs border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 mb-1">Completion Rate (%)</p>
                <p className="text-2xl font-bold text-slate-800 mb-3">{completionRate}%</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700" style={{ width: `${completionRate}%` }}></div>
                </div>
              </div>

              <div className="bg-white rounded-[10px] p-4 shadow-xs border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 mb-1">Total Task / 50</p>
                <p className="text-2xl font-bold text-slate-800 mb-3">{totalTasks}</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(totalTasks / 50) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-white rounded-[10px] p-4 shadow-xs border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 mb-1">Pending</p>
                <p className="text-2xl font-bold text-slate-800 mb-3">{pendingCount}</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: totalTasks === 0 ? '0%' : `${(pendingCount / totalTasks) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-[10px] p-4 shadow-xs border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 mb-1">Completed</p>
                <p className="text-2xl font-bold text-slate-800 mb-3">{completedCount}</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: totalTasks === 0 ? '0%' : `${(completedCount / totalTasks) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Tools

