import { v4 as uuidv4 } from 'uuid';
import { pool, isPostgresConnected } from '../config/db.js';
import { loadDatasetNodes } from '../utils/datasetLoader.js';

// Haversine distance in kilometers for in-memory spatial calculations
export function haversineKm(lat1, lon1, lat2, lon2) {
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

// In-memory data store initialized with 20,000-record dataset monitoring stations
class InMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Dynamic dataset seed loader
    const dataset = loadDatasetNodes();

    if (dataset && dataset.waterSources && dataset.waterSources.length > 0) {
      this.waterSources = dataset.waterSources;
      this.sensors = dataset.sensors;
      this.telemetry = dataset.telemetry;
      this.alerts = dataset.alerts;
      this.symptoms = dataset.symptoms;
    } else {
      // Clean fallback baseline
      this.waterSources = [];
      this.sensors = [];
      this.telemetry = [];
      this.alerts = [];
      this.symptoms = [];
    }

    // 6. Initial Public Advisories (Clean baseline - empty)
    this.advisories = [];

    // 7. Initial Emergency Interventions (Clean baseline - empty)
    this.interventions = [];

    // 8. Continuous Learning Chat Consultations (Clean baseline - empty)
    this.consultations = [];

    // 9. End-to-End Encrypted Citizen Reports (Clean baseline - empty)
    this.encryptedReports = [];

    // 10. Seeded Demo Users with valid bcrypt password hashes
    // Passwords:
    // admin@jalsatark.gov.in -> Admin@123
    // healthworker@jalsatark.gov.in -> Health@123
    // citizen@jalsatark.gov.in -> Citizen@123
    this.users = [
      {
        id: 'u1000000-0000-0000-0000-000000000001',
        full_name: 'Dr. Ananya Sharma',
        email: 'admin@jalsatark.gov.in',
        password_hash: '$2a$10$.Z4HW2gaRgCCsO82fYZHNunxREQ4SCTUxOH3ROSy.tWWE8x.VRp1u',
        plain_password_fallback: 'Admin@123',
        role: 'district_admin',
        state: 'Assam',
        district: 'Kamrup Metro',
        public_key: null,
        key_fingerprint: null,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'u1000000-0000-0000-0000-000000000002',
        full_name: 'Bikash Roy (ASHA Supervisor)',
        email: 'healthworker@jalsatark.gov.in',
        password_hash: '$2a$10$3ZZKpXT5cxR6kQF6AWVqJ.mIOLtZbd/snjCFG5PvcL3IhosRKMRbG',
        plain_password_fallback: 'Health@123',
        role: 'health_worker',
        state: 'Assam',
        district: 'Kamrup Metro',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'u1000000-0000-0000-0000-000000000003',
        full_name: 'Priyanka Gogoi',
        email: 'citizen@jalsatark.gov.in',
        password_hash: '$2a$10$NhGiee70fRWjIpV2Df/LPe16ENcJZL56L34LEAIym/OxMey8SyWCm',
        plain_password_fallback: 'Citizen@123',
        role: 'citizen',
        state: 'Assam',
        district: 'Dispur / Guwahati',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      }
    ];
  }

  // User store helpers
  findUserByEmail(email) {
    const normalized = email?.trim()?.toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  findUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  createUser(userData) {
    const newUser = {
      id: userData.id || uuidv4(),
      full_name: userData.full_name,
      email: userData.email.trim().toLowerCase(),
      password_hash: userData.password_hash,
      plain_password_fallback: userData.plain_password_fallback || null,
      role: userData.role || 'citizen',
      state: userData.state || 'Assam',
      district: userData.district || 'Kamrup Metro',
      created_at: userData.created_at || new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Helper getters
  async getWaterSources() {
    return this.waterSources;
  }

  async getSensors() {
    return this.sensors.map((sensor) => {
      const readings = this.telemetry.filter((t) => t.sensor_id === sensor.id);
      const latest = readings.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0] || null;
      const source = this.waterSources.find((w) => w.id === sensor.source_id);
      return {
        ...sensor,
        source_name: source?.name || 'Unknown Source',
        latest_telemetry: latest
      };
    });
  }

  async getAlerts() {
    return this.alerts;
  }

  // Continuous Learning Consultations
  async saveConsultation(data) {
    const consultation = {
      id: data.id || uuidv4(),
      user_id: data.user_id || null,
      latitude: Number(data.latitude || 26.1850),
      longitude: Number(data.longitude || 91.7500),
      district: data.district || 'Kamrup Metro',
      state: data.state || 'Assam',
      reported_symptoms: Array.isArray(data.reported_symptoms) ? data.reported_symptoms : [],
      suspected_condition: data.suspected_condition || 'acute_gastroenteritis',
      severity: data.severity || 'moderate',
      visual_cue_findings: data.visual_cue_findings || null,
      ambient_telemetry_snapshot: data.ambient_telemetry_snapshot || {},
      final_advice: data.final_advice || 'Drink clean water and hydrate with ORS.',
      is_verified: data.is_verified === true,
      verified_by: data.verified_by || null,
      verified_at: data.verified_at || null,
      created_at: data.created_at || new Date().toISOString()
    };
    this.consultations.unshift(consultation);
    return consultation;
  }

  async getConsultations(filter = {}) {
    let result = [...this.consultations];
    if (filter.is_verified !== undefined) {
      result = result.filter((c) => c.is_verified === filter.is_verified);
    }
    if (filter.district) {
      result = result.filter((c) => c.district.toLowerCase() === filter.district.toLowerCase());
    }
    return result;
  }

  async verifyConsultation(id, verifiedBy = null) {
    const consultation = this.consultations.find((c) => c.id === id);
    if (consultation) {
      consultation.is_verified = true;
      consultation.verified_by = verifiedBy;
      consultation.verified_at = new Date().toISOString();
      return consultation;
    }
    return null;
  }

  // End-to-End Encrypted (E2EE) Citizen Reports
  async saveEncryptedReport(data) {
    const report = {
      id: data.id || uuidv4(),
      sender_id: data.sender_id || null,
      recipient_district: data.recipient_district || 'Kamrup Metro',
      recipient_admin_id: data.recipient_admin_id || null,
      encrypted_payload: data.encrypted_payload,
      encrypted_symmetric_key: data.encrypted_symmetric_key,
      iv: data.iv,
      status: data.status || 'unread',
      created_at: data.created_at || new Date().toISOString()
    };
    this.encryptedReports.unshift(report);
    return report;
  }

  async getEncryptedReports(filter = {}) {
    let result = [...this.encryptedReports];
    if (filter.recipient_district) {
      result = result.filter(
        (r) => r.recipient_district.toLowerCase() === filter.recipient_district.toLowerCase()
      );
    }
    if (filter.status) {
      result = result.filter((r) => r.status === filter.status);
    }
    if (filter.recipient_admin_id) {
      result = result.filter((r) => r.recipient_admin_id === filter.recipient_admin_id);
    }
    return result;
  }

  async updateEncryptedReportStatus(id, status) {
    const report = this.encryptedReports.find((r) => r.id === id);
    if (report) {
      report.status = status;
      return report;
    }
    return null;
  }

  async updateUserPublicKey(userId, publicKey, keyFingerprint) {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.public_key = publicKey;
      user.key_fingerprint = keyFingerprint;
      return user;
    }
    return null;
  }

  async getDistrictAdmins(district = null) {
    let admins = this.users.filter((u) => u.role === 'district_admin' || u.role === 'government');
    if (district) {
      admins = admins.filter(
        (u) => !u.district || u.district.toLowerCase() === district.toLowerCase()
      );
    }
    return admins.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      district: u.district,
      state: u.state,
      public_key: u.public_key,
      key_fingerprint: u.key_fingerprint
    }));
  }

  async saveAshaProxyReport(report) {
    const enriched = {
      id: report.id || uuidv4(),
      reporter_type: 'community_health_worker',
      patient_identifier: report.patient_identifier || `HH-${report.household_head_name?.replace(/\s+/g, '-').toUpperCase() || 'CITIZEN'}`,
      household_head_name: report.household_head_name || 'Citizen Household',
      village_ward: report.village_ward || 'Ward Community',
      affected_count: Number(report.affected_count) || 1,
      vulnerable_age_flags: Array.isArray(report.vulnerable_age_flags) ? report.vulnerable_age_flags : [],
      patient_age_group: report.patient_age_group || 'adult_18_59',
      patient_gender: report.patient_gender || 'unspecified',
      symptoms: Array.isArray(report.symptoms) ? report.symptoms : [report.symptoms || 'watery_diarrhea'],
      suspected_disease: report.suspected_disease || 'acute_gastroenteritis',
      severity: report.severity || 'moderate',
      urgency_level: report.urgency_level || 'routine',
      emergency_cluster_flag: Boolean(report.emergency_cluster_flag),
      field_intervention: report.field_intervention || 'none',
      suspected_water_source_id: report.suspected_water_source_id || null,
      water_source_id: report.water_source_id || report.suspected_water_source_id || null,
      registered_by_asha_id: report.registered_by_asha_id || null,
      asha_name: report.asha_name || 'ASHA Field Worker',
      district: report.district || 'Kamrup Metro',
      state: report.state || 'Assam',
      latitude: Number(report.latitude) || 26.1580,
      longitude: Number(report.longitude) || 91.7820,
      notes: report.notes || '',
      status: report.status || (report.emergency_cluster_flag || report.urgency_level === 'critical_emergency' ? 'investigating' : 'logged'),
      reported_at: new Date().toISOString()
    };

    this.symptoms.unshift(enriched);
    return enriched;
  }

  async getAshaReports(ashaId = null) {
    if (ashaId) {
      return this.symptoms.filter((s) => s.registered_by_asha_id === ashaId);
    }
    return this.symptoms.filter((s) => s.registered_by_asha_id);
  }
}

export const dbStore = new InMemoryStore();
