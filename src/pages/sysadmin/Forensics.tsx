import React, { useState, useEffect } from 'react';
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { supabase } from '../../lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

// ─── Constants ───────────────────────────────────────────────────────
const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getEventType = (action: string, tableName: string, _oldData?: any, _newData?: any): string => {
  const securityTables = ['user_roles', 'profiles', 'student_profiles', 'staff_profiles', 'migration_state_machine'];
  const governanceTables = ['handbook_views', 'handbook_sections', 'handbook_approvals', 'handbook_approval_requirements', 'handbooks'];
  const academicTables = ['grades', 'enrollments', 'academic_years', 'sections'];
  const storageTables = ['files', 'folders', 'file_versions'];
  const studentTables = ['todos'];
  const publicationTables = ['cms_content', 'posts', 'pages', 'news', 'announcements'];
  const chatTables = ['chat_messages', 'conversations', 'conversation_participants', 'chat_message_edits'];

  if (securityTables.includes(tableName)) return 'Security';
  if (governanceTables.includes(tableName)) return 'Governance';
  if (academicTables.includes(tableName)) return 'Academic';
  if (storageTables.includes(tableName)) return 'Storage';
  if (studentTables.includes(tableName)) return 'Student';
  if (publicationTables.includes(tableName)) return 'Publication';
  if (chatTables.includes(tableName)) return 'Chat';
  if (action === 'DELETE') return 'Mutation';
  return 'Data';
};

