import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  FaPlus, FaTrash, FaCalculator, FaListCheck, FaStar, FaPen, FaCheck, 
  FaArrowRight, FaClock, FaCircle, FaXmark, FaBoxArchive, FaTriangleExclamation 
} from 'react-icons/fa6'
import type { Grade, Todo } from '../../types'

type ToolsTab = 'gwa' | 'todo'
type TodoPriority = 'high' | 'standard' | 'low'
type TodoStatus = 0 | 1 | 2 | 3 // 0: Backlog, 1: Active, 2: Review, 3: Done

interface GradeInput {
  subject: string;
  grade: string;
  units: string;
}

interface ConfirmConfig {
  isOpen: boolean;
  type: 'save' | 'switch' | 'archive' | 'trash';
  title: string;
  message: string;
  onConfirm: () => void;
  loading?: boolean;
}

const TOOLS_COLUMNS = [
  { id: 0, label: 'Backlog' },
  { id: 1, label: 'Active' },
  { id: 2, label: 'Review' }
]

const Tools: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ToolsTab>('todo')

  // GWA calculator state
  const [grades, setGrades] = useState<Grade[]>([])
  const [gwa, setGwa] = useState<number | null>(null)
  const [newGrade, setNewGrade] = useState<GradeInput>({
    subject: '',
    grade: '',
    units: '',
  })
  const [loading, setLoading] = useState<boolean>(false)

  // Kanban Todo State
  const [todos, setTodos] = useState<Todo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  
  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    isOpen: false,
    type: 'save',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Modal Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'standard' as TodoPriority,
    status: 0 as TodoStatus,
    progress: 0,
    due_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (!user) return

    if (activeTab === 'todo') {
      fetchTodos()
    } else {
      fetchGrades()
    }
  }, [activeTab, user, showArchived])

  const fetchTodos = async () => {
    setFetchLoading(true)
    try {
      let query = supabase
        .from('todos')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (!showArchived) {
        query = query.eq('is_archived', false)
      }

      const { data, error } = await query

      if (error) throw error
      setTodos(data || [])
    } catch (error: any) {
      toast.error('Error fetching tasks')
      console.error(error)
    } finally {
      setFetchLoading(false)
    }
  }

  const fetchGrades = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGrades(data || [])
      calculateGwa(data || [])
    } catch (error: any) {
      toast.error('Error fetching grades')
    } finally {
      setLoading(false)
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
      const payload = {
        user_id: user?.id,
        subject: newGrade.subject,
        grade: parseFloat(newGrade.grade),
        units: parseFloat(newGrade.units)
      }

      const { data, error } = await supabase
        .from('grades')
        .insert([payload])
        .select()

      if (error) throw error
      
      toast.success('Grade added to Cloud')
      setNewGrade({ subject: '', grade: '', units: '' })
      fetchGrades()
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
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      toast.success('Grade moved to trash')
      fetchGrades()
    } catch (error: any) {
      toast.error('Error deleting grade')
    }
  }

  // Kanban Actions
  const openAddModal = () => {
    setEditingTodo(null)
    setFormData({
      title: '',
      description: '',
      priority: 'standard',
      status: 0,
      progress: 0,
      due_date: new Date().toISOString().split('T')[0]
    })
    setIsModalOpen(true)
  }

  const getStatusFromProgress = (progress: number): TodoStatus => {
    if (progress < 10) return 0
    if (progress < 80) return 1
    if (progress < 100) return 2
    return 3
  }

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo)
    setFormData({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority || 'standard',
      status: (todo.status as TodoStatus) || 0,
      progress: todo.progress || 0,
      due_date: todo.due_date ? todo.due_date.split('T')[0] : new Date().toISOString().split('T')[0]
    })
    setIsModalOpen(true)
  }

  const handleSaveTodoConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    
    setConfirmConfig({
      isOpen: true,
      type: 'save',
      title: editingTodo ? 'Confirm Update' : 'Confirm New Task',
      message: `Are you sure you want to ${editingTodo ? 'update' : 'create'} "${formData.title}"?`,
      onConfirm: async () => {
        try {
          const payload = {
            user_id: user?.id,
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: formData.status,
            progress: formData.progress,
            due_date: formData.due_date,
            updated_at: new Date().toISOString()
          }

          if (editingTodo) {
            const { error } = await supabase
              .from('todos')
              .update(payload)
              .eq('id', editingTodo.id)
            if (error) throw error
            toast.success('Task updated')
          } else {
            const { error } = await supabase
              .from('todos')
              .insert([payload])
            if (error) throw error
            toast.success('Task created')
          }
          setIsModalOpen(false)
          fetchTodos()
        } catch (error: any) {
          toast.error('Operation failed')
        }
      }
    })
  }

  const moveNextConfirm = (todo: Todo) => {
    if (todo.status >= 3) return
    const nextStatus = (todo.status + 1) as TodoStatus
    const nextLabel = nextStatus === 1 ? 'Active' : nextStatus === 2 ? 'Review' : 'Done'
    
    setConfirmConfig({
      isOpen: true,
      type: 'switch',
      title: 'Move Task',
      message: `Are you sure you want to move "${todo.title}" to ${nextLabel}?`,
      onConfirm: async () => {
        let nextProgress = todo.progress
        if (nextStatus === 1 && todo.progress < 10) nextProgress = 10 
        if (nextStatus === 2 && todo.progress < 80) nextProgress = 80  
        if (nextStatus === 3) nextProgress = 100                      
        
        try {
          const { error } = await supabase
            .from('todos')
            .update({ 
              status: nextStatus,
              progress: nextProgress,
              updated_at: new Date().toISOString()
            })
            .eq('id', todo.id)

          if (error) throw error
          fetchTodos()
        } catch (error: any) {
          toast.error('Update failed')
        }
      }
    })
  }

  const toggleArchiveConfirm = (todo: Todo) => {
    setConfirmConfig({
      isOpen: true,
      type: 'archive',
      title: todo.is_archived ? 'Restore Task' : 'Archive Task',
      message: `Are you sure you want to ${todo.is_archived ? 'restore' : 'archive'} "${todo.title}"?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('todos')
            .update({ is_archived: !todo.is_archived })
            .eq('id', todo.id)
          if (error) throw error
          toast.success(todo.is_archived ? 'Task restored' : 'Task archived')
          fetchTodos()
        } catch (error: any) {
          toast.error('Operation failed')
        }
      }
    })
  }

  const archiveAllDoneConfirm = () => {
    const doneTasks = todos.filter(t => t.status === 3 && !t.is_archived)
    if (doneTasks.length === 0) return

    setConfirmConfig({
      isOpen: true,
      type: 'archive',
      title: 'Archive All Completed',
      message: `Move all ${doneTasks.length} completed tasks to archive?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('todos')
            .update({ is_archived: true })
            .eq('status', 3)
            .eq('user_id', user?.id)
          if (error) throw error
          toast.success('Completed tasks archived')
          fetchTodos()
        } catch (error: any) {
          toast.error('Batch archive failed')
        }
      }
    })
  }

  const trashTodoConfirm = (todo: Todo) => {
    setConfirmConfig({
      isOpen: true,
      type: 'trash',
      title: 'Move to Trash',
      message: `Are you sure you want to move "${todo.title}" to trash?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('todos')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', todo.id)
          if (error) throw error
          toast.success('Task moved to trash')
          fetchTodos()
          setIsModalOpen(false)
        } catch (error: any) {
          toast.error('Trash failed')
        }
      }
    })
  }

  const filteredTodos = todos.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalTasks = todos.length
  const completedCount = todos.filter(t => t.status === 3).length
  const pendingCount = todos.filter(t => t.status === 1).length
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100)

  // Card Component
  const TaskCard = ({ todo }: { todo: Todo }) => {
    const isUrgent = todo.due_date && new Date(todo.due_date).getTime() - Date.now() < 24 * 60 * 60 * 1000 && todo.status !== 3
    
    // Priority specific styles
    const priorityConfig = {
      high: { dot: 'text-rose-500', label: 'text-rose-600 bg-rose-50 border-rose-100' },
      standard: { dot: 'text-blue-500', label: 'text-blue-600 bg-blue-50 border-blue-100' },
      low: { dot: 'text-emerald-500', label: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
    }[todo.priority as TodoPriority] || { dot: 'text-slate-300', label: 'text-slate-400 bg-slate-50 border-slate-50' }

    return (
      <div className={`group bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-blue-100 transition-all mb-3 relative overflow-hidden ${todo.is_archived ? 'opacity-60 bg-slate-50/50' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-tight ${priorityConfig.label}`}>
            <FaCircle className={`w-1 h-1 shrink-0 ${priorityConfig.dot}`} />
            <span>{todo.priority} Priority</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => toggleArchiveConfirm(todo)} className="p-1 text-slate-300 hover:text-blue-500">
               <FaBoxArchive className="w-2.5 h-2.5" title={todo.is_archived ? "Restore" : "Archive"} />
            </button>
            <button onClick={() => openEditModal(todo)} className="p-1 text-slate-300 hover:text-blue-500">
              <FaPen className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        
        <h4 className={`text-sm font-semibold text-slate-800 mb-2 leading-snug line-clamp-2 ${todo.is_archived ? 'italic' : ''}`}>{todo.title}</h4>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <FaClock className={`w-2.5 h-2.5 ${isUrgent ? 'text-red-500 animate-pulse' : ''}`} />
            <span className={isUrgent ? 'text-red-500 font-medium' : ''}>
              {todo.due_date ? new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
            </span>
          </div>
          
          {todo.status < 3 && !todo.is_archived && (
            <button 
              onClick={(e) => { e.stopPropagation(); moveNextConfirm(todo); }}
              className="h-6 w-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              <FaArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-50">
          <div 
            className="h-full bg-blue-500/40 transition-all duration-500" 
            style={{ width: `${todo.progress || 0}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* System Standard Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Academic Tools</h1>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">Manage your progress and performance seamlessly.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('todo')} 
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${activeTab === 'todo' ? 'bg-white text-blue-800 border-white' : 'bg-blue-700/50 text-blue-100 border-blue-600/50 hover:bg-blue-700'}`}
              >
                To-Do Board
              </button>
              <button 
                onClick={() => setActiveTab('gwa')} 
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${activeTab === 'gwa' ? 'bg-white text-emerald-800 border-white' : 'bg-blue-700/50 text-blue-100 border-blue-600/50 hover:bg-blue-700'}`}
              >
                GWA Tracker
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'gwa' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between rounded-2xl bg-slate-50/50 border border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative GWA</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {gwa !== null ? gwa.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-xs font-bold border ${gwa === null ? 'bg-slate-100 text-slate-400 border-slate-200' : gwa <= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {gwa === null ? 'NO DATA' : gwa <= 3 ? 'ACADEMIC PASS' : 'ACADEMIC DEFICIENCY'}
              </div>
            </div>

            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-4">
              <span className="col-span-6">Subject</span>
              <span className="col-span-3 text-center">Units</span>
              <span className="col-span-3 text-center">Grade</span>
            </div>

            <div className="space-y-2 mb-6">
              {grades.map((grade) => (
                <div key={grade.id} className="grid grid-cols-12 gap-3 items-center bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-3 hover:border-blue-100 transition-colors">
                  <div className="col-span-6 font-semibold text-sm text-slate-700">{grade.subject}</div>
                  <div className="col-span-3 text-center text-sm text-slate-500">{grade.units}</div>
                  <div className="col-span-2 text-center font-bold text-sm text-blue-600">{grade.grade}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => deleteGrade(grade.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><FaTrash className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center mb-6 pt-4 border-t border-slate-50">
              <div className="sm:col-span-6">
                <input type="text" placeholder="Subject Name" value={newGrade.subject} onChange={(e) => setNewGrade({ ...newGrade, subject: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 transition-all font-medium" />
              </div>
              <div className="sm:col-span-3">
                <input type="number" step="0.5" placeholder="Units" value={newGrade.units} onChange={(e) => setNewGrade({ ...newGrade, units: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 transition-all font-medium" />
              </div>
              <div className="sm:col-span-3">
                <input type="number" step="0.01" placeholder="Grade" value={newGrade.grade} onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 transition-all font-medium" />
              </div>
            </div>

            <button onClick={addGrade} disabled={loading} className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-blue-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50">
              <FaPlus className="mr-2 w-3 h-3" />
              {loading ? 'Adding...' : 'Add Subject Grade'}
            </button>
          </div>
        )}

        {activeTab === 'todo' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full min-w-0">
              {/* Kanban Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Search tasks..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    />
                    <FaListCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
                    <input 
                      type="checkbox" 
                      checked={showArchived} 
                      onChange={(e) => setShowArchived(e.target.checked)} 
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Archived</span>
                  </label>
                </div>
                <button 
                  onClick={openAddModal}
                  className="bg-blue-700 text-white rounded-2xl px-5 py-2.5 text-xs font-bold hover:bg-blue-800 transition-all shadow-sm flex items-center justify-center"
                >
                  <FaPlus className="mr-2 w-3 h-3" /> New Task
                </button>
              </div>

              {/* Kanban Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fetchLoading ? (
                   Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-[400px]" />
                  ))
                ) : (
                  TOOLS_COLUMNS.map(col => {
                    const colTodos = filteredTodos.filter(t => t.status === col.id)
                    return (
                      <div key={col.id} className="flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.label}</h3>
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{colTodos.length}</span>
                        </div>
                        
                        <div className="flex-1 bg-slate-100/40 rounded-2xl p-2 border border-slate-200/40">
                          {colTodos.length === 0 ? (
                            <div className="h-full min-h-[100px] border-2 border-dashed border-slate-200/50 rounded-2xl flex items-center justify-center p-6 bg-white/30">
                              <span className="text-[11px] text-slate-300 italic font-medium text-center">Drag and drop or<br/>use arrows to move</span>
                            </div>
                          ) : (
                            colTodos.map(todo => <TaskCard key={todo.id} todo={todo} />)
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Sidebar Stats */}
            <aside className="w-full lg:w-64 space-y-4 shrink-0">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Board Overview</h3>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] font-semibold text-slate-500">Completion</span>
                      <span className="text-sm font-bold text-slate-800">{completionRate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tasks</p>
                      <p className="text-lg font-bold text-slate-800">{totalTasks}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Active</p>
                      <p className="text-lg font-bold text-blue-600">{pendingCount}</p>
                    </div>
                  </div>

                  {/* Recently Completed Compact List */}
                  {todos.filter(t => t.status === 3).length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</h4>
                        <button 
                          onClick={archiveAllDoneConfirm}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                        >
                          Archive All
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {todos.filter(t => t.status === 3).map(todo => (
                          <div key={todo.id} className={`flex items-center gap-3 p-2 bg-slate-50/50 border border-slate-100 rounded-lg group hover:border-blue-100 transition-all ${todo.is_archived ? 'opacity-50' : ''}`}>
                            <div className="h-5 w-5 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                               <FaCheck className="w-2 h-2" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 truncate flex-1">{todo.title}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                               {!todo.is_archived && (
                                 <button onClick={() => toggleArchiveConfirm(todo)} className="p-1 text-slate-300 hover:text-blue-500">
                                   <FaBoxArchive className="w-2.5 h-2.5" />
                                 </button>
                               )}
                               <button onClick={() => openEditModal(todo)} className="p-1 text-slate-300 hover:text-blue-500">
                                 <FaPen className="w-2.5 h-2.5" />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-800 rounded-2xl p-5 text-white shadow-lg shadow-blue-100/10">
                <FaStar className="w-6 h-6 text-blue-200 mb-3" />
                <h4 className="text-sm font-bold mb-1">Stay Organized!</h4>
                <p className="text-[10px] text-blue-100 font-medium leading-relaxed">Regularly update your task progress to keep your academic performance on track.</p>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <h3 className="text-base font-bold text-slate-800">{editingTodo ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><FaXmark className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSaveTodoConfirm} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Task Title</label>
                <input 
                  autoFocus
                  maxLength={30}
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                  placeholder="e.g., Module 1 Exam"
                />
                <div className="flex justify-end mt-1"><span className="text-[9px] text-slate-300">{formData.title.length}/30</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Priority</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value as TodoPriority})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  >
                    <option value="low">Low</option>
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                <textarea 
                  maxLength={100}
                  rows={2}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none font-medium"
                  placeholder="Additional details..."
                />
                <div className="flex justify-end mt-1"><span className="text-[9px] text-slate-300">{formData.description.length}/100</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: parseInt(e.target.value) as TodoStatus})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  >
                    <option value={0}>Backlog</option>
                    <option value={1}>Active</option>
                    <option value={2}>Review</option>
                    <option value={3}>Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={formData.due_date} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</label>
                  <span className="text-xs font-bold text-blue-600">{formData.progress}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={formData.progress} 
                  onChange={e => {
                    const prog = parseInt(e.target.value)
                    setFormData({
                      ...formData, 
                      progress: prog,
                      status: getStatusFromProgress(prog)
                    })
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                {editingTodo && (
                  <button 
                    type="button"
                    onClick={() => trashTodoConfirm(editingTodo)}
                    className="flex-1 bg-rose-50 text-rose-500 rounded-2xl px-4 py-2.5 text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    Trash Task
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-blue-700 text-white rounded-2xl px-4 py-2.5 text-xs font-bold hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Processing...' : editingTodo ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmConfig({...confirmConfig, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmConfig.type === 'trash' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                {confirmConfig.type === 'trash' ? <FaTrash className="w-5 h-5" /> : confirmConfig.type === 'archive' ? <FaBoxArchive className="w-5 h-5" /> : <FaTriangleExclamation className="w-5 h-5" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmConfig.title}</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">{confirmConfig.message}</p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setConfirmConfig({...confirmConfig, isOpen: false})}
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setLoading(true)
                    await confirmConfig.onConfirm()
                    setLoading(false)
                    setConfirmConfig({...confirmConfig, isOpen: false})
                  }}
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold text-white transition-all shadow-sm ${confirmConfig.type === 'trash' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-700 hover:bg-blue-800'}`}
                >
                  {loading ? 'Wait...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tools
