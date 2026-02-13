import React, { useState } from 'react'
import { FaMessage } from 'react-icons/fa6'

interface ChatMessage {
  id: number
  from: 'student' | 'system'
  text: string
  createdAt: string
}

interface FaqItem {
  id: string
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'login',
    question: 'I cannot log in to my account.',
    answer:
      'Please make sure you are using your correct school email and password. If you still cannot log in, use the "Forgot password" link on the login page or contact an administrator.',
  },
  {
    id: 'verification',
    question: 'My account is still pending verification.',
    answer:
      'New student and faculty accounts must be reviewed by an administrator. If your status is still "Pending verification" after some time, please follow up with the DYCI Connect admin or your department.',
  },
  {
    id: 'profile',
    question: 'How do I update my profile information?',
    answer:
      'Go to your Profile page, click "Edit profile", update your details, and then click "Save changes". You can also change your profile picture from the same screen.',
  },
]

const StudentChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: 'system',
      text: 'Hi! This chat is for quick questions about DYCI Connect. An administrator will reply here once this feature is fully connected.',
      createdAt: new Date().toISOString(),
    },
  ])
  const [sending, setSending] = useState(false)

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleFaqClick = (faq: FaqItem) => {
    const timestamp = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: 'student',
        text: faq.question,
        createdAt: timestamp,
      },
      {
        id: Date.now() + 1,
        from: 'system',
        text: faq.answer,
        createdAt: timestamp,
      },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    setSending(true)
    const newMessage: ChatMessage = {
      id: Date.now(),
      from: 'student',
      text: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
    setInput('')

    // Placeholder: here you could send the message to Supabase or another backend.
    setTimeout(() => {
      setSending(false)
    }, 300)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-80 max-w-[90vw] h-96 rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col overflow-hidden text-[11px]">
          <div className="px-3 py-2 bg-blue-700 text-white flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">Support chat (beta)</p>
              <p className="text-[10px] text-blue-100">
                For student questions about DYCI Connect
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-[10px]"
            >
              ×
            </button>
          </div>

          <div className="px-3 py-2 flex-1 overflow-y-auto space-y-2 bg-slate-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 max-w-[80%] ${
                    m.from === 'student'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap wrap-break-word">{m.text}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-[10px] text-slate-500">
                Start a conversation and an admin will respond here when online.
              </p>
            )}
          </div>

          {/* Quick FAQs */}
          {FAQ_ITEMS.length > 0 && (
            <div className="border-t border-slate-200 px-3 py-2 bg-white">
              <p className="text-[10px] font-semibold text-slate-600 mb-1">
                Quick FAQs
              </p>
              <div className="flex flex-wrap gap-1">
                {FAQ_ITEMS.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => handleFaqClick(faq)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="border-t border-slate-200 px-3 py-2 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 rounded-xl border border-slate-300 px-2 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold px-3 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center justify-center h-11 w-11 rounded-full bg-blue-700 text-white shadow-lg border border-blue-800 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50"
        aria-label="Open student support chat"
      >
        <FaMessage className="h-5 w-5" />
      </button>
    </>
  )
}

export default StudentChatWidget

