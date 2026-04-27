import React, { useState, useEffect, useRef } from 'react'
import { FaCheckCircle, FaComments, FaUserPlus, FaClock, FaEdit } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { notifyUser } from '../../lib/api/notifications'

// Database enum: 'open', 'resolved', 'closed'
// UI mapping: 'open' shows as 'active' or 'waiting', 'resolved' stays same
type DBStatus = 'open' | 'resolved' | 'closed'

type UIStatus = 'waiting' | 'active' | 'resolved'

interface Conversation {
  id: string
  student_id: string | null
  db_status: DBStatus
  ui_status: UIStatus
  subject: string
  last_message_at: string
  student_name?: string
  student_role?: string
  assigned_admin_id?: string | null
  assigned_admin_name?: string | null
  last_admin_message_at?: string
  can_claim: boolean
}

interface Message {
  id: string
  message: string
  sender_id: string | null
  created_at: string
  is_edited?: boolean
  edited_at?: string
}

const statusPillClasses: Record<UIStatus, string> = {
  waiting: 'bg-amber-50 text-amber-700',
  active: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
}

const statusLabels: Record<UIStatus, string> = {
  waiting: 'Waiting',
  active: 'Active',
  resolved: 'Resolved',
}

const Support: React.FC = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConvId)
  const isAssignedToMe = activeConversation?.assigned_admin_id === user?.id
  const canClaim = activeConversation?.can_claim || false

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchConversations()
    const sub = subscribeToConversations()

    // Polling fallback: refresh every 5 seconds as backup for realtime
    const pollInterval = setInterval(() => {
      console.log('[Admin Chat] Polling refresh...')
      fetchConversations()
    }, 5000)

    return () => {
      supabase.removeChannel(sub)
      clearInterval(pollInterval)
    }
  }, [])

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId)
      const sub = subscribeToMessages(activeConvId)
      return () => {
        supabase.removeChannel(sub)
      }
    }
  }, [activeConvId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      // Step 1: Get all conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_student_message_at', { ascending: false })

      if (convError) {
        console.error('fetchConversations error:', convError)
        toast.error('Failed to load conversations')
        setConversations([])
        setLoading(false)
        return
      }

      if (!convData || convData.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Step 2: Get participants for these conversations
      const convIds = convData.map(c => c.id)
      const { data: participantsData, error: partError } = await supabase
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', convIds)

      if (partError) {
        console.error('Error fetching participants:', partError)
      }

      // Step 3: Get profiles for student participants and assigned admins
      const studentUserIds = (participantsData || [])
        .filter((p: any) => p.p_role === 'student')
        .map((p: any) => p.user_id)

      const adminUserIds = (convData || [])
        .map((c: any) => c.assigned_admin_id)
        .filter((id: string | null) => id)

      const allUserIds = [...new Set([...studentUserIds, ...adminUserIds])]

      const { data: profilesData, error: profError } = allUserIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, role').in('id', allUserIds)
        : { data: [], error: null }

      if (profError) {
        console.error('Error fetching profiles:', profError)
      }

      // Step 4: Build conversation objects with UI status
      const mapped = convData.map((c: any) => {
        const participant = (participantsData || []).find((p: any) => p.conversation_id === c.id)
        const studentProfile = participant
          ? (profilesData || []).find((p: any) => p.id === participant.user_id)
          : null
        const adminProfile = c.assigned_admin_id
          ? (profilesData || []).find((p: any) => p.id === c.assigned_admin_id)
          : null

        // Determine UI status
        let uiStatus: UIStatus = 'waiting'
        if (c.status === 'resolved') {
          uiStatus = 'resolved'
        } else if (c.assigned_admin_id) {
          uiStatus = 'active'
        }

        // Check if can claim (no admin, or admin inactive > 2 min)
        const canClaim = !c.assigned_admin_id ||
          (c.last_admin_message_at &&
            (new Date().getTime() - new Date(c.last_admin_message_at).getTime()) > 2 * 60 * 1000)

        return {
          id: c.id,
          db_status: c.status || 'open',
          ui_status: uiStatus,
          subject: 'Support Ticket',
          last_message_at: c.updated_at,
          student_id: participant?.user_id || null,
          student_name: studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}`.trim() : 'Anonymous Student',
          student_role: studentProfile?.role || 'student',
          assigned_admin_id: c.assigned_admin_id,
          assigned_admin_name: adminProfile ? `${adminProfile.first_name} ${adminProfile.last_name}`.trim() : null,
          last_admin_message_at: c.last_admin_message_at,
          can_claim: canClaim
        }
      })

      setConversations(mapped)
    } catch (err) {
      console.error('Unexpected error in fetchConversations:', err)
      toast.error('Error loading conversations')
      setConversations([])
    }
    setLoading(false)
  }

  const subscribeToConversations = () => {
    console.log('[Admin Chat] Subscribing to conversation updates...')

    const channel = supabase
      .channel('conversations_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('[Admin Chat] Conversation change received:', payload)
          fetchConversations()
        }
      )
      .subscribe((status) => {
        console.log('[Admin Chat] Subscription status:', status)
      })

    return channel
  }

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  const subscribeToMessages = (convId: string) => {
    const channelName = `admin_chat:${convId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            if (prev.find(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return channel
  }

  const handleClaimConversation = async () => {
    if (!activeConvId || !user) return
    setClaiming(true)

    // Call RPC to claim (with 2-min timeout check)
    const { data, error } = await supabase.rpc('claim_conversation', {
      p_conversation_id: activeConvId
    })

    if (error) {
      toast.error('Failed to claim conversation')
    } else if (data?.success) {
      // Send welcome message
      const welcomeMsg = `Hi! I'm ${user?.user_metadata?.full_name || 'a staff member'} from DYCI. I'll be assisting you today. How can I help you?`

      await supabase.from('chat_messages').insert({
        conversation_id: activeConvId,
        sender_id: user.id,
        message: welcomeMsg
      })

      // Update local state
      fetchConversations()
      fetchMessages(activeConvId)
      toast.success('Conversation claimed. Welcome message sent.')
    } else {
      toast.error(data?.reason || 'Could not claim conversation')
    }
    setClaiming(false)
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !activeConvId || !user) return
    setSending(true)

    const wasUnassigned = !activeConversation?.assigned_admin_id
    const isTakeover = activeConversation?.assigned_admin_id && activeConversation?.assigned_admin_id !== user.id

    console.log('[Admin Chat] Send reply:', {
      wasUnassigned,
      isTakeover,
      assignedTo: activeConversation?.assigned_admin_id,
      myId: user.id
    })

    // Auto-claim if replying to unassigned or can takeover
    if ((wasUnassigned || isTakeover) && canClaim) {
      console.log('[Admin Chat] Auto-claiming conversation...')
      const { data, error: claimError } = await supabase.rpc('claim_conversation', {
        p_conversation_id: activeConvId
      })

      if (claimError) {
        console.error('[Admin Chat] Claim error:', claimError)
      } else if (data?.success) {
        console.log('[Admin Chat] Claimed successfully, sending welcome message...')
        // Send welcome message on first reply/claim
        const adminName = user?.user_metadata?.full_name || 'a staff member'
        const welcomeMsg = `Hi! I'm ${adminName} from DYCI. I'll be assisting you today. How can I help you?`

        const { error: welcomeError } = await supabase.from('chat_messages').insert({
          conversation_id: activeConvId,
          sender_id: user.id,
          message: welcomeMsg
        })

        if (welcomeError) {
          console.error('[Admin Chat] Welcome message error:', welcomeError)
        } else {
          console.log('[Admin Chat] Welcome message sent successfully')
        }
      } else {
        console.log('[Admin Chat] Could not claim:', data?.reason)
      }
    } else {
      console.log('[Admin Chat] Skipping auto-claim - already assigned or cannot claim')
    }

    console.log('[Admin Chat] Sending admin reply...')
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConvId,
        sender_id: user.id,
        message: reply.trim()
      })

    if (error) {
      console.error('[Admin Chat] Reply error:', error)
      toast.error('Failed to send reply')
    } else {
      setReply('')
      // Update last_admin_message_at
      await supabase
        .from('conversations')
        .update({ last_admin_message_at: new Date().toISOString() })
        .eq('id', activeConvId)

      // Notify the student
      if (activeConversation?.student_id) {
        await notifyUser(
          activeConversation.student_id,
          'Support Message Received',
          `An administrator from DYCI has responded to your inquiry.`,
          'info',
          '/student/dashboard' // Students usually see chat as a widget on dashboard
        )
      }
    }
    setSending(false)
  }

  const handleResolve = async () => {
    if (!activeConvId) return
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'resolved' })
      .eq('id', activeConvId)

    if (error) {
      toast.error('Failed to resolve conversation')
    } else {
      toast.success('Conversation resolved')
      fetchConversations()
    }
  }

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id)
    setEditText(message.message)
  }

  const cancelEditing = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleEditMessage = async () => {
    if (!editingMessageId || !editText.trim()) return

    const { data, error } = await supabase.rpc('edit_chat_message', {
      p_message_id: editingMessageId,
      p_new_message: editText.trim()
    })

    if (error || !data?.success) {
      toast.error(error?.message || data?.error || 'Failed to edit message')
    } else {
      toast.success('Message updated')
      setEditingMessageId(null)
      setEditText('')
      fetchMessages(activeConvId!)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading support chat...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Standard Legacy Header */}
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">Institutional Support</h1>
          <p className="unified-header-subtitle">
            Technical assistance and platform governance helpdesk.
          </p>
        </div>
      </header>

      <main className="unified-main animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-3 h-full overflow-hidden">
          {/* Left column: conversations list */}
          <div className="border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col h-full overflow-hidden">
            {/* Stats - fixed at top */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-slate-100 text-center text-[10px] font-medium uppercase tracking-wider flex-shrink-0">
              <div className="bg-white border border-slate-100 border-l-[3px] border-l-slate-300 rounded-lg p-2.5 shadow-sm">
                <p className="text-slate-900 text-sm font-bold">{conversations.length}</p>
                <p className="text-slate-500">Total</p>
              </div>
              <div className="bg-white border border-slate-100 border-l-[3px] border-l-amber-500 rounded-lg p-2.5 shadow-sm">
                <p className="text-amber-600 text-sm font-bold">
                  {conversations.filter(c => c.ui_status === 'waiting').length}
                </p>
                <p className="text-amber-700">Waiting</p>
              </div>
              <div className="bg-white border border-slate-100 border-l-[3px] border-l-emerald-500 rounded-lg p-2.5 shadow-sm">
                <p className="text-emerald-600 text-sm font-bold">
                  {conversations.filter(c => c.ui_status === 'resolved').length}
                </p>
                <p className="text-emerald-700">Resolved</p>
              </div>
            </div>

            {/* Conversation list - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`w-full text-left px-4 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${c.id === activeConvId ? 'border-l-4 border-l-blue-600 shadow-sm z-10' : ''
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                        {c.student_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-[11px] leading-tight">
                          {c.student_name}
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {statusLabels[c.ui_status]}
                          {c.assigned_admin_name && c.ui_status === 'active' && (
                            <span className="text-blue-600 ml-1">• {c.assigned_admin_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {c.ui_status === 'waiting' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                    {c.ui_status === 'active' && c.can_claim && (
                      <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Takeover
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-900 mt-1 truncate">
                    {c.subject}
                  </p>
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="p-8 text-center text-[11px] text-slate-400">
                  No active conversations found.
                </div>
              )}
            </div>
          </div>

          {/* Right column: chat window */}
          <div className="lg:col-span-2 flex flex-col bg-slate-50/30 h-full overflow-hidden">
            {activeConversation ? (
              <>
                {/* Fixed Header - Student Info */}
                <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm flex-shrink-0">
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm">
                      {activeConversation.student_name}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {activeConversation.student_role} • {activeConversation.subject}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Claim button for unassigned or takeover */}
                    {activeConversation.ui_status !== 'resolved' && !isAssignedToMe && canClaim && (
                      <button
                        onClick={handleClaimConversation}
                        disabled={claiming}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <FaUserPlus className="mr-1.5 h-3 w-3" />
                        {claiming ? 'Claiming...' : (activeConversation.assigned_admin_id ? 'Takeover' : 'Claim')}
                      </button>
                    )}

                    {activeConversation.ui_status !== 'resolved' && isAssignedToMe && (
                      <button
                        onClick={handleResolve}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <FaCheckCircle className="mr-1.5 h-3 w-3" />
                        Mark Resolved
                      </button>
                    )}

                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPillClasses[activeConversation.ui_status]}`}
                    >
                      {statusLabels[activeConversation.ui_status]}
                    </span>

                    {activeConversation.assigned_admin_id && !isAssignedToMe && (
                      <span className="text-[10px] text-slate-500 flex items-center">
                        <FaClock className="mr-1 h-3 w-3" />
                        {activeConversation.assigned_admin_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Scrollable Messages Area */}
                <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto bg-slate-50/50 min-h-0">
                  {messages.map((m) => {
                    const isSystem = !m.sender_id;
                    const isAdmin = m.sender_id && m.sender_id !== activeConversation.student_id;
                    const isEditing = editingMessageId === m.id;
                    const canEdit = isAdmin && m.sender_id === user?.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        {isEditing ? (
                          <div className="max-w-[85%] w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleEditMessage}
                                disabled={!editText.trim()}
                                className="px-3 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[12px] shadow-sm ${isAdmin
                              ? 'bg-blue-700 text-white rounded-tr-none'
                              : isSystem
                                ? 'bg-white border border-slate-200 text-slate-600 rounded-bl-none italic'
                                : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                            }`}>
                            <p className="whitespace-pre-wrap">{m.message}</p>
                            {m.is_edited && (
                              <span className="text-[9px] opacity-70 ml-2">(edited)</span>
                            )}
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 mt-1 px-1 flex items-center space-x-2">
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isSystem && <span>• Bot Message</span>}
                          {canEdit && !isEditing && (
                            <button
                              onClick={() => startEditing(m)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit message"
                            >
                              <FaEdit className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Fixed Input Area */}
                {activeConversation.ui_status !== 'resolved' && (
                  <div className="bg-white border-t border-slate-100 px-5 py-4 flex-shrink-0">
                    {!isAssignedToMe && !canClaim ? (
                      <div className="text-center py-2">
                        <p className="text-[11px] text-slate-500">
                          Being handled by {activeConversation.assigned_admin_name}
                        </p>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={isAssignedToMe ? "Type your reply..." : "Reply to claim this conversation..."}
                          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={sending || !reply.trim()}
                          className="rounded-2xl bg-blue-700 px-6 py-2.5 text-[12px] font-bold text-white hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50"
                        >
                          {sending ? '...' : 'Send'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-slate-50/30 h-full">
                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                  <FaComments className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-medium text-slate-600">No active conversation</p>
                <p className="text-xs mt-1">Select a chat from the sidebar to start responding</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Support


