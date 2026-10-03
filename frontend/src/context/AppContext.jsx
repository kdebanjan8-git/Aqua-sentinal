import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, socket } from '../services/api';

const AppContext = createContext();

// Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function AppProvider({ children }) {
  const [waterSources, setWaterSources] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [consultations, setConsultations] = useState([]);

  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [selectedTelemetryHistory, setSelectedTelemetryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mapLayer, setMapLayer] = useState({
    sensors: true,
    symptoms: true,
    geofences: true,
    heatmaps: true
  });

  // Live Geolocation State
  const [userLocation, setUserLocation] = useState({
    latitude: 26.1420,
    longitude: 91.7910,
    accuracy: 25,
    isLive: false,
    district: 'Kamrup Metro',
    state: 'Assam',
    cityLabel: 'Guwahati (Kamrup Metro)'
  });
  const [locationStatus, setLocationStatus] = useState('acquiring'); // 'active' | 'acquiring' | 'fallback' | 'denied'

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isSecureDispatchOpen, setIsSecureDispatchOpen] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Geolocation tracker
  const startLiveLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('fallback');
      return;
    }

    setLocationStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        setUserLocation({
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          isLive: true,
          district: 'Kamrup Metro',
          state: 'Assam',
          cityLabel: `${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E - Guwahati`
        });
        setLocationStatus('active');
      },
      (err) => {
        console.warn('Geolocation access denied or timed out, using regional fallback:', err.message);
        setLocationStatus('fallback');
        setUserLocation((prev) => ({
          ...prev,
          isLive: false,
          cityLabel: 'Kamrup Metro (Default Grid)'
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    startLiveLocationTracking();
  }, [startLiveLocationTracking]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sourcesRes, sensorsRes, symptomsRes, alertsRes, advRes, intRes, clustersRes, consultRes] = await Promise.all([
        api.getWaterSources(),
        api.getSensors(),
        api.getSymptoms(),
        api.getAlerts(),
        api.getAdvisories(),
        api.getInterventions(),
        api.getSymptomClusters(),
        api.getConsultations({ limit: 20 })
      ]);

      if (sourcesRes.success) setWaterSources(sourcesRes.data);
      if (sensorsRes.success) {
        setSensors(sensorsRes.data);
        if (sensorsRes.data.length > 0 && !selectedSensorId) {
          setSelectedSensorId(sensorsRes.data[0].id);
        }
      }
      if (symptomsRes.success) setSymptoms(symptomsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (advRes.success) setAdvisories(advRes.data);
      if (intRes.success) setInterventions(intRes.data);
      if (clustersRes.success) setClusters(clustersRes.data);
      if (consultRes.success) setConsultations(consultRes.data);
    } catch (err) {
      console.error('Error loading initial data:', err);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSensorId, showToast]);

  // Load telemetry history when selected sensor changes
  useEffect(() => {
    if (!selectedSensorId) return;
    api.getSensorHistory(selectedSensorId).then((res) => {
      if (res.success) {
        setSelectedTelemetryHistory(res.data);
      }
    });
  }, [selectedSensorId]);

  // Save consultation helper
  const saveConsultation = useCallback(async (payload) => {
    try {
      const res = await api.saveConsultation({
        ...payload,
        latitude: payload.latitude || userLocation.latitude,
        longitude: payload.longitude || userLocation.longitude,
        district: payload.district || userLocation.district,
        state: payload.state || userLocation.state
      });

      if (res.success && res.data) {
        setConsultations((prev) => [res.data, ...prev]);
        showToast('Assessment saved to regional health registry for continuous surveillance.', 'info');
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err) {
      showToast('Failed to save assessment to registry', 'error');
      return { success: false, error: err.message };
    }
  }, [userLocation, showToast]);

  // Socket event subscriptions
  useEffect(() => {
    loadInitialData();

    socket.on('telemetry:new', (data) => {
      setSensors((prev) =>
        prev.map((s) =>
          s.id === data.sensor.id
            ? { ...s, latest_telemetry: data.reading, last_ping: data.reading.recorded_at }
            : s
        )
      );

      setSelectedSensorId((currId) => {
        if (currId === data.sensor.id) {
          setSelectedTelemetryHistory((hist) => [...hist.slice(-49), data.reading]);
        }
        return currId;
      });

      if (data.alert) {
        setAlerts((prev) => {
          const idx = prev.findIndex((a) => a.id === data.alert.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.alert;
            return updated;
          }
          return [data.alert, ...prev];
        });

        if (data.alert.severity === 'critical') {
          showToast(`🚨 CRITICAL HAZARD: ${data.alert.hazard_type.replace(/_/g, ' ').toUpperCase()}`, 'critical');
        } else {
          showToast(`⚠️ Telemetry Warning on ${data.sensor.node_uid}`, 'warning');
        }
      }
    });

    socket.on('symptom:new', (data) => {
      setSymptoms((prev) => [data.report, ...prev]);
      showToast(`📋 New Symptom Intake Logged: ${data.report.suspected_disease}`, 'info');
      api.getSymptomClusters().then((res) => {
        if (res.success) setClusters(res.data);
      });
    });

    socket.on('consultation:logged', (data) => {
      setConsultations((prev) => [data, ...prev]);
    });

    socket.on('alert:new', (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
      showToast(`🚨 NEW OUTBREAK ALERT: ${newAlert.alert_code}`, 'critical');
    });

    socket.on('alert:updated', (updatedAlert) => {
      setAlerts((prev) => prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a)));
    });

    socket.on('advisory:new', (newAdvisory) => {
      setAdvisories((prev) => [newAdvisory, ...prev]);
      showToast(`📢 PUBLIC ADVISORY BROADCAST: ${newAdvisory.title}`, 'warning');
    });

    socket.on('simulation:reset', () => {
      loadInitialData();
      showToast('Database reset to clean baseline.', 'info');
    });

    socket.on('simulation:wave', () => {
      loadInitialData();
    });

    return () => {
      socket.off('telemetry:new');
      socket.off('symptom:new');
      socket.off('consultation:logged');
      socket.off('alert:new');
      socket.off('alert:updated');
      socket.off('advisory:new');
      socket.off('simulation:reset');
      socket.off('simulation:wave');
    };
  }, [loadInitialData, showToast]);

  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const criticalAlertsCount = alerts.filter((a) => a.status === 'active' && a.severity === 'critical').length;
  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) || sensors[0] || null;

  return (
    <AppContext.Provider
      value={{
        waterSources,
        sensors,
        symptoms,
        alerts,
        advisories,
        interventions,
        clusters,
        consultations,
        userLocation,
        locationStatus,
        startLiveLocationTracking,
        saveConsultation,
        selectedSensorId,
        setSelectedSensorId,
        selectedSourceId,
        setSelectedSourceId,
        selectedSensor,
        selectedTelemetryHistory,
        activeTab,
        setActiveTab,
        mapLayer,
        setMapLayer,
        isLoading,
        toast,
        showToast,
        activeAlertsCount,
        criticalAlertsCount,
        isAdvisoryModalOpen,
        setIsAdvisoryModalOpen,
        isIntakeModalOpen,
        setIsIntakeModalOpen,
        isSecureDispatchOpen,
        setIsSecureDispatchOpen,
        loadInitialData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
