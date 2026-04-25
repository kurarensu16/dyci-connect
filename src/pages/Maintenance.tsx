import React, { useEffect, useState } from 'react';
import { FaClock, FaServer, FaSync } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';

const Maintenance: React.FC = () => {
  const [message, setMessage] = useState('The system is currently under maintenance. Please check back later.');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetchMaintenanceStatus();
    // Poll every 30 seconds to check if maintenance is over
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceStatus = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('maintenance_mode, maintenance_message, maintenance_started_at')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching maintenance status:', error);
        return;
      }

      if (data) {
        // If maintenance mode is disabled, redirect to login
        if (!data.maintenance_mode) {
          window.location.href = '/login';
          return;
        }

        setMessage(data.maintenance_message || 'The system is currently under maintenance. Please check back later.');
        setStartTime(data.maintenance_started_at);
      }
    } catch (err) {
      console.error('Maintenance check error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsChecking(false), 800); // Small delay for visual feedback
    }
  };

  const formatDuration = () => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60); // minutes

    if (diff < 1) return 'Just started';
    if (diff < 60) return `${diff} minute${diff > 1 ? 's' : ''}`;
    const hours = Math.floor(diff / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FaServer className="text-4xl text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-500">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        {/* Maintenance Card - Aligned to legacy-card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 transition-transform hover:scale-105">
              <img src="/icons/icon-512x512.png" alt="DYCI Connect" className="w-12 h-12 object-contain" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Under Maintenance</h2>
            <div className="h-0.5 w-10 bg-amber-400/30 my-4 rounded-full"></div>

            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
              {message}
            </p>

            {startTime && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 border border-slate-100">
                <FaClock className="w-3 h-3" />
                <span>Elapsed: {formatDuration()}</span>
              </div>
            )}

            <div className="w-full space-y-4">
              <button
                onClick={fetchMaintenanceStatus}
                disabled={isChecking}
                className="w-full py-4 bg-[#1434A4] hover:bg-[#102a82] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <FaSync className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking System...' : 'Check Status Now'}
              </button>

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                Real-time synchronization active
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">
            DYCI Connect
          </p>
          <div className="h-4 w-px bg-slate-200 mx-auto"></div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] px-8 leading-loose opacity-50">
            Access to this system is restricted to authorized personnel.
            Dr. Yanga's Colleges, Inc. © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
