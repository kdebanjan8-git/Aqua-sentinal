import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  createSensorIcon,
  createWaterSourceIcon,
  createSymptomIcon
} from './SensorMarker';
import {
  Radio,
  AlertCircle,
  Droplets,
  Activity,
  Clock,
  ShieldAlert,
  Layers,
  MapPin,
  ArrowUpRight,
  Filter,
  Globe,
  Flame,
  CheckCircle2
} from 'lucide-react';

const REGIONS = {
  all: { label: 'All Northeast Grid (62 Stations)', center: [25.57, 92.50], zoom: 7.5 },
  Meghalaya: { label: 'Meghalaya Hills (32 Stations)', center: [25.46, 91.36], zoom: 9 },
  Assam: { label: 'Assam Valley & Brahmaputra (15 Stations)', center: [26.20, 92.93], zoom: 8.5 },
  Manipur: { label: 'Manipur Imphal Basin (6 Stations)', center: [24.66, 93.90], zoom: 9 },
  Mizoram: { label: 'Mizoram Aizawl Ridge (6 Stations)', center: [23.16, 92.93], zoom: 8.5 },
  Nagaland: { label: 'Nagaland Heights (3 Stations)', center: [25.90, 94.10], zoom: 8.5 }
};

function MapController({ selectedSensor, selectedRegion }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSensor?.latitude && selectedSensor?.longitude) {
      map.flyTo([selectedSensor.latitude, selectedSensor.longitude], 14, {
        duration: 1.2
      });
    }
  }, [selectedSensor, map]);

  useEffect(() => {
    if (selectedRegion && REGIONS[selectedRegion]) {
      const reg = REGIONS[selectedRegion];
      map.flyTo(reg.center, reg.zoom, {
        duration: 1.4
      });
    }
  }, [selectedRegion, map]);

  return null;
}

