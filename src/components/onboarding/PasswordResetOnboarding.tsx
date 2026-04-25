import React, { useState, useEffect } from 'react';
import { FaFingerprint, FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import PasswordStrengthIndicator from '../auth/PasswordStrengthIndicator';

interface PasswordResetOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const PasswordResetOnboarding: React.FC<PasswordResetOnboardingProps> = ({ userId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'reset' | 'success'>('check');
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordValid, setPasswordValid] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    checkPasswordResetRequired();
  }, [userId]);

  const checkPasswordResetRequired = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('password_reset_required')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data?.password_reset_required) {
        setStep('reset');
      } else {
        onComplete();
      }
    } catch (err) {
      console.error('Password check error:', err);
      onComplete(); // Allow proceeding on error
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordForm.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (!passwordValid) {
      return toast.error('Password does not meet institutional security standards');
    }

    setLoading(true);
    try {
      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      // Log password change to audit
      await supabase.rpc('log_password_change');

      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Password change error:', err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'check') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FaFingerprint className="animate-pulse text-4xl text-[#1434A4] mx-auto mb-4" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Checking Account Status...</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheck className="text-4xl text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
          <p className="text-sm text-slate-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-xs font-bold tracking-[0.3em] text-[#1434A4] uppercase">Security Protocol</h1>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
            <p className="mt-2 text-xs text-slate-500">For your security, please create a new secure password for your account.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all font-bold pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <PasswordStrengthIndicator
              password={passwordForm.newPassword}
              onValidationChange={setPasswordValid}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all font-bold pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-widest text-xs"
            >
              {loading ? 'Processing...' : 'Update Password'}
            </button>
          </form>

          {/* Security Tips */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Security Guidelines</p>
            <ul className="space-y-2 text-[11px] text-slate-500 font-medium">
              <li className="flex items-center">
                <FaCheck className="text-emerald-500 mr-2 h-3 w-3" />
                Use a mix of alphanumeric characters
              </li>
              <li className="flex items-center">
                <FaCheck className="text-emerald-500 mr-2 h-3 w-3" />
                Minimum length of 8 characters
              </li>
              <li className="flex items-center">
                <FaCheck className="text-emerald-500 mr-2 h-3 w-3" />
                Avoid sequences like &quot;123456&quot;
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Institutional Security Management
        </p>
      </div>
    </div>
  );
};

export default PasswordResetOnboarding;
