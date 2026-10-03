import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Flame, Droplets, Zap, Users, RotateCcw, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function SimulatorPanel() {
  const { sensors, showToast, loadInitialData, setActiveTab } = useApp();
  const [selectedSensorId, setSelectedSensorId] = useState(sensors[0]?.id || '');
  const [isInjecting, setIsInjecting] = useState(false);

  const handleBacterialSpike = async () => {
    setIsInjecting(true);
    try {
      const res = await api.triggerSpike(selectedSensorId);
      if (res.success) {
        showToast('🚨 Turbidity Spike Injected (7.85 NTU > 5.0 NTU limit)! Alert generated.', 'critical');
        loadInitialData();
        setActiveTab('alerts');
      }
    } catch (err) {
      showToast('Failed to inject bacterial spike', 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleChemicalShock = async () => {
    setIsInjecting(true);
    try {
      const res = await api.triggerChemicalShock(selectedSensorId);
      if (res.success) {
        showToast('⚠️ Chemical Shock Injected (pH: 5.40 < 6.5, TDS: 820 ppm > 500 ppm)!', 'warning');
        loadInitialData();
        setActiveTab('alerts');
      }
    } catch (err) {
      showToast('Failed to inject chemical shock', 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleOutbreakWave = async () => {
    setIsInjecting(true);
    try {
      const res = await api.triggerOutbreakWave();
      if (res.success) {
        showToast('🚨 Outbreak Wave Injected (6 Diarrhea cases > 5 case cluster threshold in 2 km)!', 'critical');
        loadInitialData();
        setActiveTab('alerts');
      }
    } catch (err) {
      showToast('Failed to inject outbreak wave', 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleReset = async () => {
    setIsInjecting(true);
    try {
      const res = await api.resetSimulation();
      if (res.success) {
        showToast('Dashboard restored to clean nominal state (0 alerts, all nodes safe).', 'info');
        loadInitialData();
      }
    } catch (err) {
      showToast('Failed to reset simulation', 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="clean-card rounded-3xl p-6 shadow-md bg-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">
            Deterministic Anomaly & Outbreak Scenario Lab
          </h3>
          <p className="text-xs text-slate-500 font-semibold">
            Trigger explicit WHO / BIS threshold breaches to demonstrate real-time transparent alert generation during evaluation.
          </p>
        </div>
      </div>

      {/* Standardized Threshold Reference Box */}
      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Evaluation Rules & Deterministic Thresholds:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <strong className="text-slate-800">1. Turbidity Alert:</strong> Turbidity &gt; 5.0 NTU (WHO/BIS upper allowable limit for disinfection).
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <strong className="text-slate-800">2. pH Out-of-Range:</strong> pH &lt; 6.5 or &gt; 8.5 (Acidic/alkaline pipe corrosion or chemical shock).
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <strong className="text-slate-800">3. TDS Spike:</strong> TDS &gt; 500.0 ppm (BIS acceptable dissolved solids limit).
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <strong className="text-slate-800">4. Community Cluster:</strong> &gt; 5 gastrointestinal symptom reports within 2.0 km radius.
          </div>
        </div>
      </div>

      {/* Target Sensor Selection */}
      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Select Target IoT Sensor Node:
        </label>
        <select
          value={selectedSensorId}
          onChange={(e) => setSelectedSensorId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-amber-500/40"
        >
          {sensors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.node_uid} &bull; {s.source_name} (Lat: {s.latitude.toFixed(4)}, Lon: {s.longitude.toFixed(4)})
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Scenario 1: Microbial Surge (Turbidity > 5.0 NTU) */}
        <div className="bg-red-50/70 p-5 rounded-2xl border border-red-200 flex flex-col justify-between hover:border-red-300 transition-all shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <Droplets className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-slate-900">Turbidity Spike</h4>
            </div>
            <div className="mb-3 text-[11px] font-bold text-red-700 bg-red-100/70 px-2.5 py-1 rounded-lg border border-red-200 inline-block">
              Breaches: Turbidity &gt; 5.0 NTU
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              Injects Turbidity = <strong className="text-red-700 font-bold">7.85 NTU</strong> (Limit: 5.0 NTU) with ORP = 410 mV, triggering an immediate microbial risk alert.
            </p>
          </div>
          <button
            onClick={handleBacterialSpike}
            disabled={isInjecting}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Inject Turbidity Spike
          </button>
        </div>

        {/* Scenario 2: Chemical / pH Shock (pH < 6.5 & TDS > 500) */}
        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 flex flex-col justify-between hover:border-amber-300 transition-all shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-slate-900">pH / TDS Chemical Shock</h4>
            </div>
            <div className="mb-3 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
              Breaches: pH &lt; 6.5 & TDS &gt; 500 ppm
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              Injects pH = <strong className="text-amber-700 font-bold">5.40</strong> (&lt; 6.5 limit) and TDS = <strong className="text-amber-700 font-bold">820 ppm</strong> (&gt; 500 limit).
            </p>
          </div>
          <button
            onClick={handleChemicalShock}
            disabled={isInjecting}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Inject Chemical Shock
          </button>
        </div>

        {/* Scenario 3: Community Outbreak Wave (> 5 cases in 2km) */}
        <div className="bg-sky-50/70 p-5 rounded-2xl border border-sky-200 flex flex-col justify-between hover:border-sky-300 transition-all shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 text-sky-600">
              <Users className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-slate-900">Community Outbreak Wave</h4>
            </div>
            <div className="mb-3 text-[11px] font-bold text-sky-800 bg-sky-100/70 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
              Breaches: &gt; 5 Cases within 2 km
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              Injects <strong className="text-sky-800 font-bold">6 clinical diarrhea cases</strong> clustered within 1.5 km of the station, triggering a cluster alert.
            </p>
          </div>
          <button
            onClick={handleOutbreakWave}
            disabled={isInjecting}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Trigger 6-Case Wave
          </button>
        </div>
      </div>

      {/* Clean Baseline Reset */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-slate-500 font-semibold">
          Reset all stations to clean nominal state (0 alerts, all parameters safe):
        </span>
        <button
          onClick={handleReset}
          disabled={isInjecting}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 border border-slate-200 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
          Reset to Clean Nominal Baseline
        </button>
      </div>
    </div>
  );
}