export default function LeafletMap() {
  const {
    waterSources,
    sensors,
    symptoms,
    alerts,
    selectedSensorId,
    setSelectedSensorId,
    mapLayer,
    setMapLayer,
    setActiveTab
  } = useApp();
  const { isDistrictAdmin } = useAuth();

  // Regional default center: Framing entire Northeast region
  const defaultCenter = [25.57, 92.50];
  const [selectedRegion, setSelectedRegion] = useState('all');

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');
  const selectedSensor = sensors.find((s) => s.id === selectedSensorId);

  const sensorsWithWqi = sensors.filter((s) => s.latest_telemetry?.wqi_score);
  const avgWqi = sensorsWithWqi.length > 0
    ? Math.round(
        sensorsWithWqi.reduce((acc, s) => acc + s.latest_telemetry.wqi_score, 0) /
          sensorsWithWqi.length
      )
    : 88;

  // Filter items by region if specified
  const filteredSources = selectedRegion === 'all'
    ? waterSources
    : waterSources.filter((w) => w.state === selectedRegion);

  const filteredSensors = selectedRegion === 'all'
    ? sensors
    : sensors.filter((s) => s.state === selectedRegion);

  const filteredSymptoms = selectedRegion === 'all'
    ? symptoms
    : symptoms.filter((s) => s.state === selectedRegion);

  return (
    <div className="relative w-full h-[620px] lg:h-[720px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* 1. Top-Left Floating Cockpit HUD (Neatly tucked inside map canvas) */}
      <div className="absolute top-4 left-4 z-[400] hud-card p-4 rounded-2xl max-w-sm hidden sm:block border border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${criticalAlerts.length > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="font-extrabold text-xs text-slate-100 uppercase tracking-wider">
              Northeast Regional Telemetry Grid
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/50">
            {sensors.length} Stations Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Regional Index (WQI)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-extrabold font-mono ${avgWqi >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {avgWqi}
              </span>
              <span className="text-[10px] font-bold text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Critical Outbreaks</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-extrabold font-mono ${criticalAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {criticalAlerts.length}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Hotspots</span>
            </div>
          </div>
        </div>

        {/* State Filter Buttons - Clean flex wrap pills */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-800">
          {[
            { id: 'all', label: 'All Northeast' },
            { id: 'Meghalaya', label: 'Meghalaya (32)' },
            { id: 'Assam', label: 'Assam (15)' },
            { id: 'Manipur', label: 'Manipur (6)' },
            { id: 'Mizoram', label: 'Mizoram (6)' },
            { id: 'Nagaland', label: 'Nagaland (3)' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedRegion(st.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
                selectedRegion === st.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:border-teal-500 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top-Right Floating Regional Selector & GIS Overlays */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2.5">
        {/* State/District Cluster Jump Dropdown */}
        <div className="hud-card p-2 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 bg-slate-900/90 text-slate-100 backdrop-blur-md">
          <Globe className="w-4 h-4 text-teal-400 ml-1 flex-shrink-0" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 pr-2 py-1 focus:outline-none cursor-pointer"
          >
            {Object.entries(REGIONS).map(([key, reg]) => (
              <option key={key} value={key} className="bg-slate-900 text-slate-100">
                {reg.label}
              </option>
            ))}
          </select>
        </div>

        {/* GIS Overlays Toggles */}
        <div className="hud-card p-3 rounded-2xl shadow-xl flex flex-col gap-2 text-xs min-w-[210px] border border-slate-800 bg-slate-900/90 text-slate-100 backdrop-blur-md">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              GIS Overlays
            </span>
          </div>

          <label className="flex items-center justify-between gap-2 text-slate-300 cursor-pointer hover:text-white group">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-green"></span>
              IoT Sensors ({filteredSensors.length})
            </span>
            <input
              type="checkbox"
              checked={mapLayer.sensors}
              onChange={(e) => setMapLayer({ ...mapLayer, sensors: e.target.checked })}
              className="rounded border-slate-700 text-teal-500 focus:ring-teal-500/20 bg-slate-800 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-slate-300 cursor-pointer hover:text-white group">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-glow-red"></span>
              Clinic Intakes ({filteredSymptoms.length})
            </span>
            <input
              type="checkbox"
              checked={mapLayer.symptoms}
              onChange={(e) => setMapLayer({ ...mapLayer, symptoms: e.target.checked })}
              className="rounded border-slate-700 text-red-500 focus:ring-red-500/20 bg-slate-800 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-slate-300 cursor-pointer hover:text-white group">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
              Critical Geofences ({criticalAlerts.length})
            </span>
            <input
              type="checkbox"
              checked={mapLayer.geofences}
              onChange={(e) => setMapLayer({ ...mapLayer, geofences: e.target.checked })}
              className="rounded border-slate-700 text-red-500 focus:ring-red-500/20 bg-slate-800 h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* 3. Bottom-Left Outbreak Ticker Badge */}
      {criticalAlerts.length > 0 && (
        <div className="absolute bottom-16 left-4 z-[400] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-red-500/50 shadow-2xl max-w-sm hidden md:block animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <ShieldAlert className="w-4 h-4 animate-bounce text-red-500" />
            <span className="font-extrabold text-xs uppercase tracking-wider">
              {criticalAlerts.length} Critical Outbreaks Detected
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold leading-snug">
            {criticalAlerts[0].trigger_explanation || criticalAlerts[0].recommended_action}
          </p>
          <button
            onClick={() => setActiveTab('alerts')}
            className="mt-2 text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            Open Incident Triage <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Bottom-Left Status Legend */}
      <div className="absolute bottom-4 left-4 z-[400] hud-card px-3.5 py-2 rounded-2xl shadow-xl flex flex-wrap items-center gap-3.5 text-[11px] text-slate-300 border border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md bg-sky-500 border border-sky-400"></span>
          <span className="font-semibold">Facility</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-green"></span>
          <span className="font-semibold">Safe (Low)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="font-semibold">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-red-300 shadow-glow-red animate-pulse"></span>
          <span className="font-bold text-red-400">Critical Hotspot</span>
        </div>
      </div>

      {/* Map Canvas with Watermark-Free Esri Dark Gray Canvas TileLayer */}
      <MapContainer
        center={defaultCenter}
        zoom={7.5}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={16}
        />

        <MapController selectedSensor={selectedSensor} selectedRegion={selectedRegion} />

        {/* 1. Water Sources */}
        {filteredSources.map((source) => {
          const matchingSensor = sensors.find((s) => s.source_id === source.id);
          const telemetry = matchingSensor?.latest_telemetry;
          const isCritical = (telemetry?.risk_level === 'High') || (telemetry?.is_critical_outbreak) || (telemetry?.contamination && telemetry?.diarrhea_cases > 10);

          return (
            <Marker
              key={source.id}
              position={[source.latitude, source.longitude]}
              icon={createWaterSourceIcon(source.type, source.status, telemetry?.risk_level, isCritical)}
            >
              <Popup>
                <div className="p-2 min-w-[250px] text-slate-900">
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{source.name}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold">{source.district}, {source.state}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Facility Type:</span>
                      <span className="capitalize font-bold text-slate-900">{source.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Risk Rating:</span>
                      <span className={`font-extrabold uppercase text-[10px] ${
                        isCritical ? 'text-red-600' : telemetry?.risk_level === 'Moderate' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {isCritical ? 'Critical Outbreak' : telemetry?.risk_level || 'Low Risk'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Population Served:</span>
                      <span className="font-mono text-sky-700 font-extrabold">{source.population_served?.toLocaleString()} citizens</span>
                    </div>
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <span className="font-bold text-xs">{source.name}</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* 2. IoT Sensor Nodes */}
        {mapLayer.sensors &&
          filteredSensors.map((sensor) => {
            const telemetry = sensor.latest_telemetry;
            const isCriticalOutbreak = (telemetry?.risk_level === 'High') || (telemetry?.is_critical_outbreak) || (telemetry?.contamination && telemetry?.diarrhea_cases > 10);
            const isAnomalous = telemetry?.is_anomalous || false;
            const wqiGrade = telemetry?.wqi_grade || 'Good';
            const riskLevel = isCriticalOutbreak ? 'High' : (telemetry?.risk_level || 'Low');

            return (
              <React.Fragment key={sensor.id}>
                <Marker
                  position={[sensor.latitude, sensor.longitude]}
                  icon={createSensorIcon(sensor.status, isAnomalous, wqiGrade, riskLevel, isCriticalOutbreak)}
                  eventHandlers={{
                    click: () => setSelectedSensorId(sensor.id)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[280px] text-slate-900 font-mono">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-sky-600" />
                          <span className="font-extrabold text-sm text-slate-900">{sensor.node_uid}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          isCriticalOutbreak
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : riskLevel === 'Moderate'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}>
                          WQI {telemetry?.wqi_score ?? '--'} &bull; {isCriticalOutbreak ? 'Critical' : riskLevel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-2 truncate">
                        <strong className="text-slate-800">Location:</strong> {sensor.district}, {sensor.state}
                      </p>

                      {telemetry ? (
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-semibold">Turbidity (NTU)</span>
                            <span className={`font-extrabold text-sm ${telemetry.turbidity > 5.0 ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                              {telemetry.turbidity?.toFixed(2)} NTU
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-semibold">pH Acidity</span>
                            <span className={`font-extrabold text-sm ${telemetry.ph < 6.5 || telemetry.ph > 8.5 ? 'text-red-600' : 'text-slate-800'}`}>
                              {telemetry.ph?.toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-semibold">Free Chlorine</span>
                            <span className="font-extrabold text-sm text-sky-700">
                              {telemetry.free_chlorine?.toFixed(2) ?? '0.45'} mg/L
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-semibold">Total Solids (TDS)</span>
                            <span className={`font-extrabold text-sm ${telemetry.tds > 500.0 ? 'text-red-600' : 'text-slate-800'}`}>
                              {telemetry.tds?.toFixed(0)} ppm
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic mb-2">No recent telemetry broadcast recorded.</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Live Ping
                        </span>
                        <span className="text-slate-400">
                          {new Date(sensor.last_ping).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <span className="font-bold text-xs">{sensor.node_uid} ({isCriticalOutbreak ? 'CRITICAL OUTBREAK' : riskLevel})</span>
                  </Tooltip>
                </Marker>

                {/* Pulsing Outbreak Zone Circle strictly around Critical Outbreak Hotspots */}
                {mapLayer.geofences && isCriticalOutbreak && (
                  <Circle
                    center={[sensor.latitude, sensor.longitude]}
                    radius={2000}
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: '#EF4444',
                      fillOpacity: 0.18,
                      weight: 2,
                      dashArray: '4, 8'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* 3. Community Symptom Reports */}
        {mapLayer.symptoms &&
          filteredSymptoms.map((symptom) => (
            <Marker
              key={symptom.id}
              position={[symptom.latitude, symptom.longitude]}
              icon={createSymptomIcon(symptom.severity)}
            >
              <Popup>
                <div className="p-2 min-w-[220px] text-slate-900 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                    <span className="font-extrabold text-xs text-red-600">
                      {symptom.household_head_name || symptom.patient_identifier}
                    </span>
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                      {symptom.severity}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>
                      <strong className="text-slate-900">Ward:</strong> {symptom.village_ward || `${symptom.district}, ${symptom.state}`}
                    </p>
                    <p>
                      <strong className="text-slate-900">Affected:</strong> {symptom.affected_count || 1} citizens
                    </p>
                    <p>
                      <strong className="text-slate-900">Symptoms:</strong>{' '}
                      <span className="text-red-700 font-bold">
                        {Array.isArray(symptom.symptoms) ? symptom.symptoms.join(', ') : symptom.symptoms}
                      </span>
                    </p>
                    {symptom.field_intervention && (
                      <p>
                        <strong className="text-slate-900">Action:</strong> {symptom.field_intervention}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
