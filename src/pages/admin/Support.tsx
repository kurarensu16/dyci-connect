import React from 'react'
import { FaCheckCircle } from 'react-icons/fa'

type ChatStatus = 'Waiting' | 'Active' | 'Resolved'

interface Conversation {
  id: string
  name: string
  role: string
  subject: string
  preview: string
  time: string
  status: ChatStatus
  unread?: boolean
}

const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Student',
    subject: 'Enrollment Process Question',
    preview: 'What are the enrollment requirements for transferees?',
    time: '5h ago',
    status: 'Waiting',
  },
  {
    id: '2',
    name: 'Prof. Michael Santos',
    role: 'Faculty',
    subject: 'School Calendar Access',
    preview: 'Thank you for the help!',
    time: '7h ago',
    status: 'Active',
  },
  {
    id: '3',
    name: 'John Dela Cruz',
    role: 'Student',
    subject: 'Conforme Submission',
    preview: 'I uploaded my COR but it says pending. How…',
    time: '7h ago',
    status: 'Waiting',
    unread: true,
  },
]

const statusPillClasses: Record<ChatStatus, string> = {
  Waiting: 'bg-amber-50 text-amber-700',
  Active: 'bg-blue-50 text-blue-700',
  Resolved: 'bg-emerald-50 text-emerald-700',
}

const Support: React.FC = () => {
  const activeConversation = conversations[0]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Support Chat</h1>
          <p className="mt-1 text-xs text-blue-100">
            Respond to questions from students and faculty
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-3 min-h-[480px]">
          {/* Left column: conversations list */}
          <div className="border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col">
            {/* Top stats */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100 text-center text-[11px]">
              <div>
                <p className="font-semibold text-slate-900">5</p>
                <p className="text-slate-500">Total</p>
              </div>
              <div>
                <p className="font-semibold text-amber-600">2</p>
                <p className="text-slate-500">Waiting</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">1</p>
                <p className="text-slate-500">Active</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-600">2</p>
                <p className="text-slate-500">Resolved</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto text-xs">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                    c.id === activeConversation.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-semibold">
                        {c.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {c.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {c.time}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-900">
                    {c.subject}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    {c.preview}
                  </p>
                  {c.unread && (
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right column: chat window */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900">
                  {activeConversation.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeConversation.role} • Enrollment Process
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <FaCheckCircle className="mr-1 h-3 w-3" />
                  Mark as Resolved
                </button>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusPillClasses['Waiting']}`}
                >
                  Waiting
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 px-5 py-4 space-y-3 text-xs text-slate-800 overflow-y-auto">
              <div>
                <p className="mb-1 text-[11px] text-slate-500">10:25 AM</p>
                <div className="inline-block rounded-lg bg-slate-100 px-3 py-2">
                  Hi! I have questions about the enrollment process.
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">10:30 AM</p>
                <div className="inline-block rounded-lg bg-slate-100 px-3 py-2">
                  What are the enrollment requirements for transferees?
                </div>
              </div>
            </div>

            {/* Reply box */}
            <div className="border-t border-slate-100 px-5 py-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Support


