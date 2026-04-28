import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { Skeleton } from '../../../ui/Skeleton';

interface Program {
  id: string;
  department_id: string;
  name: string;
  level: string;
  department?: { name: string; short_name: string; };
}

interface Department { id: string; name: string; }

const ProgramsTab: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ department_id: '', name: '', level: 'undergrad' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progRes, deptRes] = await Promise.all([
        supabase.from('programs').select('*, department:departments(name, short_name)').order('name'),
        supabase.from('departments').select('id, name').order('name')
      ]);
      setPrograms(progRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load academic program registry.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (prog?: Program) => {
    if (prog) {
      setEditingId(prog.id);
      setFormData({ department_id: prog.department_id, name: prog.name, level: prog.level || 'undergrad' });
    } else {
      setEditingId(null);
      setFormData({ department_id: departments[0]?.id || '', name: '', level: 'undergrad' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_id) return toast.error('Please select a department');
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('programs').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Program updated');
      } else {
        const { error } = await supabase.from('programs').insert([formData]);
        if (error) throw error;
        toast.success('Program created');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to save program configuration. Please verify your entries.')
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this program? This fails if it has dependencies.')) return;
    try {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Program deleted');
      fetchData();
    } catch (error: any) {
      toast.error('Deletion failed. Ensure no students or sections are linked to this program.')
    }
  };

  const levelLabel = (level: string) => {
    switch (level) {
      case 'undergrad': return { text: 'Undergrad', color: 'text-blue-600 border-blue-100 bg-blue-50' };
      case 'graduate': return { text: 'Graduate', color: 'text-purple-600 border-purple-100 bg-purple-50' };
      case 'associate': return { text: 'Associate', color: 'text-emerald-600 border-emerald-100 bg-emerald-50' };
      default: return { text: level, color: 'text-gray-500 border-gray-100 bg-gray-50' };
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{programs.length} Program{programs.length !== 1 ? 's' : ''} Registered</p>
        <button onClick={() => openModal()} className="bg-white hover:bg-slate-100 text-dyci-blue text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-sm active:scale-95 flex items-center uppercase tracking-widest border border-slate-200">
          <FaPlus className="mr-2 text-[8px]" /> Add Program
        </button>
      </div>

      <section className="legacy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Program Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Level</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton variant="text" width="80%" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" width="30%" /></td>
                    <td className="px-6 py-4"><Skeleton height={20} width={60} className="rounded-md" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton variant="text" width={40} className="ml-auto" /></td>
                  </tr>
                ))
              ) : programs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20 text-center"><p className="text-sm font-medium text-gray-500">No programs found.</p></td></tr>
              ) : programs.map((prog) => {
                const lvl = levelLabel(prog.level);
                return (
                  <tr key={prog.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{prog.name}</td>
                    <td className="px-6 py-4 text-[11px] text-gray-500">{prog.department?.short_name || prog.department?.name || '—'}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${lvl.color}`}>{lvl.text}</span></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(prog)} className="text-slate-400 hover:text-dyci-blue transition-colors p-1.5"><FaEdit className="text-xs" /></button>
                      <button onClick={() => handleDelete(prog.id)} className="text-slate-400 hover:text-dyci-red transition-colors p-1.5 ml-1"><FaTrash className="text-xs" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Program' : 'Add New Program'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Department</label>
                <select required value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Program Name</label>
                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm"
                  placeholder="e.g. Bachelor of Science in Information Technology" />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Level</label>
                  <select required value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm">
                    <option value="undergrad">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                    <option value="associate">Associate</option>
                  </select>
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
export default ProgramsTab;
