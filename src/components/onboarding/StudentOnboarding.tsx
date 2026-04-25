import React, { useState, useEffect } from 'react';
import { FaFingerprint, FaCheck, FaUser, FaMapMarkerAlt, FaGraduationCap, FaEye, FaEyeSlash } from 'react-icons/fa';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { fetchSchoolSettings, fetchAcademicYears, acceptConforme } from '../../lib/api/settings';
import toast from 'react-hot-toast';
import PasswordStrengthIndicator from '../auth/PasswordStrengthIndicator';

interface StudentOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const StudentOnboarding: React.FC<StudentOnboardingProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<'check' | 'welcome' | 'conforme' | 'password' | 'profile' | 'success'>('check');
  const [loading, setLoading] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nickname: '',
    studentId: '',
    streetAddress: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    department: '',
    program: '',
    yearLevel: '',
    section: '',
  });

  // Lookups
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [yearLevels, setYearLevels] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Conforme form
  const [conformeAccepted, setConformeAccepted] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [academicYearName, setAcademicYearName] = useState<string | null>(null);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);

  useEffect(() => {
    checkOnboardingRequired();
  }, [userId]);

  useEffect(() => {
    loadAcademicYear();
    loadRegions();
    loadAcademicLookups();
  }, []);

  const loadRegions = async () => {
    try {
      const res = await fetch('https://psgc.cloud/api/regions');
      if (!res.ok) throw new Error(`Failed to load regions: ${res.status}`);
      const data = await res.json();
      setRegions(data);
    } catch (err) {
      console.error('Error loading PSGC regions:', err);
    }
  };

  const loadAcademicLookups = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [deptRes, progRes, yearRes, sectionsRes] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('programs').select('id, name, department_id').order('name'),
        supabase.from('year_levels').select('id, label, sort_order').order('sort_order'),
        supabase.from('sections').select('id, label, sort_order').order('sort_order'),
      ]);

      if (deptRes.data) setDepartments(deptRes.data);
      if (progRes.data) setPrograms(progRes.data);
      if (yearRes.data) setYearLevels(yearRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
    } catch (err) {
      console.error('Error loading academic lookups:', err);
    }
  };

  const loadAcademicYear = async () => {
    try {
      const { data: settings } = await fetchSchoolSettings();
      if (!settings) return;

      const yearId = settings.current_academic_year_id;
      setAcademicYearId(yearId);

      const { data: years } = await fetchAcademicYears();
      if (years) {
        const currentYear = years.find(y => y.id === yearId);
        if (currentYear) {
          setAcademicYearName(currentYear.year_name);
        }
      }
    } catch (err) {
      console.error('Error loading academic year:', err);
    }
  };
  const handleRegionSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProfileForm(prev => ({
      ...prev,
      region: value,
      province: '',
      city: '',
      barangay: '',
    }));
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (!value) return;

    try {
      const res = await fetch(`https://psgc.cloud/api/regions/${value}/provinces`);
      if (res.ok) {
        const data = await res.json();
        setProvinces(data);
        // Handle regions with no provinces (like NCR)
        if (data.length === 0) {
          const cityRes = await fetch(`https://psgc.cloud/api/regions/${value}/cities-municipalities`);
          if (cityRes.ok) {
            const cityData = await cityRes.json();
            setCities(cityData);
          }
        }
      }
    } catch (err) {
      console.error('Error loading provinces:', err);
    }
  };

  const handleProvinceSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProfileForm(prev => ({
      ...prev,
      province: value,
      city: '',
      barangay: '',
    }));
    setCities([]);
    setBarangays([]);

    if (!value) return;

    try {
      const res = await fetch(`https://psgc.cloud/api/provinces/${value}/cities-municipalities`);
      if (res.ok) {
        const data = await res.json();
        setCities(data);
      }
    } catch (err) {
      console.error('Error loading cities:', err);
    }
  };

  const handleCitySelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProfileForm(prev => ({
      ...prev,
      city: value,
      barangay: '',
    }));
    setBarangays([]);

    if (!value) return;

    try {
      const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${value}/barangays`);
      if (res.ok) {
        const data = await res.json();
        setBarangays(data);
      }
    } catch (err) {
      console.error('Error loading barangays:', err);
    }
  };

  const checkOnboardingRequired = async () => {
    try {
      // Check profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, profile_complete, role')
        .eq('id', userId)
        .single();

      if (!profile) {
        onComplete();
        return;
      }

      // Check legacy conforme status (student_profiles or staff_profiles)
      const isStudent = profile.role === 'student';
      const subProfileTable = isStudent ? 'student_profiles' : 'staff_profiles';

      const { data: subProfile } = await supabase
        .from(subProfileTable)
        .select('enrolled_academic_year_id')
        .eq('profile_id', userId)
        .single();

      const conformeSigned = subProfile?.enrolled_academic_year_id !== null;

      // If profile is complete and conforme is signed, skip onboarding
      if (profile?.profile_complete && conformeSigned) {
        onComplete();
      } else {
        setStep('conforme');
      }
    } catch (err) {
      console.error('Onboarding check error:', err);
      onComplete();
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Geography Sync
      const regionName = regions.find(r => r.code === profileForm.region)?.name || '';
      const provinceName = provinces.find(p => p.code === profileForm.province)?.name || '';
      const cityName = cities.find(c => c.code === profileForm.city)?.name || '';
      const barangayName = barangays.find(b => b.code === profileForm.barangay)?.name || '';

      let barangayId = null;
      if (profileForm.barangay) {
        const { data: bid, error: syncError } = await supabase.rpc('sync_geographic_hierarchy', {
          r_code: profileForm.region,
          r_name: regionName,
          p_code: profileForm.province,
          p_name: provinceName,
          c_code: profileForm.city,
          c_name: cityName,
          b_code: profileForm.barangay,
          b_name: barangayName,
        });
        if (!syncError && bid) {
          barangayId = bid;
        }
      }

      // 2. Update Core Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.firstName.trim(),
          middle_name: profileForm.middleName.trim() || null,
          last_name: profileForm.lastName.trim(),
          nickname: profileForm.nickname.trim(),
          student_employee_id: profileForm.studentId.trim(),
          profile_complete: true,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 3. Update Student Profile
      const { error: studentError } = await supabase
        .from('student_profiles')
        .upsert({
          profile_id: userId,
          department_id: profileForm.department || null,
          program_id: profileForm.program || null,
          year_level_id: profileForm.yearLevel ? parseInt(profileForm.yearLevel) : null,
          section_id: profileForm.section || null,
          street_address: profileForm.streetAddress.trim(),
          barangay_id: barangayId,
          enrolled_academic_year_id: academicYearId
        });

      if (studentError) throw studentError;

      toast.success('Profile saved successfully');
      setStep('success'); // Profile is the final step in the sequence: conforme -> password -> profile -> success
    } catch (err: any) {
      console.error('Profile saving error:', err);
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConformeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!conformeAccepted) {
      return toast.error('Please accept the terms and conditions');
    }

    if (!academicYearId) {
      return toast.error('Academic year not loaded. Please try again.');
    }

    setLoading(true);

    try {
      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Use legacy acceptConforme API
      const { error } = await acceptConforme(userId, academicYearId, profile.role);

      if (error) throw error;

      toast.success('Conforme accepted successfully');
      setStep('password');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept conforme');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

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

      toast.success('Password updated successfully');
      setStep('profile');
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


  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-100">
            <div className="text-center mb-10">
              <h2 className="text-sm font-bold tracking-[0.2em] text-[#1434A4] uppercase">Account Registry</h2>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">Complete Profile Information</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Final Step: Identity & Address Verification</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-8">
              {/* Personal Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaUser className="text-[#1434A4] w-3 h-3" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Personal Identity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">First name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder="Juan"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Middle name</label>
                    <input
                      type="text"
                      value={profileForm.middleName}
                      onChange={(e) => setProfileForm({ ...profileForm, middleName: e.target.value })}
                      placeholder="Santos"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Last name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder="Dela Cruz"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Student ID</label>
                    <input
                      type="text"
                      value={profileForm.studentId}
                      onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
                      placeholder="2024-0000"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Nickname</label>
                    <input
                      type="text"
                      value={profileForm.nickname}
                      onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                      placeholder="e.g. Jun-Jun"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Geography Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaMapMarkerAlt className="text-[#1434A4] w-3 h-3" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Permanent Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Region</label>
                    <select
                      value={profileForm.region}
                      onChange={handleRegionSelectChange}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none"
                      required
                    >
                      <option value="">Select Region</option>
                      {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Province</label>
                    <select
                      value={profileForm.province}
                      onChange={handleProvinceSelectChange}
                      disabled={!profileForm.region || provinces.length === 0}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none disabled:opacity-50"
                      required={provinces.length > 0}
                    >
                      <option value="">{provinces.length === 0 ? 'No Provinces' : 'Select Province'}</option>
                      {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">City / Municipality</label>
                    <select
                      value={profileForm.city}
                      onChange={handleCitySelectChange}
                      disabled={!profileForm.region || (provinces.length > 0 && !profileForm.province)}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none disabled:opacity-50"
                      required
                    >
                      <option value="">Select City / Municipality</option>
                      {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Barangay</label>
                    <select
                      value={profileForm.barangay}
                      onChange={(e) => setProfileForm({ ...profileForm, barangay: e.target.value })}
                      disabled={!profileForm.city}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none disabled:opacity-50"
                      required
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Street / house number</label>
                  <textarea
                    value={profileForm.streetAddress}
                    onChange={(e) => setProfileForm({ ...profileForm, streetAddress: e.target.value })}
                    placeholder="e.g. 123 Sampaguita St."
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium resize-none"
                    required
                  />
                </div>
              </div>

              {/* Academic Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaGraduationCap className="text-[#1434A4] w-3 h-3" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Academic Enrollment</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Department / College</label>
                    <select
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value, program: '' })}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Program</label>
                    <select
                      value={profileForm.program}
                      onChange={(e) => setProfileForm({ ...profileForm, program: e.target.value })}
                      disabled={!profileForm.department}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none disabled:opacity-50"
                      required
                    >
                      <option value="">Select Program</option>
                      {programs
                        .filter(p => p.department_id === profileForm.department)
                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Year level</label>
                    <select
                      value={profileForm.yearLevel}
                      onChange={(e) => setProfileForm({ ...profileForm, yearLevel: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none"
                      required
                    >
                      <option value="">Select Year Level</option>
                      {yearLevels.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 ml-1 mb-1">Section</label>
                    <select
                      value={profileForm.section}
                      onChange={(e) => setProfileForm({ ...profileForm, section: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm font-medium appearance-none"
                    >
                      <option value="">Select Section (Optional)</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !profileForm.firstName ||
                    !profileForm.lastName ||
                    !profileForm.studentId ||
                    !profileForm.nickname ||
                    !profileForm.region ||
                    (provinces.length > 0 && !profileForm.province) ||
                    !profileForm.city ||
                    !profileForm.barangay ||
                    !profileForm.streetAddress ||
                    !profileForm.department ||
                    !profileForm.program ||
                    !profileForm.yearLevel
                  }
                  className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white font-bold py-5 rounded-full transition-all shadow-2xl shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-[0.2em] text-xs"
                >
                  {loading ? 'Finalizing Registry...' : 'Complete Account Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'conforme') {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-100">
            <div className="text-center mb-8">
              <h1 className="text-sm font-bold tracking-[0.2em] text-[#1434A4] uppercase">DYCI CONNECT</h1>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">User Conforme & Data Privacy Agreement</h2>
              {academicYearName && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                    Academic Year {academicYearName}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleConformeSubmit} className="space-y-8">
              <div className="bg-white rounded-2xl pr-4 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#A5A6F6] scrollbar-track-transparent">
                <div className="text-[11px] text-slate-600 space-y-6 leading-relaxed">
                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">1. Declaration of Identity and Authority</h3>
                    <p>I hereby certify that I am a bona fide student or employee of Dr. Yanga's Colleges, Inc. (DYCI). I declare that the information provided during this registration—including my Full Name, Student/Employee ID, and assigned Academic Department—is true, accurate, and current. I understand that any misrepresentation of my identity may be grounds for disciplinary action under the Student Handbook.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">2. Data Privacy Consent (RA 10173)</h3>
                    <p>In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines, I voluntarily grant DYCI Connect permission to collect and process my personal data.</p>
                    <div className="mt-3 space-y-2">
                      <p><span className="font-bold text-slate-900">Purpose:</span> My data (including my address and school-role info) will be used solely for academic purposes, account authentication, and school-related communications.</p>
                      <p><span className="font-bold text-slate-900">Storage:</span> I understand my profile information, including my Profile Picture and Nickname, will be stored securely within the DYCI Connect database.</p>
                      <p><span className="font-bold text-slate-900">Access:</span> I acknowledge my right to access, verify, and request corrections to my data if inaccuracies are found in my profile.</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">3. Acceptable Use & Account Security</h3>
                    <div className="space-y-3">
                      <p><span className="font-bold text-slate-900">Account Responsibility:</span> I am solely responsible for maintaining the confidentiality of my password. I agree not to share my login credentials with any other individual.</p>
                      <p><span className="font-bold text-slate-900">Prohibited Acts:</span> I will not attempt to disrupt the platform's services, bypass security protocols, or use the system for any purpose that violates school policies.</p>
                      <p><span className="font-bold text-slate-900">Content Standards:</span> I agree to use an appropriate Profile Picture and Nickname that reflect the professional and academic standards of the institution.</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">4. Acceptance of Terms</h3>
                    <p>By clicking "I Agree" or "Create Account," I acknowledge that I have read, understood, and agreed to be bound by the terms of this Conforme and the existing policies of Dr. Yanga's Colleges, Inc.</p>
                  </section>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={conformeAccepted}
                    onChange={(e) => setConformeAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1434A4] focus:ring-[#1434A4]"
                  />
                  <span className="text-xs text-slate-500 font-medium group-hover:text-slate-800 transition-colors leading-relaxed">
                    I confirm that I have read and understood the DYCI Connect User Conforme & Data Privacy Agreement, and I agree to be bound by its terms.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !conformeAccepted}
                  className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  {loading ? 'Processing...' : 'I Agree & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-blue-100/50">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 uppercase">Set New Password</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Account Security Phase</p>
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
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all font-bold pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all font-bold pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <PasswordStrengthIndicator
                password={passwordForm.newPassword}
                onValidationChange={setPasswordValid}
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !passwordValid ||
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-widest text-xs"
              >
                {loading ? 'Updating Credentials...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-blue-200">
            <FaCheck className="text-5xl text-[#1434A4]" />
          </div>
          <h2 className="text-3xl font-bold text-[#1434A4] mb-2 tracking-tight uppercase">All Set!</h2>
          <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
            Your account is now complete.<br />Redirecting to your dashboard...
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3 text-blue-600 bg-blue-50/50 py-3 rounded-full border border-blue-100/50">
              <FaCheck className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Profile completed</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-600 bg-blue-50/50 py-3 rounded-full border border-blue-100/50">
              <FaCheck className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Conforme signed</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentOnboarding;
