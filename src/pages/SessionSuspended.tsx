import React, { useEffect, useState } from 'react';
import { FaLock, FaClock, FaServer } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';

const SessionSuspended: React.FC = () => {
  const [overrideInfo, setOverrideInfo] = useState<{
    initiated_at: string | null;
    reason: string | null;
    initiated_by: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverrideInfo();
    // Check every 10 seconds if override is released
    const interval = setInterval(checkOverrideStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOverrideInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auth_override_status');

      if (!error && data && data.length > 0) {
        setOverrideInfo(data[0]);
      }
    } catch (err) {
      console.error('Error fetching override info:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkOverrideStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_auth_override_active');

      if (!error && !data) {
        // Override released, redirect to login
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error checking override status:', err);
    }
  };

  const formatDuration = () => {
    if (!overrideInfo?.initiated_at) return '';
    const start = new Date(overrideInfo.initiated_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);

    if (diff < 1) return 'Just now';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-600 shadow-xl shadow-rose-600/20 mb-4">
            <FaLock className="text-3xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">DYCI Connect</h1>
          <p className="text-sm text-slate-500 mt-1">Institutional Management System</p>
        </div>

        {/* Suspended Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-rose-50 border-b border-rose-100 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100">
                <FaLock className="text-rose-600" />
              </div>
              <div>
                <h2 className="font-bold text-rose-900">Session Suspended</h2>
                <p className="text-xs text-rose-700">Authentication override active</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-slate-600 text-center leading-relaxed mb-6">
              Your session has been temporarily suspended due to a security lockdown.
              All standard user access is currently restricted.
            </p>

            {overrideInfo?.initiated_at && (
              <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 mb-6">
                <FaClock className="text-slate-400" />
                <span>Duration: {formatDuration()}</span>
              </div>
            )}

            {overrideInfo?.reason && (
              <div className="bg-slate-50 rounded-lg p-3 mb-6">
                <p className="text-xs text-slate-500 text-center">
                  <span className="font-semibold">Reason:</span> {overrideInfo.reason}
                </p>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-center text-slate-400 mb-4">
                This page will automatically refresh when the lockdown is released.
              </p>
              <button
                onClick={checkOverrideStatus}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-2xl transition-colors"
              >
                Check Status Now
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
          If you need immediate assistance, please contact the System Admin.
        </p>
      </div>
    </div>
  );
};

export default SessionSuspended;
