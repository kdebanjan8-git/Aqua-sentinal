import { Router } from 'express';
import {
  register,
  login,
  getMe
} from '../controllers/authController.js';
import {
  requireAuth,
  requireRole,
  optionalAuth
} from '../middleware/authMiddleware.js';
import {
  getWaterSources,
  getSensors,
  getSensorHistory,
  ingestTelemetry
} from '../controllers/sensorController.js';
import {
  getSymptoms,
  createSymptomReport,
  getSymptomClusters
} from '../controllers/symptomController.js';
import {
  submitAshaProxyReport,
  getMyAshaReports,
  updateAshaReportStatus
} from '../controllers/ashaController.js';
import {
  getAlerts,
  updateAlertStatus,
  getAdvisories,
  createAdvisory,
  getInterventions,
  createIntervention
} from '../controllers/alertController.js';
import {
  triggerBacterialSpike,
  triggerChemicalShock,
  triggerOutbreakWave,
  resetSimulation
} from '../controllers/simulationController.js';
import {
  saveConsultation,
  getConsultations,
  verifyConsultation
} from '../controllers/consultationController.js';
import {
  dispatchEncryptedReport,
  getEncryptedReports,
  updateEncryptedReportStatus,
  getDistrictKeys,
  registerPublicKey
} from '../controllers/encryptedReportController.js';
import {
  getDatabaseOverview,
  getTableRecords,
  exportTableData
} from '../controllers/adminDbController.js';
import { handleHealthChat } from '../controllers/chatController.js';

const router = Router();

// ==========================================
// 1. Authentication & User Profile Routes
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, getMe);
router.post('/auth/register-public-key', requireAuth, registerPublicKey);

// ==========================================
// 2. Water & Sensor Telemetry Routes
// ==========================================
router.get('/water-sources', getWaterSources);
router.get('/sensors', getSensors);
router.get('/sensors/:id/history', getSensorHistory);
router.post('/telemetry', ingestTelemetry);

// ==========================================
// 3. Symptom Surveillance Routes
// ==========================================
router.get('/symptoms', getSymptoms);
router.post('/symptoms', optionalAuth, createSymptomReport);
router.get('/symptoms/clusters', getSymptomClusters);

// ==========================================
// 3b. ASHA Field Surveillance & Proxy Reports
// ==========================================
router.post('/asha/proxy-report', requireAuth, requireRole('health_worker', 'district_admin', 'government'), submitAshaProxyReport);
router.get('/asha/my-reports', requireAuth, requireRole('health_worker', 'district_admin', 'government'), getMyAshaReports);
router.patch('/asha/reports/:id/status', requireAuth, requireRole('health_worker', 'district_admin', 'government'), updateAshaReportStatus);

// ==========================================
// 4. Alert & Public Health Advisory Routes
// ==========================================
router.get('/alerts', getAlerts);
router.patch('/alerts/:id/status', optionalAuth, updateAlertStatus);
router.get('/advisories', getAdvisories);
router.post('/advisories', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government'), createAdvisory);
router.post('/alerts/advisory', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government'), createAdvisory);
router.get('/interventions', getInterventions);
router.post('/interventions', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government', 'health_worker'), createIntervention);

// ==========================================
// 5. Health Chat Assistant (Llama Triage)
// ==========================================
router.post('/health-chat', optionalAuth, handleHealthChat);

// ==========================================
// 6. Continuous Learning Consultations
// ==========================================
router.post('/consultations/save', optionalAuth, saveConsultation);
router.get('/consultations', getConsultations);
router.patch('/consultations/:id/verify', optionalAuth, verifyConsultation);

// ==========================================
// 7. End-to-End Encrypted (E2EE) Citizen Reports
// ==========================================
router.post('/encrypted-reports/dispatch', optionalAuth, dispatchEncryptedReport);
router.get('/encrypted-reports/district-keys', getDistrictKeys);
router.get('/encrypted-reports', requireAuth, requireRole('district_admin', 'government'), getEncryptedReports);
router.patch('/encrypted-reports/:id/status', requireAuth, requireRole('district_admin', 'government'), updateEncryptedReportStatus);

// ==========================================
// 8. Simulation & Demo Lab Controls
// ==========================================
router.post('/simulation/trigger-spike', triggerBacterialSpike);
router.post('/simulation/trigger-chemical-shock', triggerChemicalShock);
router.post('/simulation/trigger-outbreak-wave', triggerOutbreakWave);
router.post('/simulation/reset', resetSimulation);

// ==========================================
// 9. Master Database Explorer & Unified Audit Console
// ==========================================
router.get('/admin/db/overview', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government'), getDatabaseOverview);
router.get('/admin/db/:table/export', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government'), exportTableData);
router.get('/admin/db/:table', requireAuth, requireRole('district_admin', 'district_health_admin', 'admin', 'government'), getTableRecords);

export default router;