const getActionLabel = (action: string, tableName: string, oldData?: any, newData?: any): string => {
  // Handbook governance events
  if (tableName === 'handbook_views') {
    const oldStatus = oldData?.approval_status;
    const newStatus = newData?.approval_status;
    const sectionTitle = newData?.section_title || oldData?.section_title || 'Handbook Section';

    if (action === 'INSERT') {
      return `Viewed — ${sectionTitle}`;
    }
    if (action === 'UPDATE' && oldStatus !== newStatus) {
      if (newStatus === 'l2_approved') return `Department Approved — ${sectionTitle}`;
      if (newStatus === 'l3_approved') return `Executive Approved — ${sectionTitle}`;
      if (newStatus === 'pending') return `Submitted for Approval — ${sectionTitle}`;
      if (newStatus === 'rejected') return `Approval Rejected — ${sectionTitle}`;
      if (newStatus === 'published') return `Published — ${sectionTitle}`;
    }
    return `Updated — ${sectionTitle}`;
  }

  // Handbook approval workflow events
  if (tableName === 'handbook_approvals') {
    const position = newData?.position || oldData?.position || 'Position';
    const sectionTitle = newData?.section_title || oldData?.section_title || 'Section';

    if (action === 'INSERT') return `${position} Approval Recorded — ${sectionTitle}`;
    if (action === 'UPDATE') return `${position} Approval Updated — ${sectionTitle}`;
    if (action === 'DELETE') return `${position} Approval Revoked — ${sectionTitle}`;
  }

  // Student todos events
  if (tableName === 'todos') {
    const title = newData?.title || oldData?.title || 'Task';
    const priority = newData?.priority || oldData?.priority || 'standard';
    const status = newData?.status ?? oldData?.status;

    if (action === 'INSERT') return `Task Created — ${title} (${priority})`;
    if (action === 'UPDATE' && status === 3) return `Task Completed — ${title}`;
    if (action === 'UPDATE') return `Task Updated — ${title}`;
    if (action === 'DELETE') return `Task Deleted — ${title}`;
  }

  // Student grades events
  if (tableName === 'grades') {
    const subject = newData?.subject || oldData?.subject || 'Subject';
    const grade = newData?.grade || oldData?.grade;
    const gradeStr = grade ? ` (${grade})` : '';

    if (action === 'INSERT') return `Grade Recorded — ${subject}${gradeStr}`;
    if (action === 'UPDATE') return `Grade Modified — ${subject}${gradeStr}`;
    if (action === 'DELETE') return `Grade Removed — ${subject}`;
  }

  // Storage files events
  if (tableName === 'files') {
    const name = newData?.name || oldData?.name || 'File';
    const size = newData?.size || oldData?.size;
    const sizeStr = size ? ` (${Math.round(size / 1024)}KB)` : '';

    if (action === 'INSERT') return `File Uploaded — ${name}${sizeStr}`;
    if (action === 'UPDATE') return `File Modified — ${name}`;
    if (action === 'DELETE') return `File Deleted — ${name}`;
  }

  // Storage folders events
  if (tableName === 'folders') {
    const name = newData?.name || oldData?.name || 'Folder';
    if (action === 'INSERT') return `Folder Created — ${name}`;
    if (action === 'UPDATE') return `Folder Updated — ${name}`;
    if (action === 'DELETE') return `Folder Deleted — ${name}`;
  }

  // Publication events
  if (['cms_content', 'posts', 'pages', 'news', 'announcements'].includes(tableName)) {
    const title = newData?.title || oldData?.title || 'Content';
    const status = newData?.status;
    if (action === 'INSERT') return `Published — ${title}`;
    if (action === 'UPDATE' && status === 'published') return `Updated & Published — ${title}`;
    if (action === 'UPDATE') return `Modified — ${title}`;
    if (action === 'DELETE') return `Unpublished — ${title}`;
  }

  // Chat events
  if (tableName === 'chat_messages') {
    const isAutoReply = newData?.is_auto_reply || oldData?.is_auto_reply;
    const sender = isAutoReply ? 'Chatbot' : (newData?.sender_id ? 'User' : 'System');
    const preview = (newData?.message || oldData?.message || '').slice(0, 30);

    if (action === 'INSERT') return `${sender} Message — "${preview}..."`;
    if (action === 'UPDATE') return `Message Edited — "${preview}..."`;
    if (action === 'DELETE') return `Message Deleted — "${preview}..."`;
  }

  if (tableName === 'conversations') {
    const status = newData?.status || oldData?.status;
    const assigned = newData?.assigned_admin_id ? ' (Assigned)' : '';

    if (action === 'INSERT') return `Chat Started${assigned}`;
    if (action === 'UPDATE' && status === 'resolved') return `Chat Resolved`;
    if (action === 'UPDATE' && status === 'open') return `Chat Reopened`;
    if (action === 'UPDATE') return `Chat Updated${assigned}`;
    if (action === 'DELETE') return `Chat Deleted`;
  }

  if (tableName === 'conversation_participants') {
    if (action === 'INSERT') return `Participant Added`;
    if (action === 'DELETE') return `Participant Removed`;
  }

  // Default labels
  const labels: Record<string, string> = {
    'INSERT': 'Created',
    'UPDATE': 'Modified',
    'DELETE': 'Deleted',
  };
  return `${labels[action] || action} ${tableName}`;
};

// ─── Component ───────────────────────────────────────────────────────
type EventClass = 'ALL' | 'Security' | 'Governance' | 'Publication' | 'Storage' | 'Academic' | 'Student' | 'Chat' | 'Mutation' | 'Data';

