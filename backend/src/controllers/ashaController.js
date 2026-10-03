import { v4 as uuidv4 } from 'uuid';
import { dbStore, haversineKm } from '../models/dbStore.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

/**
 * Submit an ASHA field proxy surveillance report on behalf of a household/citizen.
 */
export async function submitAshaProxyReport(req, res) {
  try {
    const {
      household_head_name,
      citizen_identifier,
      village_ward,
      affected_count = 1,
      vulnerable_age_flags = [],
      patient_age_group = 'adult_18_59',
      patient_gender = 'unspecified',
      symptoms = [],
      suspected_disease = 'acute_gastroenteritis',
      severity = 'moderate',
      urgency_level = 'routine',
      emergency_cluster_flag = false,
      field_intervention = 'none',
      suspected_water_source_id,
      latitude,
      longitude,
      notes = ''
    } = req.body;

    if (!symptoms || !symptoms.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one symptom must be specified for field intake.'
      });
    }

    const ashaUser = req.user || {};
    const district = ashaUser.district || 'Kamrup Metro';
    const state = ashaUser.state || 'Assam';

    // Resolve geographic coordinates
    let lat = latitude ? Number(latitude) : 26.1580;
    let lon = longitude ? Number(longitude) : 91.7820;

    // Find linked or nearest water source
    let linkedSource = null;
    if (suspected_water_source_id) {
      linkedSource = dbStore.waterSources.find((w) => w.id === suspected_water_source_id);
    }
    if (!linkedSource && dbStore.waterSources.length > 0) {
      let minDistance = Infinity;
      for (const source of dbStore.waterSources) {
        const dist = haversineKm(lat, lon, source.latitude, source.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          linkedSource = source;
        }
      }
    }

    const reportData = {
      id: uuidv4(),
      registered_by_asha_id: ashaUser.id || null,
      asha_name: ashaUser.full_name || 'ASHA Field Worker',
      household_head_name: household_head_name || citizen_identifier || 'Village Household Intake',
      village_ward: village_ward || 'Ward 14 (Dispur)',
      affected_count: Number(affected_count) || 1,
      vulnerable_age_flags: Array.isArray(vulnerable_age_flags) ? vulnerable_age_flags : [],
      patient_age_group,
      patient_gender,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      suspected_disease,
      severity,
      urgency_level,
      emergency_cluster_flag: Boolean(emergency_cluster_flag || urgency_level === 'critical_emergency'),
      field_intervention,
      suspected_water_source_id: linkedSource?.id || suspected_water_source_id || null,
      water_source_id: linkedSource?.id || null,
      district,
      state,
      latitude: lat,
      longitude: lon,
      notes,
      status: (emergency_cluster_flag || urgency_level === 'critical_emergency') ? 'investigating' : 'logged',
      reported_at: new Date().toISOString()
    };

    const savedReport = await dbStore.saveAshaProxyReport(reportData);

    // If marked as critical or emergency cluster, generate an immediate triage alert for District Admin
    if (savedReport.emergency_cluster_flag || urgency_level === 'critical_emergency') {
      const emergencyAlert = {
        id: uuidv4(),
        water_source_id: linkedSource?.id || null,
        sensor_id: linkedSource ? dbStore.sensors.find((s) => s.source_id === linkedSource.id)?.id : null,
        title: `🚨 Emergency Cluster Flag: ${savedReport.household_head_name} (${savedReport.village_ward})`,
        alert_type: 'outbreak_cluster',
        severity: 'critical',
        status: 'active',
        affected_population: (savedReport.affected_count || 1) * 250,
        population_at_risk: 4500,
        location_description: `${savedReport.village_ward}, ${district} &bull; Reported by ASHA ${savedReport.asha_name}`,
        trigger_explanation: `ASHA Field Worker ${savedReport.asha_name} reported ${savedReport.affected_count} family members with acute ${savedReport.symptoms.join(', ')}. Field Action: ${savedReport.field_intervention}. Immediate chlorination dispatch requested.`,
        recommended_action: 'Dispatch mobile chlorination team & deploy field ASHA rapid rehydration unit.',
        triggered_at: new Date().toISOString()
      };

      dbStore.alerts.unshift(emergencyAlert);
      broadcastToClients('alert:new', emergencyAlert);
    }

    // Broadcast live surveillance feed updates
    broadcastToClients('symptom:new', savedReport);
    broadcastToClients('asha:report:new', savedReport);

    res.status(201).json({
      success: true,
      message: 'ASHA field proxy report logged and synchronized to regional surveillance grid.',
      data: savedReport
    });
  } catch (err) {
    console.error('Failed to submit ASHA proxy report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Fetch all reports submitted by the authenticated ASHA worker.
 */
export async function getMyAshaReports(req, res) {
  try {
    const ashaId = req.user?.id;
    const reports = await dbStore.getAshaReports(ashaId);
    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Update the status of an ASHA field report (e.g., investigating -> resolved).
 */
export async function updateAshaReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = dbStore.symptoms.find((s) => s.id === id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    report.status = status;
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
