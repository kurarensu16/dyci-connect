import React, { useState } from 'react';
import DepartmentsTab from './academic/DepartmentsTab';
import ProgramsTab from './academic/ProgramsTab';
import YearLevelsTab from './academic/YearLevelsTab';
import SectionsTab from './academic/SectionsTab';

const AcademicManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'programs' | 'years' | 'sections'>('departments');

  const tabs = [
    { id: 'departments', label: 'Departments' },
    { id: 'programs', label: 'Programs' },
    { id: 'years', label: 'Year Levels' },
    { id: 'sections', label: 'Sections' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center space-x-1 text-xs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl font-bold transition-colors uppercase tracking-widest ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'programs' && <ProgramsTab />}
      {activeTab === 'years' && <YearLevelsTab />}
      {activeTab === 'sections' && <SectionsTab />}
    </div>
  );
};

export default AcademicManager;
