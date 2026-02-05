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

const Tools: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ToolsTab>('gwa')
  const [grades, setGrades] = useState<Grade[]>([])
  const [newGrade, setNewGrade] = useState<GradeInput>({
    subject: '',
    grade: '',
    units: '',
  })
  const [gwa, setGwa] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

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
      setGrades(data || [])
      calculateGWA(data || [])
    } catch (error: any) {
      toast.error('Error loading grades')
    }
  }

  const calculateGWA = (gradeList: Grade[]) => {
    const validGrades = gradeList.filter((g) => g.grade && g.units)
    if (validGrades.length === 0) {
      setGwa(0)
      return
    }

    const totalUnits = validGrades.reduce(
      (sum, g) => sum + parseFloat(g.units.toString()),
      0,
    )
    const weightedSum = validGrades.reduce((sum, g) => {
      return (
        sum +
        parseFloat(g.grade.toString()) * parseFloat(g.units.toString())
      )
    }, 0)

    setGwa(parseFloat((weightedSum / totalUnits).toFixed(2)))
  }

  const addGrade = async () => {
    if (!newGrade.subject || !newGrade.grade || !newGrade.units) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('grades').insert({
        user_id: user?.id,
        subject: newGrade.subject,
        grade: parseFloat(newGrade.grade),
        units: parseFloat(newGrade.units),
      })

      if (error) throw error

      toast.success('Grade added successfully')
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
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Grade deleted')
      fetchGrades()
    } catch (error: any) {
      toast.error('Error deleting grade')
    }
  }

  const gwaStatus = gwa === 0 ? 'N/A' : gwa <= 3.0 ? 'PASS' : 'FAILED'
  const gwaStatusColor =
    gwa === 0
      ? 'bg-slate-100 text-slate-600'
      : gwa <= 3.0
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-rose-100 text-rose-700'

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
            {/* Current GWA banner */}
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">
                  Your Current GWA
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {gwa.toFixed(2)}
                </p>
              </div>
              <span
                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${gwaStatusColor}`}
              >
                {gwaStatus}
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
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Academic To-Do List
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              This section will help you manage tasks, deadlines, and priorities alongside your
              grades. To-do list tools are coming soon.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Tools


