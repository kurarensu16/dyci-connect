import React, { useState } from 'react';
import { FaBuilding, FaGraduationCap } from 'react-icons/fa';
import AcademicManager from '../../components/sysadmin/organization/AcademicManager';
import AdministrativeManager from '../../components/sysadmin/organization/AdministrativeManager';

const SysAdminOrganization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'academic' | 'administrative'>('academic');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Institutional Header */}
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">Organization</h1>
          <p className="unified-header-subtitle">
            Manage institutional structure, departments, and administrative offices.
          </p>
        </div>
      </header>

      <main className="unified-main animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Tab Switcher */}
        <section className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('academic')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-colors shadow-sm active:bg-slate-100 ${
              activeTab === 'academic'
                ? 'bg-dyci-blue text-white shadow-md'
                : 'bg-white border border-slate-200 text-gray-600 hover:bg-slate-50'
            }`}
          >
            <FaGraduationCap className="text-[10px]" />
            <span className="uppercase tracking-widest">Academic Entities</span>
          </button>
          <button
            onClick={() => setActiveTab('administrative')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-colors shadow-sm active:bg-slate-100 ${
              activeTab === 'administrative'
                ? 'bg-dyci-blue text-white shadow-md'
                : 'bg-white border border-slate-200 text-gray-600 hover:bg-slate-50'
            }`}
          >
            <FaBuilding className="text-[10px]" />
            <span className="uppercase tracking-widest">Administrative Entities</span>
          </button>
        </section>

        {/* Tab Content */}
        {activeTab === 'academic' ? <AcademicManager /> : <AdministrativeManager />}
      </main>
    </div>
  );
};

export default SysAdminOrganization;
