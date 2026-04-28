import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { Skeleton } from '../../../ui/Skeleton';

interface AcademicYear {
  id: string;
  year_name: string;
  is_current: boolean;
  is_active: boolean;
}

const AcademicYearsTab: React.FC = () => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ year_name: '', is_current: false, is_active: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('academic_years').select('*').order('created_at', { ascending: false });
      setYears(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load academic year registry.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (year?: AcademicYear) => {
    if (year) {
      setEditingId(year.id);
      setFormData({ year_name: year.year_name, is_current: year.is_current, is_active: year.is_active });
    } else {
      setEditingId(null);
      setFormData({ year_name: '', is_current: false, is_active: false });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('academic_years').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Academic year updated');
      } else {
        const { error } = await supabase.from('academic_years').insert([formData]);
        if (error) throw error;
        toast.success('Academic year created');
      }
      setShowModal(false);
      fetchYears();
    } catch (error: any) {
      toast.error('Failed to save academic year. Please verify your entries.')
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      // If setting to active, we ideally want to warn if another is active, but we'll let DB handle constraints if any
      const { error } = await supabase.from('academic_years').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast.success(!currentStatus ? 'Marked as Active' : 'Marked as Inactive');
      fetchYears();
    } catch (error: any) {
      toast.error('Status transition failed. Please try again.')
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Academic Years</h3>
        <button onClick={() => openModal()} className="bg-[#1434A4] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <FaPlus /> Add Academic Year
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-sans text-sm">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton variant="text" width="60%" /></td>
                  <td className="px-6 py-4"><Skeleton height={20} width={100} className="rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton height={20} width={80} className="rounded-full" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton variant="text" width={40} className="ml-auto" /></td>
                </tr>
              ))
            ) : years.map((year) => (
              <tr key={year.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-700">{year.year_name}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${year.is_current ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {year.is_current ? 'Current Year' : 'Historical/Future'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${year.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {year.is_active ? <><FaCheck className="text-[8px]" /> Active</> : <><FaTimes className="text-[8px]" /> Inactive</>}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => toggleStatus(year.id, year.is_active)} className="text-slate-400 hover:text-amber-600 p-2" title="Toggle Active Status"><FaCheck /></button>
                  <button onClick={() => openModal(year)} className="text-slate-400 hover:text-blue-600 p-2"><FaEdit /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingId ? 'Edit Academic Year' : 'Add Academic Year'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Name</label>
                <input required value={formData.year_name} onChange={(e) => setFormData({...formData, year_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="e.g. 2026-2027" />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="rounded text-[#1434A4] focus:ring-[#1434A4]" />
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Set as Active (Available for sections)</label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_current" checked={formData.is_current} onChange={(e) => setFormData({...formData, is_current: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500" />
                <label htmlFor="is_current" className="text-sm font-bold text-slate-700">Set as Current School Year (For Dashboard/Conforme)</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="bg-[#1434A4] text-white px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AcademicYearsTab;
