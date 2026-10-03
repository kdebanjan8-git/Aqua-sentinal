import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  ClipboardList,
  UserCheck,
  MapPin,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Droplets,
  HeartPulse,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  Sparkles,
  Info
} from 'lucide-react';

const VILLAGE_WARDS = [
  'Ward 7 (Pandu Ghat Intake)',
  'Ward 14 (Dispur Capital Tap Grid)',
  'Aizawl North Zone Cluster',
  'Silchar Town Secondary Ward',
  'Dibrugarh Riverside Ward #3',
  'Guwahati Municipal Sector 2'
];

const SYMPTOM_OPTIONS = [
  { id: 'watery_diarrhea', label: 'Watery Diarrhea ("Rice-water")', severity: 'high' },
  { id: 'vomiting', label: 'Severe Vomiting', severity: 'high' },
  { id: 'severe_dehydration', label: 'Severe Dehydration / Dry Mucosa', severity: 'critical' },
  { id: 'abdominal_cramps', label: 'Acute Abdominal Cramps', severity: 'medium' },
  { id: 'fever', label: 'High Fever / Chills', severity: 'medium' },
  { id: 'jaundice', label: 'Jaundice / Yellow Sclera', severity: 'high' }
];

const VULNERABLE_FLAGS = [
  { id: 'children_under_5', label: 'Children Under 5' },
  { id: 'elderly_60_plus', label: 'Elderly (60+)' },
  { id: 'pregnant_nursing', label: 'Pregnant / Nursing' },
  { id: 'chronic_condition', label: 'Pre-existing Condition' }
];

