import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Radio, Gauge, Info, AlertTriangle } from 'lucide-react';

export default function TelemetryChart() {
  const { selectedSensor, selectedTelemetryHistory, sensors, setSelectedSensorId } = useApp();
  const [activeMetric, setActiveMetric] = useState('turbidity');

  const metricsConfig = {
    turbidity: {
      label: 'Turbidity',
      unit: 'NTU',
      color: '#DC2626', // emergency red
      threshold: 5.0,
      thresholdLabel: 'WHO / BIS Permissible Limit (5.0 NTU)',
      min: 0,
      max: 10,
      description: 'Measures suspended particulates; values > 5.0 NTU shield microbial pathogens from chlorination.'
    },
    ph: {
      label: 'pH Level',
      unit: 'pH',
      color: '#0284C7', // sky blue
      threshold: 8.5,
      thresholdLow: 6.5,
      thresholdLabel: 'BIS Safe Range (6.5 - 8.5)',
      min: 5,
      max: 10,
      description: 'Acidity/Alkalinity level. Acidic shifts (< 6.5) cause pipe corrosion and heavy metal leaching.'
    },
    orp: {
      label: 'Disinfection ORP',
      unit: 'mV',
      color: '#16A34A', // vibrant green
      threshold: 650,
      thresholdLabel: 'Min Disinfection Standard (650 mV)',
      min: 300,
      max: 850,
      description: 'Oxidation-Reduction Potential. High ORP (> 650 mV) rapidly kills bacteria and coliforms.'
    },
    tds: {
      label: 'Total Dissolved Solids',
      unit: 'ppm',
      color: '#D97706', // amber
      threshold: 500,
      thresholdLabel: 'BIS Limit (500 ppm)',
      min: 50,
      max: 900,
      description: 'Total dissolved minerals & inorganic salts. Spikes indicate contamination or runoff influx.'
    },
    wqi_score: {
      label: 'Water Quality Index',
      unit: 'WQI',
      color: '#16A34A', // green
      threshold: 60,
      thresholdLabel: 'Contamination Boundary (< 60)',
      min: 0,
      max: 100,
      description: 'Weighted composite water safety index on a 0-100 NSF scale.'
    }
  };

  const currentMetric = metricsConfig[activeMetric];
  const history = selectedTelemetryHistory.length > 0 ? selectedTelemetryHistory : [];

  // SVG Chart Geometry
  const width = 640;
  const height = 240;
  const padding = { top: 30, right: 35, bottom: 35, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const dataValues = history.map((h) => Number(h[activeMetric] || 0));
  const minVal = currentMetric.min !== undefined ? currentMetric.min : Math.min(...dataValues, 0);
  const maxVal = currentMetric.max !== undefined ? currentMetric.max : Math.max(...dataValues, 10);

  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const ratio = (clamped - minVal) / (maxVal - minVal || 1);
    return padding.top + graphHeight - ratio * graphHeight;
  };

  const getX = (index) => {
    if (history.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (history.length - 1)) * graphWidth;
  };

  const points = history.map((h, i) => `${getX(i)},${getY(h[activeMetric] || 0)}`).join(' ');
  const thresholdY = currentMetric.threshold ? getY(currentMetric.threshold) : null;
  const thresholdLowY = currentMetric.thresholdLow ? getY(currentMetric.thresholdLow) : null;

  return (
    <div className="clean-card rounded-3xl p-6 shadow-md bg-white flex flex-col justify-between">
      {/* Header & Station Selector */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Real-Time Sensor Telemetry & Threshold Analysis
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Station: <strong className="text-slate-800">{selectedSensor?.source_name || 'Kamrup Main Intake'}</strong> ({selectedSensor?.node_uid})
                </p>
              </div>
            </div>
          </div>

          {/* Station Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSensor?.id || ''}
              onChange={(e) => setSelectedSensorId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.node_uid} ({s.source_name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1 rounded-2xl bg-slate-100 border border-slate-200">
          {Object.entries(metricsConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMetric === key
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Multi-Parameter Time Series Chart */}
      <div className="relative w-full bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding.top + graphHeight * ratio;
            const labelVal = (maxVal - ratio * (maxVal - minVal)).toFixed(1);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4,4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Safety Threshold Lines */}
          {thresholdY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={thresholdY}
                x2={width - padding.right}
                y2={thresholdY}
                stroke="#DC2626"
                strokeDasharray="6,4"
                strokeWidth="1.5"
              />
              <text
                x={width - padding.right}
                y={thresholdY - 6}
                textAnchor="end"
                fill="#DC2626"
                fontSize="9"
                fontWeight="800"
                fontFamily="Plus Jakarta Sans"
              >
                {currentMetric.thresholdLabel}
              </text>
            </g>
          )}

          {thresholdLowY !== null && (
            <line
              x1={padding.left}
              y1={thresholdLowY}
              x2={width - padding.right}
              y2={thresholdLowY}
              stroke="#DC2626"
              strokeDasharray="6,4"
              strokeWidth="1.5"
            />
          )}

          {/* Gradient Fill under Line */}
          <defs>
            <linearGradient id={`grad-telemetry-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentMetric.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={currentMetric.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {history.length > 1 && (
            <polygon
              points={`${getX(0)},${padding.top + graphHeight} ${points} ${getX(history.length - 1)},${padding.top + graphHeight}`}
              fill={`url(#grad-telemetry-${activeMetric})`}
            />
          )}

          {/* Line Polyline */}
          {history.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke={currentMetric.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points / Micro Anomaly Markers */}
          {history.map((h, idx) => {
            const cx = getX(idx);
            const cy = getY(h[activeMetric] || 0);
            const isAnomaly = h.is_anomalous;

            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isAnomaly ? '5.5' : '3'}
                  fill={isAnomaly ? '#DC2626' : currentMetric.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {isAnomaly && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="10"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="1.5"
                    className="pulse-red"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Real-time Parameter Grid Breakdown */}
      {selectedSensor?.latest_telemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Current Turbidity</span>
            <span className={`text-lg font-mono font-extrabold ${selectedSensor.latest_telemetry.turbidity > 5.0 ? 'text-red-600' : 'text-slate-900'}`}>
              {selectedSensor.latest_telemetry.turbidity.toFixed(2)} NTU
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">pH Acidity</span>
            <span className={`text-lg font-mono font-extrabold ${selectedSensor.latest_telemetry.ph < 6.5 || selectedSensor.latest_telemetry.ph > 8.5 ? 'text-red-600' : 'text-slate-900'}`}>
              {selectedSensor.latest_telemetry.ph.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Disinfection ORP</span>
            <span className={`text-lg font-mono font-extrabold ${selectedSensor.latest_telemetry.orp < 650 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {selectedSensor.latest_telemetry.orp.toFixed(0)} mV
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Station WQI</span>
            <span className="text-lg font-mono font-extrabold text-emerald-600">
              {selectedSensor.latest_telemetry.wqi_score} ({selectedSensor.latest_telemetry.wqi_grade})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
