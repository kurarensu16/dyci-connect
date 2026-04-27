import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCircleNotch } from 'react-icons/fa';

interface Department {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
}

const DepartmentsTab: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', short_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (dept?: Department) => {
    if (dept) {
      setEditingId(dept.id);
      setFormData({ name: dept.name, short_name: dept.short_name || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', short_name: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Duplicate check
    const others = departments.filter(d => d.id !== editingId);
    if (others.some(d => d.name.toLowerCase() === formData.name.toLowerCase())) {
      return toast.error(`Department "${formData.name}" already exists`);
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('departments').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { error } = await supabase.from('departments').insert([formData]);
        if (error) throw error;
        toast.success('Department created');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will fail if programs are linked to this department.')) return;
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || 'Deletion failed (Check dependencies)');
    }
  };

  return (
    <>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{departments.length} Department{departments.length !== 1 ? 's' : ''} Registered</p>
        <button onClick={() => openModal()} className="bg-white hover:bg-slate-100 text-dyci-blue text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-sm active:scale-95 flex items-center uppercase tracking-widest border border-slate-200">
          <FaPlus className="mr-2 text-[8px]" /> Add Department
        </button>
      </div>

      {/* Table */}
      <section className="legacy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Abbreviation</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <FaCircleNotch className="animate-spin text-2xl text-dyci-blue mx-auto mb-3" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading departments...</p>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <p className="text-sm font-medium text-gray-500">No departments found.</p>
                  </td>
                </tr>
              ) : departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{dept.name}</td>
                  <td className="px-6 py-4">
                    {dept.short_name ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded border text-blue-600 border-blue-100 bg-blue-50">{dept.short_name}</span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(dept)} className="text-slate-400 hover:text-dyci-blue transition-colors p-1.5" title="Edit"><FaEdit className="text-xs" /></button>
                    <button onClick={() => handleDelete(dept.id)} className="text-slate-400 hover:text-dyci-red transition-colors p-1.5 ml-1" title="Delete"><FaTrash className="text-xs" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Department' : 'Add New Department'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Name</label>
                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm"
                  placeholder="e.g. College of Information and Communications Technology" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Abbreviation (Optional)</label>
                <input value={formData.short_name} onChange={(e) => setFormData({...formData, short_name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dyci-blue/5 focus:border-dyci-blue transition-all shadow-sm"
                  placeholder="e.g. CICT" />
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
export default DepartmentsTab;
