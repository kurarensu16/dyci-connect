import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { FaPlus, FaTrash, FaCalculator, FaListCheck } from 'react-icons/fa6'
import type { Grade } from '../../types'

type ToolsTab = 'gwa' | 'todo'

interface GradeInput {
  subject: string
  grade: string
  units: string
}

type TodoPriority = 'High' | 'Medium' | 'Low'
type TodoFilter = 'all' | 'active' | 'completed'

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
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all')

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

  const filteredTodos = todos.filter((t) => {
    if (todoFilter === 'active') return !t.done
    if (todoFilter === 'completed') return t.done
    return true
  })

  const prioritySelectClasses =
    newTodoPriority === 'High'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : newTodoPriority === 'Medium'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'

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
                className={`flex items-center border-b-2 py-3 px-1 transition-colors ${
                  activeTab === 'gwa'
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
                className={`flex items-center border-b-2 py-3 px-1 transition-colors ${
                  activeTab === 'todo'
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                  gwa === null
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
          <>
            {/* Header + filters card */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    Today Tasks
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Lightweight checklist for your DYCI work today.
                  </p>
                </div>
                <div className="flex items-center gap-2" />
              </div>

              {/* Filter row */}
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <div className="space-x-2">
                  {(['all', 'active', 'completed'] as TodoFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTodoFilter(f)}
                      className={`px-2 py-1 rounded-full border text-[11px] ${
                        todoFilter === f
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">
                  {filteredTodos.length} task{filteredTodos.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Task list + add controls card */}
            <div className="mt-4 bg-white rounded-2xl shadow-md border border-slate-100 p-5 sm:p-6">
              {/* Todo list styled like simple task rows */}
              <div className="space-y-1">
                {filteredTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodo(todo.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p
                          className={`text-slate-800 ${
                            todo.done ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {todo.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          todo.priority === 'High'
                            ? 'bg-amber-100 text-amber-700'
                            : todo.priority === 'Medium'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {todo.priority}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTodoItem(todo.id)}
                        className="text-slate-400 hover:text-rose-500"
                        aria-label="Delete task"
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom action row with add controls */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-600 hover:to-indigo-700"
                  >
                    Finish
                  </button>
                </div>
                <form
                  onSubmit={handleAddTodo}
                  className="flex flex-1 flex-col sm:flex-row gap-2 justify-end"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newTodoLabel}
                      onChange={(e) => setNewTodoLabel(e.target.value)}
                      placeholder="Add a task"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={newTodoPriority}
                      onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${prioritySelectClasses}`}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <FaPlus className="mr-1 h-3 w-3" />
                      Add Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Tools