export default function AshaFieldDesk() {
  const { waterSources, showToast, loadInitialData } = useApp();
  const { currentUser } = useAuth();

  // Form State
  const [householdHead, setHouseholdHead] = useState('');
  const [villageWard, setVillageWard] = useState(VILLAGE_WARDS[0]);
  const [affectedCount, setAffectedCount] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState(['watery_diarrhea']);
  const [vulnerableFlags, setVulnerableFlags] = useState(['children_under_5']);
  const [suspectedSourceId, setSuspectedSourceId] = useState(waterSources[0]?.id || '');
  const [fieldIntervention, setFieldIntervention] = useState('ors_distributed');
  const [urgencyLevel, setUrgencyLevel] = useState('routine');
  const [emergencyClusterFlag, setEmergencyClusterFlag] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field Reports Logs
  const [fieldReports, setFieldReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Load ASHA's submitted field logs
  const loadMyReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await api.getAshaReports();
      if (res.success) {
        setFieldReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load ASHA field logs:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    loadMyReports();
  }, [currentUser]);

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleVulnerable = (id) => {
    setVulnerableFlags((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, v]
    );
  };

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!householdHead.trim()) {
      showToast('Please specify the Household Head or Citizen Name.', 'error');
      return;
    }
    if (selectedSymptoms.length === 0) {
      showToast('Please select at least one observed symptom.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const source = waterSources.find((w) => w.id === suspectedSourceId) || waterSources[0];

      const payload = {
        household_head_name: householdHead.trim(),
        village_ward: villageWard,
        affected_count: Number(affectedCount),
        vulnerable_age_flags: vulnerableFlags,
        symptoms: selectedSymptoms,
        suspected_disease: selectedSymptoms.includes('severe_dehydration') || selectedSymptoms.includes('watery_diarrhea')
          ? 'acute_gastroenteritis'
          : 'waterborne_infection',
        severity: emergencyClusterFlag || urgencyLevel === 'critical_emergency' ? 'critical' : urgencyLevel === 'priority' ? 'severe' : 'moderate',
        urgency_level: emergencyClusterFlag ? 'critical_emergency' : urgencyLevel,
        emergency_cluster_flag: emergencyClusterFlag,
        field_intervention: fieldIntervention,
        suspected_water_source_id: source?.id || null,
        latitude: source?.latitude || 26.1580,
        longitude: source?.longitude || 91.7820,
        notes: notes.trim()
      };

      const res = await api.submitAshaProxyReport(payload);

      if (res.success) {
        showToast(
          emergencyClusterFlag
            ? '🚨 Emergency Outbreak Cluster Flagged & Escalated to District Admin!'
            : '✅ Household surveillance report logged and synced to regional grid.',
          emergencyClusterFlag ? 'warning' : 'success'
        );

        // Reset form
        setHouseholdHead('');
        setAffectedCount(1);
        setSelectedSymptoms(['watery_diarrhea']);
        setEmergencyClusterFlag(false);
        setUrgencyLevel('routine');
        setNotes('');

        // Refresh logs and global data
        loadMyReports();
        loadInitialData();
      }
    } catch (err) {
      console.error('Failed to submit ASHA intake:', err);
      showToast('Failed to submit field report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const res = await api.updateAshaReportStatus(reportId, newStatus);
      if (res.success) {
        setFieldReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
        showToast(`Case marked as ${newStatus}`, 'info');
      }
    } catch (err) {
      showToast('Failed to update case status', 'error');
    }
  };

  // Metric aggregates
  const totalPatientsReached = fieldReports.reduce((acc, r) => acc + (r.affected_count || 1), 0);
  const totalInterventions = fieldReports.filter((r) => r.field_intervention && r.field_intervention !== 'none').length;
  const activeClusterFlags = fieldReports.filter((r) => r.emergency_cluster_flag || r.urgency_level === 'critical_emergency').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Identity Strip */}
      <div className="clean-card rounded-3xl p-6 shadow-md bg-white border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 flex-shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-slate-900">
                  ASHA Field Surveillance & Proxy Registration Desk
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-extrabold uppercase">
                  Field Level Tier
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Assigned Supervisor: <strong className="text-slate-800">{currentUser?.full_name || 'Bikash Roy (ASHA)'}</strong> &bull; Region: <strong className="text-slate-800">{currentUser?.district || 'Kamrup Metro'}, {currentUser?.state || 'Assam'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
        </div>

        {/* 2. Key Operational Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Households Logged</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold font-mono text-slate-900">{fieldReports.length}</span>
              <span className="text-[10px] text-slate-400 font-bold">Units</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Citizens Reached</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold font-mono text-sky-700">{totalPatientsReached}</span>
              <span className="text-[10px] text-slate-400 font-bold">Patients</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Medical Interventions</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">{totalInterventions}</span>
              <span className="text-[10px] text-slate-400 font-bold">Dispatched</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Cluster Escalations</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl font-extrabold font-mono ${activeClusterFlags > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {activeClusterFlags}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Urgent</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Form on Left (5 cols) & Recent Logs on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Intake Form */}
        <div className="lg:col-span-5 clean-card rounded-3xl p-6 shadow-md bg-white border border-slate-200">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">New Household Intake Form</h3>
              <p className="text-[11px] text-slate-500 font-medium">Log field symptoms on behalf of rural/ward families</p>
            </div>
          </div>

          <form onSubmit={handleIntakeSubmit} className="space-y-4 text-xs">
            {/* Household Name & Village/Ward */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Household Head / Citizen Name</label>
                <input
                  type="text"
                  required
                  value={householdHead}
                  onChange={(e) => setHouseholdHead(e.target.value)}
                  placeholder="e.g. Bora Household"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Village / Municipal Ward</label>
                <select
                  value={villageWard}
                  onChange={(e) => setVillageWard(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {VILLAGE_WARDS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Affected Family Members & Vulnerable Flags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Affected Family Members</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAffectedCount(num)}
                      className={`flex-1 py-1.5 rounded-xl font-bold border transition-all ${
                        affectedCount === num
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num === 5 ? '5+' : num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Linked Water Source</label>
                <select
                  value={suspectedSourceId}
                  onChange={(e) => setSuspectedSourceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 truncate"
                >
                  {waterSources.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vulnerable Groups */}
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Vulnerable Demographics Present</label>
              <div className="flex flex-wrap gap-1.5">
                {VULNERABLE_FLAGS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVulnerable(v.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      vulnerableFlags.includes(v.id)
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms Multi-Select */}
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Observed Clinical Symptoms</label>
              <div className="grid grid-cols-2 gap-1.5">
                {SYMPTOM_OPTIONS.map((sym) => (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => toggleSymptom(sym.id)}
                    className={`p-2 rounded-xl border text-left font-bold transition-all text-[11px] ${
                      selectedSymptoms.includes(sym.id)
                        ? 'bg-red-50 text-red-700 border-red-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Intervention Delivered */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">Field Intervention Administered</label>
              <select
                value={fieldIntervention}
                onChange={(e) => setFieldIntervention(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ors_distributed">Distributed ORS Rehydration Packets</option>
                <option value="chlorine_tablets_given">Given Halazone Chlorine Disinfection Tablets</option>
                <option value="phc_referral">Referred Family to Primary Health Centre (PHC)</option>
                <option value="rapid_rehydration">Administered Rapid Field Electrolytes</option>
                <option value="none">No Medical Intervention Required (Routine Log)</option>
              </select>
            </div>

            {/* Single-Tap Emergency Cluster Flag */}
            <div
              onClick={() => setEmergencyClusterFlag(!emergencyClusterFlag)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                emergencyClusterFlag
                  ? 'bg-red-50 border-red-300 text-red-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded-xl flex items-center justify-center ${emergencyClusterFlag ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs block">Emergency Outbreak Cluster Flag</span>
                  <span className="text-[10px] opacity-80">
                    Instantly escalate to District Health Admin for immediate chlorination unit dispatch
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emergencyClusterFlag}
                onChange={(e) => setEmergencyClusterFlag(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">Field Observations / Tap Quality Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tap water cloudy after morning rain; 3 neighbors also complained of stomach pain..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-2xl text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                emergencyClusterFlag
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
              } disabled:opacity-50`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting
                ? 'Syncing Field Report...'
                : emergencyClusterFlag
                ? 'Escalate Emergency Cluster to District Admin'
                : 'Submit Household Report & Sync to Grid'}
            </button>
          </form>
        </div>

        {/* Recent Field Logs Table */}
        <div className="lg:col-span-7 clean-card rounded-3xl p-6 shadow-md bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Recent Field Surveillance Logs</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Household cases filed by your field team</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-slate-500">
                {fieldReports.length} Active Records
              </span>
            </div>

            {/* Table */}
            {fieldReports.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
                <HeartPulse className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-bold text-slate-800">No Household Reports Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Use the quick-intake form on the left to log symptoms and medical interventions for rural or ward households.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-2.5">Household / Ward</th>
                      <th className="pb-2.5">Affected</th>
                      <th className="pb-2.5">Observed Symptoms</th>
                      <th className="pb-2.5">Intervention</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fieldReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-2">
                          <span className="font-extrabold text-slate-900 block truncate max-w-[140px]">
                            {report.household_head_name}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {report.village_ward}
                          </span>
                        </td>

                        <td className="py-3 px-2 font-mono font-bold text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {report.affected_count || 1}
                          </span>
                        </td>

                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {(report.symptoms || []).slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold truncate"
                              >
                                {s.replace('_', ' ')}
                              </span>
                            ))}
                            {(report.symptoms || []).length > 2 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                +{(report.symptoms || []).length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <span className="text-[11px] font-medium text-slate-700 capitalize block truncate max-w-[120px]">
                            {report.field_intervention?.replace(/_/g, ' ') || 'None'}
                          </span>
                        </td>

                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                              report.emergency_cluster_flag || report.urgency_level === 'critical_emergency'
                                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                                : report.status === 'investigating'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : report.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {report.emergency_cluster_flag ? 'Cluster Flag' : report.status || 'Logged'}
                          </span>
                        </td>

                        <td className="py-3 pl-2 text-right">
                          {report.status !== 'resolved' ? (
                            <button
                              onClick={() => handleStatusChange(report.id, 'resolved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 transition-colors"
                              title="Mark household case as resolved"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
