import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { Skeleton } from '../../../ui/Skeleton';

interface YearLevel { id: number; label: string; sort_order: number; }

const YearLevelsTab: React.FC = () => {
  const [yearLevels, setYearLevels] = useState<YearLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ label: '', sort_order: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchYearLevels(); }, []);

  const fetchYearLevels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('year_levels').select('*').order('sort_order', { ascending: true });
      setYearLevels(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load year level configuration.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (year?: YearLevel) => {
    if (year) {
      setEditingId(year.id);
      setFormData({ label: year.label, sort_order: year.sort_order });
    } else {
      setEditingId(null);
      const nextOrder = yearLevels.length > 0 ? Math.max(...yearLevels.map(y => y.sort_order)) + 1 : 1;
      setFormData({ label: '', sort_order: nextOrder });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Duplicate checks
    const others = yearLevels.filter(y => y.id !== editingId);
    if (others.some(y => y.label.toLowerCase() === formData.label.toLowerCase())) {
      return toast.error(`Year level "${formData.label}" already exists`);
    }
    if (others.some(y => y.sort_order === formData.sort_order)) {
      return toast.error(`Sort order ${formData.sort_order} is already taken`);
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('year_levels').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Year level updated');
      } else {
        const { error } = await supabase.from('year_levels').insert([formData]);
        if (error) throw error;
        toast.success('Year level created');
      }
      setShowModal(false);
      fetchYearLevels();
    } catch (error: any) {
      toast.error('Failed to save year level. Please verify your entries.')
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this year level? This will fail if it has dependencies.')) return;
    try {
      const { error } = await supabase.from('year_levels').delete().eq('id', id);
      if (error) throw error;
      toast.success('Year level deleted');
      fetchYearLevels();
    } catch (error: any) {
      toast.error('Deletion failed. Ensure no sections or students are assigned to this year level.')
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{yearLevels.length} Year Level{yearLevels.length !== 1 ? 's' : ''} Registered</p>
        <button onClick={() => openModal()} className="bg-white hover:bg-slate-100 text-dyci-blue text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-sm active:scale-95 flex items-center uppercase tracking-widest border border-slate-200">
          <FaPlus className="mr-2 text-[8px]" /> Add Year Level
        </button>
      </div>

      <section className="legacy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24">Order</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Label</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton variant="text" width="20%" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" width="60%" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton variant="text" width={40} className="ml-auto" /></td>
                  </tr>
                ))
              ) : yearLevels.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-20 text-center"><p className="text-sm font-medium text-gray-500">No year levels found.</p></td></tr>
              ) : yearLevels.map((year) => (
                <tr key={year.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-400">{year.sort_order}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{year.label}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(year)} className="text-slate-400 hover:text-dyci-blue transition-colors p-1.5"><FaEdit className="text-xs" /></button>
                    <button onClick={() => handleDelete(year.id)} className="text-slate-400 hover:text-dyci-red transition-colors p-1.5 ml-1"><FaTrash className="text-xs" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Year Level' : 'Add New Year Level'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Label</label>
                <input required value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm"
                  placeholder="e.g. 1st Year" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sort Order</label>
                <input type="number" required value={formData.sort_order} onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={saving} className="bg-dyci-blue hover:bg-dyci-blue/90 text-white px-5 py-2 rounded-full text-xs font-bold shadow-sm disabled:opacity-50 transition-all uppercase tracking-widest active:scale-95">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
export default YearLevelsTab;
