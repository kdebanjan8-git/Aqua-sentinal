import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Clock,
  Send,
  Radio,
  MapPin,
  ExternalLink,
  Users,
  Info,
  Navigation,
  Lock
} from 'lucide-react';

export default function AlertPanel() {
  const { alerts, showToast, setIsAdvisoryModalOpen, loadInitialData, setSelectedSensorId, setActiveTab } = useApp();
  const { currentUser, isDistrictAdmin, isHealthWorker, isCitizen } = useAuth();
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'active') return a.status === 'active';
    if (filter === 'investigating') return a.status === 'investigating';
    if (filter === 'resolved') return a.status === 'resolved';
    return true;
  });

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      const res = await api.updateAlertStatus(alertId, newStatus);
      if (res.success) {
        showToast(`Incident marked as ${newStatus}`, 'info');
        loadInitialData();
      }
    } catch (err) {
      showToast('Failed to update incident status', 'error');
    }
  };

  const handleDispatchIntervention = async (alertId) => {
    try {
      const res = await api.createIntervention({
        alert_id: alertId,
        action_type: 'superchlorination_dose',
        assigned_team: 'Regional Public Health Water Rapid Response Unit 1',
        notes: 'Emergency superchlorination and secondary pipeline flush dispatched.'
      });
      if (res.success) {
        showToast('Superchlorination unit dispatched to field', 'info');
        await api.updateAlertStatus(alertId, 'investigating');
        loadInitialData();
      }
    } catch (err) {
      showToast('Failed to dispatch intervention', 'error');
    }
  };

  const handleLocateStation = (sensorId) => {
    if (sensorId) {
      setSelectedSensorId(sensorId);
    }
    setActiveTab('dashboard');
  };

  return (
    <div className="clean-card rounded-3xl p-6 shadow-xl bg-slate-900/95 border border-slate-800 flex flex-col justify-between text-slate-100">
      {/* Header & Filter Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">
                  Deterministic Contamination & Outbreak Alerts
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Standardized WHO / BIS Water Quality Safety Limits & Community Cluster Rules
                </p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs">
            {['all', 'active', 'investigating', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  filter === f
                    ? 'bg-teal-600 text-white border border-teal-500 shadow-md'
                    : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {f} ({alerts.filter((a) => (f === 'all' ? true : a.status === f)).length})
              </button>
            ))}
          </div>
        </div>

        {/* Standardized Thresholds Reference Bar */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>Standardized Evaluation Limits (WHO / BIS):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono font-medium">Turbidity &gt; 5.0 NTU</span>
            <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono font-medium">pH &lt; 6.5 or &gt; 8.5</span>
            <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono font-medium">TDS &gt; 500 ppm</span>
            <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono font-medium">Cluster &gt; 5 Cases (2 km)</span>
          </div>
        </div>

        {/* Alert Cards Feed */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-300">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-90" />
            <h4 className="text-sm font-bold text-slate-100">Nominal Baseline State (0 Active Alerts)</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All regional monitoring stations are operating within safe WHO / BIS permissible limits. Alerts will appear here when safety thresholds are breached.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isResolved = alert.status === 'resolved';

              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-xl border transition-all shadow-xl ${
                    isResolved
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                      : isCritical
                      ? 'bg-slate-900/95 border-rose-900/60 hover:border-rose-500/40'
                      : 'bg-slate-900/95 border-amber-900/60 hover:border-amber-500/40'
                  }`}
                >
                  {/* Alert Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                          isCritical
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {alert.severity} Risk
                      </span>
                      <span className="font-mono text-xs text-slate-300 font-extrabold">
                        {alert.alert_code}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">• {alert.source_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => handleLocateStation(alert.sensor_id)}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5 text-white" />
                        Locate on Map
                      </button>
                      <button
                        onClick={() => handleLocateStation(alert.sensor_id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                      >
                        <Radio className="w-3.5 h-3.5 text-sky-400" />
                        Investigate Stats
                      </button>
                      <span className="text-slate-400 font-mono text-[11px] ml-1">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Concise Plain-English Trigger Explanation */}
                  <div className="mb-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Plain-English Trigger Reason:
                    </span>
                    <h4 className="text-rose-400 font-medium text-sm leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>
                        {alert.trigger_explanation ||
                          `${alert.source_name}: Threshold parameter breach detected (${alert.hazard_type?.replace(/_/g, ' ')})`}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium mt-1.5">
                      <strong className="text-slate-100 font-bold">Recommended Protocol: </strong>
                      {alert.recommended_action}
                    </p>
                  </div>

                  {/* Telemetry Snapshot & Spatial Correlation */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] bg-slate-950/90 p-3 rounded-xl border border-slate-800 mb-3">
                    <div>
                      <span className="text-slate-400 text-xs uppercase tracking-wide font-medium block mb-0.5">Population in Risk Zone</span>
                      <span className="font-bold text-sm text-slate-100">
                        {alert.population_at_risk?.toLocaleString()} citizens
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs uppercase tracking-wide font-medium block mb-0.5">Localized Cases</span>
                      <span className={`font-bold text-sm ${alert.symptom_correlation_count > 5 ? 'text-rose-400' : 'text-slate-100'}`}>
                        {alert.symptom_correlation_count} cases {alert.symptom_correlation_count > 5 ? '(>5 limit)' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs uppercase tracking-wide font-medium block mb-0.5">Geofence Radius</span>
                      <span className="font-bold text-sm text-slate-100">
                        {alert.radius_km || 2.0} km
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs uppercase tracking-wide font-medium block mb-0.5">Recorded WQI</span>
                      <span className="text-amber-300 font-bold text-sm font-mono">
                        {alert.trigger_telemetry_snapshot?.wqi ?? 'N/A'} / 100
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons with RBAC Permissions */}
                  {!isResolved && (
                    <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800">
                      {isDistrictAdmin ? (
                        <>
                          <button
                            onClick={() => handleDispatchIntervention(alert.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Chlorination Unit
                          </button>
                          <button
                            onClick={() => setIsAdvisoryModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            Broadcast Boil Notice
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
                          >
                            Mark Investigating
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all ml-auto flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                            Resolve Incident
                          </button>
                        </>
                      ) : isHealthWorker ? (
                        <>
                          <button
                            onClick={() => handleDispatchIntervention(alert.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Chlorination Unit
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
                          >
                            Mark Investigating
                          </button>
                          <button
                            onClick={() => setIsAdvisoryModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-500 border border-slate-700 text-xs font-bold ml-auto flex items-center gap-1.5 cursor-not-allowed"
                            title="Authorized for District Health Admins Only"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Boil Notice</span>
                            <span className="text-[9px] text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30">
                              Admin Only
                            </span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold shadow-sm" title="Authorized for District Health Admins Only">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            Authorized for District Health Admins Only
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">
                            Citizen Verified View
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
