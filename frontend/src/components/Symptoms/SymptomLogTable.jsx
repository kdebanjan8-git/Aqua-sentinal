import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, Search, Clock, Plus } from 'lucide-react';

export default function SymptomLogTable() {
  const { symptoms, setIsIntakeModalOpen } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('all');

  const filtered = symptoms.filter((s) => {
    const matchesSearch =
      (s.patient_identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.symptoms.some((sym) => sym.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDisease =
      diseaseFilter === 'all' || s.suspected_disease === diseaseFilter;

    return matchesSearch && matchesDisease;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'severe':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'moderate':
        return 'bg-yellow-50 text-yellow-800 border-yellow-300';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-300';
    }
  };

  return (
    <div className="clean-card rounded-3xl p-6 shadow-md bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Northeast Regional Clinical Symptom Surveillance Logs
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Geotagged patient intake cases for spatial-temporal outbreak correlation ({symptoms.length} records)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsIntakeModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log Clinic Intake
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by case ID, symptom, or clinical notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold placeholder:text-slate-400"
          />
        </div>

        <select
          value={diseaseFilter}
          onChange={(e) => setDiseaseFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="all">All Suspected Conditions</option>
          <option value="acute_gastroenteritis">Acute Gastroenteritis</option>
          <option value="cholera">Vibrio Cholerae</option>
          <option value="typhoid">Typhoid Fever</option>
          <option value="dysentery">Bacterial Dysentery</option>
          <option value="giardiasis">Giardiasis</option>
        </select>
      </div>

      {/* Surveillance Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200 tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Case / ID</th>
              <th className="py-3.5 px-4">Suspected Condition</th>
              <th className="py-3.5 px-4">Clinical Symptoms</th>
              <th className="py-3.5 px-4">Severity</th>
              <th className="py-3.5 px-4">Demographics</th>
              <th className="py-3.5 px-4">Reported Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                  {item.patient_identifier || item.id.slice(0, 8)}
                </td>
                <td className="py-3.5 px-4 font-bold text-red-700 capitalize">
                  {item.suspected_disease?.replace(/_/g, ' ')}
                </td>
                <td className="py-3.5 px-4 text-slate-700">
                  <div className="flex flex-wrap gap-1.5">
                    {item.symptoms.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-semibold">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getSeverityBadge(item.severity)}`}>
                    {item.severity}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600 capitalize font-semibold">
                  {item.patient_age_group?.replace(/_/g, ' ')} &bull; {item.patient_gender}
                </td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5 font-mono font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(item.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
