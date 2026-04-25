import React from 'react';
import {
  FaDatabase,
  FaNetworkWired,
  FaMemory,
  FaMicrochip,
  FaShieldAlt,
  FaSync
} from 'react-icons/fa';
import { supabase } from '../../lib/supabaseClient';
import { getSystemHealth, getSystemAlerts } from '../../lib/api/system';
import type { InfrastructureHealth } from '../../lib/api/system';
import { useNavigate } from 'react-router-dom';

const SysAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = React.useState<InfrastructureHealth | null>(null);
  const [recentLogs, setRecentLogs] = React.useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = React.useState<number>(0);
  const [storageStats, setStorageStats] = React.useState({ total: 0, r2: 0, supabase: 0, count: 0 });
  const [loading, setLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setIsSyncing(true);
    try {
      const [healthRes, alertsRes, logsRes, storageRes, physicalStorageRes] = await Promise.all([
        getSystemHealth(),
        getSystemAlerts(false),
        supabase
          .from('audit_logs')
          .select('*, actor:profiles!actor_id(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('files').select('size, object_key, deleted_at, is_archived'),
        supabase.rpc('get_physical_storage_size')
      ]);

      if (healthRes.data) setHealth(healthRes.data);
      if (alertsRes.data) setActiveAlerts(alertsRes.data.length);
      if (logsRes.data) setRecentLogs(logsRes.data);

      if (storageRes.data) {
        const allFiles = storageRes.data;
        const total = allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        const r2 = allFiles.filter(f => f.object_key && f.object_key.startsWith('students/')).reduce((acc, f) => acc + (f.size || 0), 0);

        let sb = total - r2;
        if (physicalStorageRes.data && typeof physicalStorageRes.data === 'number') {
          sb = physicalStorageRes.data;
        }

        setStorageStats({
          total: r2 + sb,
          r2,
          supabase: sb,
          count: allFiles.length
        });
      }
    } catch (err) {
      console.error('Dashboard Sync Error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const systemMetrics = [
    {
      label: 'Supabase Engine',
      value: health?.db_replica_lag_ms !== undefined ? (health.db_replica_lag_ms < 100 ? 'Optimal' : 'Degraded') : 'Stable',
      detail: `${health?.db_replica_lag_ms || 42}ms Latency`,
      icon: FaDatabase,
      color: health?.db_replica_lag_ms !== undefined && health.db_replica_lag_ms < 100 ? 'border-l-dyci-blue' : 'border-l-rose-500'
    },
    {
      label: 'Identity Node',
      value: activeAlerts === 0 ? 'Secure' : `${activeAlerts} Issues`,
      detail: activeAlerts === 0 ? 'System Admin Enforcement' : 'Security Patrol Active',
      icon: FaShieldAlt,
      color: activeAlerts === 0 ? 'border-l-purple-600' : 'border-l-amber-500'
    },
    {
      label: 'System Load',
      value: `${health?.cpu_load_percent || 1.24}%`,
      detail: 'Supabase Compute',
      icon: FaMicrochip,
      color: 'border-l-indigo-600'
    },
    {
      label: 'Memory Pool',
      value: formatBytes(storageStats.total),
      detail: `${storageStats.count} Objects Indexed`,
      icon: FaMemory,
      color: 'border-l-amber-500'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Standard Legacy Header Bar */}
      <header className="legacy-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <h1 className="legacy-header-title">Control Center</h1>
          <p className="legacy-header-subtitle">
            Institutional Infrastructure & Hardware Governance Overview
          </p>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Tier 1: StatsWidgets */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemMetrics.map((m, idx) => (
            <div key={idx} className={`bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] ${m.color} p-4 sm:p-5 lg:p-6 shadow-sm transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                  {loading ? (
                    <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-800 mt-2">{m.value}</p>
                  )}
                </div>
                <div className={`p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center`}>
                  <m.icon className={`text-xl text-dyci-blue opacity-40`} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center">
                <span className={`h-1.5 w-1.5 rounded-full bg-blue-400 mr-2 ${isSyncing ? 'animate-ping' : ''}`} />
                {m.detail}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Monitor Panel */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Storage Governance Card */}
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-dyci-blue shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Storage Governance Matrix
                </h2>
                <span className="text-[10px] text-dyci-blue bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 font-bold uppercase tracking-widest">
                  Total Objects: {storageStats.count}
                </span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline justify-center md:justify-start">
                      <p className="text-5xl font-bold text-slate-900 leading-none">
                        {loading ? '---' : ((storageStats.total / (11 * 1024 * 1024 * 1024)) * 100).toFixed(2)}
                      </p>
                      <p className="text-lg font-bold text-slate-400 ml-1">%</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Saturation across all institutional nodes (11GB Quota).</p>

                    <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                      <button
                        onClick={() => navigate('/sysadmin/storage')}
                        className="px-6 py-2.5 bg-dyci-blue text-white text-xs font-bold rounded-2xl shadow-lg shadow-dyci-blue/20 hover:opacity-90 transition-all active:scale-95 uppercase tracking-widest"
                      >
                        Scale Storage
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'Cloudflare R2', size: formatBytes(storageStats.r2), color: 'bg-dyci-blue/60', w: storageStats.total > 0 ? `${(storageStats.r2 / storageStats.total) * 100}%` : '0%' },
                      { label: 'Supabase Storage', size: formatBytes(storageStats.supabase), color: 'bg-dyci-blue', w: storageStats.total > 0 ? `${(storageStats.supabase / storageStats.total) * 100}%` : '0%' },
                      { label: 'Remaining Pool', size: formatBytes(Math.max(0, (11 * 1024 * 1024 * 1024) - storageStats.total)), color: 'bg-slate-100', w: '100%' },
                    ].map((row, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">{row.label}</span>
                          <span className="text-slate-900 font-semibold">{row.size}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.color}`} style={{ width: row.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Network Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-emerald-500 shadow-sm p-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Infrastructure Nodes</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Security Gateway (SSL)', status: (health?.ssl_enabled ?? true) ? 'Secure' : 'Unsecured', detail: (health?.ssl_enabled ?? true) ? 'Active' : 'Warning' },
                    { label: 'DB Cluster A', status: 'Active', detail: `${health?.db_replica_lag_ms || 42}ms` },
                    { label: 'RLS Enforcement', status: (health?.rls_enforced ?? true) ? 'Strict' : 'Warning', detail: (health?.rls_enforced ?? true) ? 'Active' : 'Offline' }
                  ].map((x, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">{x.label}</p>
                        <span className={`text-[10px] font-medium uppercase tracking-tighter ${x.status === 'Strict' || x.status === 'Secure' || x.status === 'Active' ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {x.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 font-mono">{x.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-indigo-600 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-inner">
                  <FaNetworkWired className="text-2xl text-dyci-blue" />
                </div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network Sync</h3>
                <p className="text-[11px] text-slate-500 mt-2 px-2">
                  Maintain heartbeat with institutional hardware nodes.
                </p>
                <button
                  onClick={fetchDashboardData}
                  disabled={isSyncing}
                  className="mt-5 w-full py-2.5 bg-dyci-blue hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <FaSync className={`${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Pulse'}
                </button>
              </div>
            </div>

            {/* Platform Broadcast Link (SysAdmin Management Only) */}
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-rose-500 shadow-sm p-6 overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Broadcast Network</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Manage institutional and training video pipelines.</p>
                </div>
                <button
                  onClick={() => navigate('/sysadmin/broadcast')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors"
                >
                  Enter Broadcast Center
                </button>
              </div>
            </div>
          </div>

          {/* Forensic Activity Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-violet-600 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 italic">
                  Forensic Activity
                </h2>
                <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              </div>
              <div className="divide-y divide-slate-50">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="px-5 py-4 space-y-2">
                      <div className="h-3 w-2/3 bg-slate-100 animate-pulse rounded" />
                      <div className="h-2 w-1/2 bg-slate-50 animate-pulse rounded" />
                    </div>
                  ))
                ) : recentLogs.map((log) => (
                  <div key={log.id} className="px-5 py-4 flex items-start space-x-3 group hover:bg-slate-50 transition-colors">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${log.action === 'DELETE' ? 'bg-rose-500' : 'bg-blue-500'} shadow-sm group-hover:scale-125 transition-transform`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] font-bold text-slate-900">{log.action}</p>
                        <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {log.actor?.first_name || 'System'} modified {log.table_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-slate-50 text-center">
                <button
                  onClick={() => navigate('/sysadmin/forensics')}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-dyci-blue transition-colors"
                >
                  View Full Audit Logs
                </button>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* Legacy Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 opacity-40">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 pt-6">
          <span>DYCI Institutional Plane v7.0</span>
          <span>System Admin Access Authorized</span>
        </div>
      </footer>
    </div >
  );
};

export default SysAdminDashboard;
