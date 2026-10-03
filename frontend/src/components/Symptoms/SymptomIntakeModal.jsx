import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { X, PlusCircle, UserCheck, MapPin } from 'lucide-react';

export default function SymptomIntakeModal() {
  const { isIntakeModalOpen, setIsIntakeModalOpen, waterSources, showToast, loadInitialData } = useApp();

  const [reporterType, setReporterType] = useState('clinic_staff');
  const [patientId, setPatientId] = useState(`KMP-INTAKE-${Math.floor(100 + Math.random() * 900)}`);
  const [ageGroup, setAgeGroup] = useState('adult_18_59');
  const [gender, setGender] = useState('female');
  const [selectedSymptoms, setSelectedSymptoms] = useState(['watery_diarrhea', 'vomiting']);
  const [suspectedDisease, setSuspectedDisease] = useState('acute_gastroenteritis');
  const [severity, setSeverity] = useState('severe');
  const [selectedSourceId, setSelectedSourceId] = useState(waterSources[0]?.id || '');
  const [notes, setNotes] = useState('Patient presented with acute watery diarrhea and vomiting within 6 hours of consuming tap water.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isIntakeModalOpen) return null;

  const symptomOptions = [
    { id: 'watery_diarrhea', label: 'Watery Diarrhea ("Rice-water")' },
    { id: 'vomiting', label: 'Severe Vomiting' },
    { id: 'severe_dehydration', label: 'Severe Dehydration / Dry Mucosa' },
    { id: 'abdominal_cramps', label: 'Acute Abdominal Cramps' },
    { id: 'fever', label: 'High Fever / Chills' },
    { id: 'jaundice', label: 'Jaundice / Yellow Sclera' }
  ];

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const source = waterSources.find((w) => w.id === selectedSourceId) || waterSources[0];
      const latJitter = (Math.random() - 0.5) * 0.006;
      const lonJitter = (Math.random() - 0.5) * 0.006;

      const payload = {
        reporter_type: reporterType,
        patient_identifier: patientId,
        patient_age_group: ageGroup,
        patient_gender: gender,
        symptoms: selectedSymptoms,
        suspected_disease: suspectedDisease,
        severity,
        latitude: (source?.latitude || 26.1580) + latJitter,
        longitude: (source?.longitude || 91.7820) + lonJitter,
        notes
      };

      const res = await api.createSymptom(payload);
      if (res.success) {
        showToast(`Patient symptom log ${patientId} registered into surveillance grid!`, 'info');
        setIsIntakeModalOpen(false);
        loadInitialData();
      }
    } catch (err) {
      showToast('Failed to record clinic symptom log', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Community & Clinic Patient Intake</h3>
              <p className="text-xs text-sky-100">Log water-borne illness symptoms for spatial epidemiological clustering</p>
            </div>
          </div>
          <button
            onClick={() => setIsIntakeModalOpen(false)}
            className="text-sky-100 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Patient / Case ID</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Age Bracket</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold"
              >
                <option value="infant_0_5">Infant (0-5 yrs)</option>
                <option value="child_6_17">Child (6-17 yrs)</option>
                <option value="adult_18_59">Adult (18-59 yrs)</option>
                <option value="senior_60_plus">Senior (60+ yrs)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Suspected Pathogen / Condition</label>
              <select
                value={suspectedDisease}
                onChange={(e) => setSuspectedDisease(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold"
              >
                <option value="acute_gastroenteritis">Acute Gastroenteritis</option>
                <option value="cholera">Vibrio Cholerae</option>
                <option value="typhoid">Typhoid Fever</option>
                <option value="dysentery">Bacterial Dysentery</option>
                <option value="giardiasis">Giardiasis</option>
                <option value="hepatitis_a">Hepatitis A/E</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Clinical Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold"
              >
                <option value="critical">Critical (Severe Dehydration / Inpatient)</option>
                <option value="severe">Severe</option>
                <option value="moderate">Moderate</option>
                <option value="mild">Mild (Outpatient)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Associated Water Station / Supply Zone</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-semibold"
            >
              {waterSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} &bull; {s.type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-2">Observed Clinical Symptoms</label>
            <div className="grid grid-cols-2 gap-2">
              {symptomOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleSymptom(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-left font-bold transition-all ${
                    selectedSymptoms.includes(opt.id)
                      ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedSymptoms.includes(opt.id) ? '✓ ' : '+ '}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Clinical Notes & Epidemiological History</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-medium"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsIntakeModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Logging...' : 'Submit Patient Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
