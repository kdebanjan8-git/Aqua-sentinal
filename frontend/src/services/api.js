import { io } from 'socket.io-client';

const API_BASE = '/api';
let authToken = localStorage.getItem('jal_satark_auth_token') || null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('jal_satark_auth_token', token);
  } else {
    localStorage.removeItem('jal_satark_auth_token');
  }
};

export const getAuthToken = () => authToken;

const getHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});

export const api = {
  // Authentication & Profile
  async login(credentials) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return res.json();
  },

  // Water Sources & Sensors
  async getWaterSources() {
    const res = await fetch(`${API_BASE}/water-sources`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getSensors() {
    const res = await fetch(`${API_BASE}/sensors`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getSensorHistory(sensorId, limit = 50) {
    const res = await fetch(`${API_BASE}/sensors/${sensorId}/history?limit=${limit}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async ingestTelemetry(payload) {
    const res = await fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Symptom Surveillance
  async getSymptoms(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/symptoms?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createSymptom(payload) {
    const res = await fetch(`${API_BASE}/symptoms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getSymptomClusters() {
    const res = await fetch(`${API_BASE}/symptoms/clusters`, {
      headers: getHeaders()
    });
    return res.json();
  },

  // Alerts & Public Health Advisories
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/alerts?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateAlertStatus(id, status, notes = '') {
    const res = await fetch(`${API_BASE}/alerts/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    return res.json();
  },

  async getAdvisories() {
    const res = await fetch(`${API_BASE}/advisories`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createAdvisory(payload) {
    const res = await fetch(`${API_BASE}/advisories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getInterventions() {
    const res = await fetch(`${API_BASE}/interventions`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createIntervention(payload) {
    const res = await fetch(`${API_BASE}/interventions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Health Chat Assistant (Local Llama & Multi-lingual Triage)
  async sendHealthChatMessage(payload) {
    const res = await fetch(`${API_BASE}/health-chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Continuous Learning Chat Consultations
  async saveConsultation(payload) {
    const res = await fetch(`${API_BASE}/consultations/save`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getConsultations(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/consultations?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async verifyConsultation(id) {
    const res = await fetch(`${API_BASE}/consultations/${id}/verify`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return res.json();
  },

  // End-to-End Encrypted (E2EE) Citizen Reports
  async dispatchEncryptedReport(payload) {
    const res = await fetch(`${API_BASE}/encrypted-reports/dispatch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getDistrictKeys(district = '') {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const res = await fetch(`${API_BASE}/encrypted-reports/district-keys${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getEncryptedReports(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/encrypted-reports?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateEncryptedReportStatus(id, status) {
    const res = await fetch(`${API_BASE}/encrypted-reports/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async registerPublicKey(publicKey, keyFingerprint) {
    const res = await fetch(`${API_BASE}/auth/register-public-key`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ public_key: publicKey, key_fingerprint: keyFingerprint })
    });
    return res.json();
  },

  // ASHA Field Surveillance & Citizen Proxy Registration
  async submitAshaProxyReport(payload) {
    const res = await fetch(`${API_BASE}/asha/proxy-report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getAshaReports() {
    const res = await fetch(`${API_BASE}/asha/my-reports`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateAshaReportStatus(id, status) {
    const res = await fetch(`${API_BASE}/asha/reports/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Simulation Controls
  async triggerSpike(sensorId) {
    const res = await fetch(`${API_BASE}/simulation/trigger-spike`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sensor_id: sensorId })
    });
    return res.json();
  },

  async triggerChemicalShock(sensorId) {
    const res = await fetch(`${API_BASE}/simulation/trigger-chemical-shock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sensor_id: sensorId })
    });
    return res.json();
  },

  async triggerOutbreakWave() {
    const res = await fetch(`${API_BASE}/simulation/trigger-outbreak-wave`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({})
    });
    return res.json();
  },

  async resetSimulation() {
    const res = await fetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Master Database Explorer & Audit Console (Admin Only)
  async getDbOverview() {
    const res = await fetch(`${API_BASE}/admin/db/overview`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getDbTableRecords(table, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/db/${table}?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async exportDbTable(table, format = 'csv', params = {}) {
    const query = new URLSearchParams({ ...params, format }).toString();
    const res = await fetch(`${API_BASE}/admin/db/${table}/export?${query}`, {
      headers: getHeaders()
    });
    if (format === 'json') {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      return blob;
    } else {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      return blob;
    }
  }
};
