import React, { useState, useEffect } from 'react';
import {
  FaArrowRight,
  FaClock,
  FaBullhorn,
  FaPaperPlane,
  FaBroadcastTower,
  FaExclamationCircle,
  FaCheckDouble,
  FaTerminal,
  FaLock,
  FaUnlock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaMicrochip,
  FaShieldAlt,
  FaCheckCircle,
  FaSearch
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
  getSystemHealth,
  getSystemAlerts,
  resolveSystemAlert,
  getRLSStatus
} from '../../lib/api/system';
import type {
  InfrastructureHealth,
  RLSStatus,
  SystemAlert
} from '../../lib/api/system';
import {
  notifyAllVerifiedUsers,
  notifyRole
} from '../../lib/api/notifications';
import type { NotificationType } from '../../lib/api/notifications';

/**
 * System Admin Alerts & Ledger
 * Focused on Global Schema Monitoring (Watchtower) and Resolution.
 * Monitors ALL tables in the schema.
 */
const SysAdminAlerts: React.FC = () => {
  // --- States ---
  const [ledger, setLedger] = useState<SystemAlert[]>([]);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [health, setHealth] = useState<InfrastructureHealth | null>(null);
  const [rlsDetail, setRlsDetail] = useState<RLSStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTables, setShowAllTables] = useState(false);

  // Announcement Form States
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<NotificationType>('info');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'staff' | 'student'>('all');
  const [sending, setSending] = useState(false);

  // Resolution State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // --- Effects ---
  useEffect(() => {
    fetchPulseAndLedger();
    const interval = setInterval(fetchPulseAndLedger, 30000); // 30s heartbeat
    return () => clearInterval(interval);
  }, [view]);

  const fetchPulseAndLedger = async () => {
    setLoading(true);
    try {
      const [healthRes, ledgerRes, rlsRes] = await Promise.all([
        getSystemHealth(),
        getSystemAlerts(view === 'history'),
        getRLSStatus()
      ]);

      setHealth(healthRes.data);
      setLedger(ledgerRes.data || []);
      setRlsDetail(rlsRes.data || []);
    } catch (err) {
      console.error('Pulse Sync Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Legitimation Error: Title and Message required.');
      return;
    }

    setSending(true);
    try {
      let result;
      if (broadcastTarget === 'all') {
        result = await notifyAllVerifiedUsers(broadcastTitle, broadcastMessage);
      } else {
        result = await notifyRole(broadcastTarget, broadcastTitle, broadcastMessage);
      }

      if (result.error) throw result.error;

      toast.success(`Broadcast successfully released to ${broadcastTarget.toUpperCase()} node.`);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      toast.error('Transmission Failure: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingId) return;

    try {
      const { error } = await resolveSystemAlert(resolvingId, resolutionNotes);
      if (error) throw error;

      toast.success('Incident resolved and archived to System Ledger.');
      setResolvingId(null);
      setResolutionNotes('');
      fetchPulseAndLedger();
    } catch (err: any) {
      toast.error('Resolution Error: ' + err.message);
    }
  };

  const bypassedCount = rlsDetail.filter(r => !r.rls_enabled).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight pb-20">
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">Security & Alerts</h1>
          <p className="unified-header-subtitle">Institutional Infrastructure Monitoring</p>
        </div>
      </header>

      <main className="unified-main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Ledger & Pulse */}
          <div className="lg:col-span-2 space-y-8">
            {/* Unified Health Console */}
            <section className={`rounded-2xl p-8 text-white relative overflow-hidden shadow-xl animate-in fade-in transition-colors duration-500 ${loading ? 'bg-slate-800' :
              (bypassedCount === 0) ? 'bg-[#1434A4]' : 'bg-rose-600 shadow-rose-600/20'
              }`}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                    <FaTerminal className={loading ? 'animate-pulse' : ''} />
                    <span>System Health: {loading ? 'Syncing...' : (health?.security_gateway_status || 'Operational')}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/10">
                    Pulse: {health?.cpu_load_percent || 0}% CPU
                  </div>
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  {loading ? 'Performing Audit...' :
                    (bypassedCount === 0) ? 'All Systems Protected' :
                      'Security Warning'}
                </h2>
                <p className="mt-2 text-[11px] font-medium text-blue-100/70 max-w-lg leading-relaxed">
                  {loading ? (
                    'Synchronizing with institutional control plane and verifying schema integrity.'
                  ) : (bypassedCount === 0) ? (
                    'Infrastructure shields are active and enforced across all validated nodes.'
                  ) : (
                    `Bypass detected in ${bypassedCount} schema node(s). Escalate to Internal Engineering immediately.`
                  )}
                </p>

                <div className="mt-8 flex items-center space-x-6">
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Latency</p>
                    <p className="text-lg font-bold">{health?.db_replica_lag_ms || 0}ms</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Protocol</p>
                    <p className="text-lg font-bold">WSS-SEC</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <button
                    onClick={() => document.getElementById('security-watchtower')?.scrollIntoView({ behavior: 'smooth' })}
                    className="group flex flex-col hover:opacity-80 transition-all"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:text-white transition-colors">Shield State</p>
                    <p className={`text-lg font-bold flex items-center space-x-2 ${(!loading && bypassedCount === 0) ? 'text-emerald-300' : 'text-white animate-pulse'}`}>
                      <span>{loading ? 'VERIFYING' : (bypassedCount === 0) ? 'ACTIVE' : 'VULNERABLE'}</span>
                    </p>
                  </button>
                </div>
              </div>
              <FaMicrochip className="absolute -right-8 -bottom-8 text-[12rem] opacity-[0.05] pointer-events-none" />
            </section>

            {/* Security Watchtower - Focused Toggle */}
            <section id="security-watchtower" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden scroll-mt-6">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-900 p-2.5 rounded-2xl text-white text-xs">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Security Audit</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Schema Protection Matrix</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllTables(!showAllTables)}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  {showAllTables ? 'Showing All Tables' : `View ${rlsDetail.length} Protected Nodes`}
                </button>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/50 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-8 py-4 font-black">Node Identity</th>
                      <th className="px-8 py-4 font-black">State</th>
                      <th className="px-8 py-4 font-black text-right">Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rlsDetail
                      .filter(item => showAllTables || !item.rls_enabled)
                      .map((item) => (
                        <tr key={item.table_name} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${item.rls_enabled ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-500'
                                }`}>
                                <FaTerminal className="text-[10px]" />
                              </div>
                              <span className={`font-bold tracking-tight italic ${item.rls_enabled ? 'text-slate-700' : 'text-rose-600'}`}>
                                {item.table_name.startsWith('public.') ? item.table_name : `public.${item.table_name}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm ${item.rls_enabled ? 'text-emerald-600 bg-emerald-50 border border-emerald-100/50' : 'text-white bg-rose-600 border border-rose-500 shadow-rose-200 animate-pulse'
                              }`}>
                              {item.rls_enabled ? <FaLock /> : <FaUnlock />}
                              <span>{item.rls_enabled ? 'Enforced' : 'Bypassed'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right whitespace-nowrap text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                            System Admin Verified
                          </td>
                        </tr>
                      ))}
                    {rlsDetail.filter(item => showAllTables || !item.rls_enabled).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <FaCheckCircle className="text-emerald-500 text-xl mb-2 opacity-20" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All critical schemas enforced</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Ledger Feed */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => setView('active')}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${view === 'active' ? 'text-dyci-blue' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Active Ledger
                    {view === 'active' && <span className="absolute -bottom-2 left-0 w-full h-1 bg-dyci-blue rounded-full" />}
                  </button>
                  <button
                    onClick={() => setView('history')}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${view === 'history' ? 'text-dyci-blue' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Audit History
                    {view === 'history' && <span className="absolute -bottom-2 left-0 w-full h-1 bg-dyci-blue rounded-full" />}
                  </button>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-bold">
                  <span className="flex items-center text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[9px] font-extrabold uppercase tracking-widest">
                    {ledger.filter(a => a.severity === 'critical').length} CRITICAL
                  </span>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-400 uppercase tracking-tighter">
                    {ledger.length} {view === 'active' ? 'Active' : 'Archived'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {ledger.map((alert) => (
                  <div key={alert.id} className={`bg-white border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] rounded-2xl p-6 shadow-sm transition-all hover:shadow-md group relative overflow-hidden ${alert.severity === 'critical' ? 'border-l-rose-500' :
                    alert.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-5 flex-1">
                        <div className={`mt-1 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border ${alert.severity === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          alert.severity === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                          {alert.severity === 'critical' ? <FaExclamationTriangle className="text-base" /> :
                            alert.severity === 'warning' ? <FaExclamationCircle className="text-base" /> :
                              <FaInfoCircle className="text-base" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{alert.title}</h4>
                            {alert.is_resolved && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest leading-none">Resolved</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-lg">
                            {alert.message}
                          </p>
                          <div className="mt-5 flex items-center space-x-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                              <FaClock className="mr-1.5 opacity-60" />
                              {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                              Zone: {alert.type}
                            </span>
                            {view === 'history' && alert.resolver && (
                              <>
                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                  Resolved by {alert.resolver.first_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {view === 'active' && (
                        <button
                          onClick={() => setResolvingId(alert.id)}
                          className="ml-4 p-4 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-transparent hover:border-emerald-100 flex flex-col items-center justify-center shrink-0 self-center"
                        >
                          <FaCheckDouble className="text-xl" />
                          <span className="text-[8px] font-black mt-1.5 uppercase tracking-tighter">Resolve</span>
                        </button>
                      )}
                    </div>

                    {/* Background Accent for Critical */}
                    {alert.severity === 'critical' && !alert.is_resolved && (
                      <div className="absolute right-0 top-0 h-full w-1.5 bg-rose-500/20" />
                    )}
                  </div>
                ))}

                {ledger.length === 0 && !loading && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-24 text-center shadow-sm">
                    <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl border border-emerald-100/50">
                      <FaCheckCircle className="animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Ledger Synchronized</h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium">All institutional anomalies have been addressed and archived.</p>
                    <div className="mt-8">
                      <button
                        onClick={() => fetchPulseAndLedger()}
                        className="bg-slate-50 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all"
                      >
                        Refresh Pulse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Announcement Hub */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden sticky top-12">
              <div className="bg-slate-900 p-8 text-white relative">
                <FaBroadcastTower className="absolute top-6 right-6 text-4xl opacity-10" />
                <div className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-3">
                  <FaBullhorn />
                  <span>Announcement Plane</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Broadcast Center</h3>
              </div>

              <form onSubmit={handleSendBroadcast} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g., System Update"
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold tracking-tight"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea
                    rows={3}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Brief content..."
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none font-medium leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Level</label>
                    <div className="relative">
                      <select
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value as NotificationType)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:outline-none appearance-none font-bold text-slate-700"
                      >
                        <option value="info">Information</option>
                        <option value="warning">Warning</option>
                        <option value="error">Critical</option>
                      </select>
                      <FaArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 pointer-events-none rotate-90" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target</label>
                    <div className="relative">
                      <select
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:outline-none appearance-none font-bold text-slate-700"
                      >
                        <option value="all">Institution</option>
                        <option value="staff">Staff Body</option>
                        <option value="student">Students</option>
                      </select>
                      <FaArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-5 bg-dyci-blue text-white rounded-2xl font-bold text-xs uppercase tracking-[0.3em] shadow-xl shadow-dyci-blue/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {sending ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><FaPaperPlane /> <span>Release Decree</span></>}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </main>

      {/* Resolution Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-emerald-600 p-10 text-white relative">
              <FaCheckDouble className="absolute top-8 right-10 text-5xl opacity-20" />
              <h3 className="text-2xl font-bold tracking-tight">Resolve Incident</h3>
              <p className="text-xs text-emerald-100 mt-2 font-medium">Archive this alert to the institutional ledger.</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Resolution Summary</label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain findings and remediation steps..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all resize-none font-medium text-slate-800 leading-relaxed"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setResolvingId(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Archive Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 opacity-40">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 pt-8">
          <span>Alerts Node: SYSTEM-ADMIN-PLANE</span>
          <span>DYCI CONSTITUTIONAL COVENANT</span>
        </div>
      </footer>
    </div>
  );
};

export default SysAdminAlerts;
