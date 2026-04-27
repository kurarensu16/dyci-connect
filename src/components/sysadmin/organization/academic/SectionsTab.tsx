import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCircleNotch } from 'react-icons/fa';

interface Section { id: string; label: string; sort_order: number; }

const SectionsTab: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ label: '', sort_order: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('sections').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (sec?: Section) => {
    if (sec) {
      setEditingId(sec.id);
      setFormData({ label: sec.label, sort_order: sec.sort_order });
    } else {
      setEditingId(null);
      const nextOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 1;
      setFormData({ label: '', sort_order: nextOrder });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) return toast.error('Please enter a label');
    // Duplicate checks
    const otherSections = sections.filter(s => s.id !== editingId);
    if (otherSections.some(s => s.label === formData.label)) {
      return toast.error(`Section "${formData.label}" already exists`);
    }
    if (otherSections.some(s => s.sort_order === formData.sort_order)) {
      return toast.error(`Sort order ${formData.sort_order} is already taken`);
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('sections').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Section updated');
      } else {
        const { error } = await supabase.from('sections').insert([formData]);
        if (error) throw error;
        toast.success('Section created');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this section? This will fail if students are assigned to it.')) return;
    try {
      const { error } = await supabase.from('sections').delete().eq('id', id);
      if (error) throw error;
      toast.success('Section deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Deletion failed');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sections.length} Section{sections.length !== 1 ? 's' : ''} Registered</p>
        <button onClick={() => openModal()} className="bg-white hover:bg-slate-100 text-dyci-blue text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-sm active:scale-95 flex items-center uppercase tracking-widest border border-slate-200">
          <FaPlus className="mr-2 text-[8px]" /> Add Section
        </button>
      </div>

      <section className="legacy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24">Order</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Section Label</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-20 text-center"><FaCircleNotch className="animate-spin text-2xl text-dyci-blue mx-auto mb-3" /><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading sections...</p></td></tr>
              ) : sections.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-20 text-center"><p className="text-sm font-medium text-gray-500">No sections found.</p></td></tr>
              ) : sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-400">{sec.sort_order}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{sec.label}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(sec)} className="text-slate-400 hover:text-dyci-blue transition-colors p-1.5"><FaEdit className="text-xs" /></button>
                    <button onClick={() => handleDelete(sec.id)} className="text-slate-400 hover:text-dyci-red transition-colors p-1.5 ml-1"><FaTrash className="text-xs" /></button>
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
              <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Section' : 'Add New Section'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Section Label</label>
                <input required value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value.toUpperCase()})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm"
                  placeholder="e.g. G" />
                <p className="text-[10px] text-gray-400 mt-1">Single uppercase letter (A–Z).</p>
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
export default SectionsTab;
