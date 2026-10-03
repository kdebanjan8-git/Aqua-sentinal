import React from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, Battery, Wifi, AlertTriangle, CheckCircle, Droplets, ArrowRight } from 'lucide-react';

export default function SensorListPanel() {
  const { sensors, selectedSensorId, setSelectedSensorId, setActiveTab } = useApp();

  return (
    <div className="clean-card rounded-3xl p-6 shadow-md bg-white">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Northeast Regional Water Quality Sensor Grid
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Continuous IoT telemetry ingestion across the Brahmaputra Basin & Municipal Stations
            </p>
          </div>
        </div>

        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
          {sensors.length} Active Nodes (100% Ingestion Uptime)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map((sensor) => {
          const telemetry = sensor.latest_telemetry;
          const isSelected = sensor.id === selectedSensorId;
          const isAnomalous = telemetry?.is_anomalous;
          const wqi = telemetry?.wqi_score || 85;

          return (
            <div
              key={sensor.id}
              onClick={() => setSelectedSensorId(sensor.id)}
              className={`p-5 rounded-2xl border cursor-pointer clean-card transition-all ${
                isSelected
                  ? 'bg-sky-50/70 border-sky-400 shadow-md ring-2 ring-sky-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${isAnomalous ? 'bg-red-600 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="font-mono font-extrabold text-sm text-slate-900">{sensor.node_uid}</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono font-semibold">
                  <span className="flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-slate-400" />
                    {sensor.battery_level}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                    {sensor.signal_rssi} dBm
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-semibold mb-3 truncate">
                <strong className="text-slate-800">Station:</strong> {sensor.source_name}
              </p>

              {/* Metrics Grid */}
              {telemetry ? (
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Turbidity (NTU)</span>
                    <span className={`font-mono font-bold text-sm ${telemetry.turbidity > 5.0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {telemetry.turbidity.toFixed(2)} NTU
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">pH Value</span>
                    <span className={`font-mono font-bold text-sm ${telemetry.ph < 6.5 || telemetry.ph > 8.5 ? 'text-red-600' : 'text-slate-900'}`}>
                      {telemetry.ph.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">Disinfection ORP</span>
                    <span className={`font-mono font-bold text-sm ${telemetry.orp < 650 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {telemetry.orp.toFixed(0)} mV
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold block">WQI Score</span>
                    <span className={`font-mono font-bold text-sm ${wqi < 60 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {wqi} ({telemetry.wqi_grade})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Awaiting telemetry stream...</p>
              )}

              {/* Action */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-mono font-semibold">
                  Ping: {new Date(sensor.last_ping).toLocaleTimeString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSensorId(sensor.id);
                    setActiveTab('dashboard');
                  }}
                  className="text-sky-700 hover:text-sky-900 font-extrabold flex items-center gap-1 hover:translate-x-0.5 transition-transform"
                >
                  Inspect on Map <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
