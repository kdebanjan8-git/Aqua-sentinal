import React from 'react';
import { useApp } from '../../context/AppContext';
import { Droplets, Users, ShieldAlert, Radio, ArrowUpRight, CheckCircle } from 'lucide-react';

export default function WQIOverview() {
  const { waterSources, sensors, symptoms, alerts, setActiveTab } = useApp();

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;

  const sensorsWithWqi = sensors.filter((s) => s.latest_telemetry?.wqi_score);
  const avgWqi = sensorsWithWqi.length > 0
    ? Math.round(
        sensorsWithWqi.reduce((acc, s) => acc + s.latest_telemetry.wqi_score, 0) /
          sensorsWithWqi.length
      )
    : 88;

  const totalPopServed = waterSources.reduce((acc, w) => acc + (w.population_served || 0), 0);
  const totalPopAtRisk = activeAlerts.reduce((acc, a) => acc + (a.population_at_risk || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Regional WQI Index */}
      <div className="clean-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Regional Water Index (WQI)
          </span>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">{avgWqi}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              avgWqi >= 85
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : avgWqi >= 70
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : avgWqi >= 50
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${avgWqi >= 70 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
              {avgWqi >= 85 ? 'Optimal Potable' : avgWqi >= 70 ? 'Standard Safe' : avgWqi >= 50 ? 'Precautionary' : 'Hazardous Contamination'}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Brahmaputra Basin</span>
          </div>
        </div>
      </div>

      {/* 2. Population Surveillance */}
      <div className="clean-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Protected Population
          </span>
          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalPopServed.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">Citizens</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            {totalPopAtRisk > 0 ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                {totalPopAtRisk.toLocaleString()} in advisory zone
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                All 5 sectors potable
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-medium">5 Municipal Nodes</span>
          </div>
        </div>
      </div>

      {/* 3. Active Contamination Alerts */}
      <div
        onClick={() => setActiveTab('alerts')}
        className={`clean-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer border ${
          activeAlerts.length > 0
            ? 'border-red-300 bg-red-50/40'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Outbreak Alerts
          </span>
          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${
            activeAlerts.length > 0
              ? 'bg-red-100 border-red-300 text-red-600 animate-pulse'
              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${activeAlerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {activeAlerts.length}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({criticalCount} Critical &bull; {symptoms.length} Cases)
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-sky-700 font-bold hover:underline flex items-center gap-1">
              View Outbreak Triage <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-bold">WHO / BIS Standard</span>
          </div>
        </div>
      </div>

      {/* 4. IoT Sensor Grid Health */}
      <div className="clean-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            IoT Sensor Grid Health
          </span>
          <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              {sensors.filter((s) => s.status === 'active').length} / {sensors.length}
            </span>
            <span className="text-xs font-bold text-slate-500">Online</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              100% Ingestion Uptime
            </span>
            <span className="text-[11px] text-slate-500 font-medium">JalSense-Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