const SysAdminForensics: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [actionCounts, setActionCounts] = useState({ INSERT: 0, UPDATE: 0, DELETE: 0 });
  const [filterAction, setFilterAction] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL');
  const [filterEventClass, setFilterEventClass] = useState<EventClass>('ALL');

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── Data Loading ──────────────────────────────────────────────────
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filterAction, filterEventClass]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0);
      fetchLogs();
      fetchStats();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id, actor_id, actor_role, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at,
          actor:profiles!actor_id(first_name, last_name, email)
        `, { count: 'exact' });

      // Filter by action type
      if (filterAction !== 'ALL') {
        query = query.eq('action', filterAction);
      }

      // Filter by event class (table groups)
      if (filterEventClass !== 'ALL') {
        const securityTables = ['user_roles', 'profiles', 'student_profiles', 'staff_profiles', 'migration_state_machine'];
        const governanceTables = ['handbook_views', 'handbook_sections', 'handbook_approvals', 'handbook_approval_requirements', 'handbooks'];
        const publicationTables = ['cms_content', 'posts', 'pages', 'news', 'announcements'];
        const academicTables = ['grades', 'enrollments', 'academic_years', 'sections'];
        const storageTables = ['files', 'folders', 'file_versions'];
        const studentTables = ['todos'];
        const chatTables = ['chat_messages', 'conversations', 'conversation_participants', 'chat_message_edits'];

        switch (filterEventClass) {
          case 'Security':
            query = query.in('table_name', securityTables);
            break;
          case 'Governance':
            query = query.in('table_name', governanceTables);
            break;
          case 'Publication':
            query = query.in('table_name', publicationTables);
            break;
          case 'Storage':
            query = query.in('table_name', storageTables);
            break;
          case 'Academic':
            query = query.in('table_name', academicTables);
            break;
          case 'Student':
            query = query.in('table_name', studentTables);
            break;
          case 'Chat':
            query = query.in('table_name', chatTables);
            break;
          case 'Mutation':
            query = query.eq('action', 'DELETE');
            break;
        }
      }

      // Search across table_name and record data
      if (search.trim()) {
        query = query.or(`table_name.ilike.%${search.trim()}%,old_data->>id.eq.${search.trim()},new_data->>id.eq.${search.trim()}`);
      }

      // Sort by newest first
      query = query.order('created_at', { ascending: false });

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        setError(error.message);
        setLogs([]);
        return;
      }

      setLogs((data as any) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Audit logs fetch error:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch counts for each action type separately (using head=true for count-only)
      const [insertRes, updateRes, deleteRes] = await Promise.all([
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'INSERT'),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'UPDATE'),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'DELETE'),
      ]);

      setActionCounts({
        INSERT: insertRes.count || 0,
        UPDATE: updateRes.count || 0,
        DELETE: deleteRes.count || 0,
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Standard Legacy Header Bar */}
      <header className="legacy-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <h1 className="legacy-header-title">Forensic Vault</h1>
          <p className="legacy-header-subtitle">Institutional System Admin Identity Provisioning & Governance</p>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8 space-y-6">
        {/* Stats Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border-l-[6px] border-l-slate-200 border-y border-r border-y-slate-100 border-r-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Events</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount.toLocaleString()}</p>
            <p className="mt-1 text-[10px] text-slate-400">Immutable audit records</p>
          </div>
          <div className="rounded-2xl border-l-[6px] border-l-emerald-500 border-y border-r border-y-slate-100 border-r-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Created</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {actionCounts.INSERT.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-emerald-500">INSERT operations</p>
          </div>
          <div className="rounded-2xl border-l-[6px] border-l-amber-500 border-y border-r border-y-slate-100 border-r-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Modified</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {actionCounts.UPDATE.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-amber-500">UPDATE operations</p>
          </div>
          <div className="rounded-2xl border-l-[6px] border-l-rose-500 border-y border-r border-y-slate-100 border-r-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Deleted</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">
              {actionCounts.DELETE.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-rose-500">DELETE operations</p>
          </div>
        </section>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table name or record ID..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          {/* Action Filter tabs */}
          <div className="flex rounded-2xl border border-slate-200 overflow-hidden text-[10px] font-medium">
            {(['ALL', 'INSERT', 'UPDATE', 'DELETE'] as const).map((action) => (
              <button
                key={action}
                onClick={() => {
                  setFilterAction(action);
                  setPage(0);
                }}
                className={`px-3 py-2 transition-colors ${filterAction === action
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {action === 'ALL' ? 'All Events' : action}
              </button>
            ))}
          </div>
        </div>

        {/* Event Class Filter */}
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'Security', 'Governance', 'Publication', 'Storage', 'Academic', 'Student', 'Chat', 'Mutation', 'Data'] as EventClass[]).map((cls) => (
            <button
              key={cls}
              onClick={() => {
                setFilterEventClass(cls);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${filterEventClass === cls
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {cls === 'ALL' ? 'All Classes' : cls}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-rose-700 font-medium">Access Denied or Error</p>
            <p className="text-rose-500 text-sm mt-1">{error}</p>
            <p className="text-rose-400 text-xs mt-2">Forensic Vault requires System Admin access</p>
          </div>
        )}

        {/* Audit Table */}
        <section className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Class</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      {search ? `No audit logs matching "${search}"` : 'No audit logs found in the system.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const eventType = getEventType(log.action, log.table_name, log.old_data, log.new_data);
                    const actorName = log.actor
                      ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}`.trim() || log.actor.email || 'System'
                      : 'System';

                    // Format actor role for display
                    const actorRole = log.actor_role || 'system';
                    const roleDisplay = actorRole.replace(/_/g, ' ').toUpperCase();

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 text-[10px] text-gray-400">
                          <div>{formatDate(log.created_at)}</div>
                          <div className="text-gray-300">{formatTime(log.created_at)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-gray-900 tracking-widest">[{log.id.slice(0, 8).toUpperCase()}]</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${eventType === 'Security' ? 'text-rose-600 border-rose-100 bg-rose-50' :
                            eventType === 'Governance' ? 'text-purple-600 border-purple-100 bg-purple-50' :
                              eventType === 'Publication' ? 'text-cyan-600 border-cyan-100 bg-cyan-50' :
                                eventType === 'Storage' ? 'text-blue-600 border-blue-100 bg-blue-50' :
                                  eventType === 'Academic' ? 'text-indigo-600 border-indigo-100 bg-indigo-50' :
                                    eventType === 'Student' ? 'text-teal-600 border-teal-100 bg-teal-50' :
                                      eventType === 'Chat' ? 'text-pink-600 border-pink-100 bg-pink-50' :
                                        eventType === 'Mutation' ? 'text-amber-600 border-amber-100 bg-amber-50' :
                                          'text-slate-600 border-slate-100 bg-slate-50'
                            }`}>
                            {eventType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${log.action === 'DELETE' ? 'text-rose-600 border-rose-100 bg-rose-50' :
                            log.action === 'UPDATE' ? 'text-amber-600 border-amber-100 bg-amber-50' :
                              'text-emerald-600 border-emerald-100 bg-emerald-50'
                            }`}>
                            {log.action}
                          </span>
                          <p className="text-[10px] font-bold text-gray-700 tracking-tight mt-1">
                            {getActionLabel(log.action, log.table_name, log.old_data, log.new_data)}
                          </p>
                          {log.record_id && (
                            <p className="text-[8px] text-gray-400 mt-0.5 uppercase tracking-tighter">
                              Record: {log.record_id.slice(0, 8)}...
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-gray-500">
                          {actorName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${actorRole === 'system_admin' ? 'text-rose-600 border-rose-100 bg-rose-50' :
                            actorRole === 'academic_admin' ? 'text-amber-600 border-amber-100 bg-amber-50' :
                              actorRole === 'staff' ? 'text-blue-600 border-blue-100 bg-blue-50' :
                                actorRole === 'student' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' :
                                  actorRole === 'system' ? 'text-slate-500 border-slate-200 bg-slate-100' :
                                    'text-gray-500 border-gray-200 bg-gray-50'
                            }`}>
                            {roleDisplay}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-gray-400">
                          {log.table_name}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-[10px] text-slate-500">
              <span>
                Page {page + 1} of {totalPages} ({totalCount.toLocaleString()} total)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Forensic Node: SYSTEM-ADMIN-ALPHA-CORE</p>
            <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest italic">Immutable Activity Log</span>
          </div>
        </section>
      </main>

      {/* Legacy Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 opacity-40">
        <div className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 border-t border-slate-200 pt-8">
          CORE_GOVERNANCE_SYSTEM :: VERSION_7.0 :: DYCI CONSTITUTIONAL OVERRIDE
        </div>
      </footer>
    </div>
  );
};

export default SysAdminForensics;
