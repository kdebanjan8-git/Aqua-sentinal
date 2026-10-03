import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { detectAnomalyWithML, correlateOutbreakWithML } from '../services/mlClient.js';
import { processTelemetryAlerts } from '../services/alertService.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

export async function triggerBacterialSpike(req, res) {
  try {
    const { sensor_id } = req.body;
    const targetSensor = sensor_id
      ? dbStore.sensors.find((s) => s.id === sensor_id || s.node_uid === sensor_id)
      : dbStore.sensors[0];

    if (!targetSensor) {
      return res.status(404).json({ success: false, error: 'Sensor not found' });
    }

    // Turbidity > 5.0 NTU safety limit (7.85 NTU)
    const spikeTelemetry = {
      sensor_id: targetSensor.id,
      ph: 6.35,
      turbidity: 7.85,
      tds: 380.0,
      orp: 410.0,
      temperature: 27.2,
      dissolved_oxygen: 3.8,
      free_chlorine: 0.02,
      conductivity: 520.0
    };

    const mlResult = await detectAnomalyWithML(spikeTelemetry);

    const reading = {
      id: uuidv4(),
      sensor_id: targetSensor.id,
      ...spikeTelemetry,
      wqi_score: mlResult.wqi?.score || 38.0,
      wqi_grade: mlResult.wqi?.grade || 'Poor',
      is_anomalous: true,
      anomaly_confidence: mlResult.confidence || 0.95,
      anomaly_reasons: mlResult.anomaly_reasons || ['Turbidity recorded at 7.85 NTU (Safety Limit: 5.0 NTU)'],
      recorded_at: new Date().toISOString()
    };

    dbStore.telemetry.push(reading);
    targetSensor.last_ping = reading.recorded_at;

    const alert = await processTelemetryAlerts(targetSensor, reading, mlResult);

    broadcastToClients('telemetry:new', {
      reading,
      sensor: targetSensor,
      mlResult,
      alert
    });

    res.json({
      success: true,
      message: `Injected bacterial contamination spike into ${targetSensor.node_uid} (Turbidity: 7.85 NTU > 5.0 NTU limit)`,
      data: { reading, alert }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function triggerChemicalShock(req, res) {
  try {
    const { sensor_id } = req.body;
    const targetSensor = sensor_id
      ? dbStore.sensors.find((s) => s.id === sensor_id || s.node_uid === sensor_id)
      : dbStore.sensors[1];

    if (!targetSensor) {
      return res.status(404).json({ success: false, error: 'Sensor not found' });
    }

    // pH < 6.5 limit (5.40) and TDS > 500 ppm limit (820 ppm)
    const shockTelemetry = {
      sensor_id: targetSensor.id,
      ph: 5.40,
      turbidity: 2.10,
      tds: 820.0,
      orp: 590.0,
      temperature: 25.0,
      dissolved_oxygen: 5.5,
      free_chlorine: 0.10,
      conductivity: 1100.0
    };

    const mlResult = await detectAnomalyWithML(shockTelemetry);

    const reading = {
      id: uuidv4(),
      sensor_id: targetSensor.id,
      ...shockTelemetry,
      wqi_score: mlResult.wqi?.score || 48.0,
      wqi_grade: mlResult.wqi?.grade || 'Poor',
      is_anomalous: true,
      anomaly_confidence: mlResult.confidence || 0.95,
      anomaly_reasons: mlResult.anomaly_reasons || ['pH recorded at 5.40 (Permissible Range: 6.5 - 8.5)', 'TDS recorded at 820.0 ppm (Limit: 500.0 ppm)'],
      recorded_at: new Date().toISOString()
    };

    dbStore.telemetry.push(reading);
    targetSensor.last_ping = reading.recorded_at;

    const alert = await processTelemetryAlerts(targetSensor, reading, mlResult);

    broadcastToClients('telemetry:new', {
      reading,
      sensor: targetSensor,
      mlResult,
      alert
    });

    res.json({
      success: true,
      message: `Injected chemical shock into ${targetSensor.node_uid} (pH: 5.40 < 6.5, TDS: 820 ppm > 500 ppm)`,
      data: { reading, alert }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function triggerOutbreakWave(req, res) {
  try {
    const targetSource = dbStore.waterSources[2] || dbStore.waterSources[0]; // Aizawl North or Kamrup
    const parentSensor = dbStore.sensors.find((s) => s.source_id === targetSource.id) || dbStore.sensors[0];

    // Inject 6 clinical cases clustered within 1.5 km of target station (> 5 case cluster threshold)
    const outbreakReports = [
      {
        id: uuidv4(),
        reporter_type: 'clinic_staff',
        patient_identifier: `KMP-CLINIC-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'child_6_17',
        patient_gender: 'female',
        symptoms: ['watery_diarrhea', 'vomiting', 'fever'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'severe',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude + 0.003,
        longitude: targetSource.longitude + 0.002,
        notes: 'Child presented with acute rice-water diarrhea and dehydration',
        reported_at: new Date(Date.now() - 40 * 60000).toISOString()
      },
      {
        id: uuidv4(),
        reporter_type: 'clinic_staff',
        patient_identifier: `KMP-CLINIC-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'adult_18_59',
        patient_gender: 'male',
        symptoms: ['watery_diarrhea', 'abdominal_cramps'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'moderate',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude - 0.002,
        longitude: targetSource.longitude + 0.003,
        notes: 'Resident reporting acute diarrhea after drinking municipal tap water',
        reported_at: new Date(Date.now() - 30 * 60000).toISOString()
      },
      {
        id: uuidv4(),
        reporter_type: 'community_health_worker',
        patient_identifier: `KMP-ASHA-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'infant_0_5',
        patient_gender: 'male',
        symptoms: ['watery_diarrhea', 'vomiting', 'severe_dehydration'],
        suspected_disease: 'cholera',
        severity: 'critical',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude + 0.004,
        longitude: targetSource.longitude - 0.002,
        notes: 'ASHA worker emergency referral for infant IV hydration',
        reported_at: new Date(Date.now() - 25 * 60000).toISOString()
      },
      {
        id: uuidv4(),
        reporter_type: 'clinic_staff',
        patient_identifier: `KMP-CLINIC-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'senior_60_plus',
        patient_gender: 'female',
        symptoms: ['watery_diarrhea', 'vomiting'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'severe',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude - 0.003,
        longitude: targetSource.longitude - 0.003,
        notes: 'Elderly patient with gastroenteritis and dehydration',
        reported_at: new Date(Date.now() - 20 * 60000).toISOString()
      },
      {
        id: uuidv4(),
        reporter_type: 'citizen',
        patient_identifier: `KMP-CITIZEN-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'adult_18_59',
        patient_gender: 'female',
        symptoms: ['watery_diarrhea', 'fever'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'moderate',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude + 0.001,
        longitude: targetSource.longitude + 0.004,
        notes: 'Neighborhood cluster report',
        reported_at: new Date(Date.now() - 15 * 60000).toISOString()
      },
      {
        id: uuidv4(),
        reporter_type: 'clinic_staff',
        patient_identifier: `KMP-CLINIC-${Math.floor(100 + Math.random() * 900)}`,
        patient_age_group: 'child_6_17',
        patient_gender: 'male',
        symptoms: ['watery_diarrhea', 'vomiting'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'severe',
        water_source_id: targetSource.id,
        latitude: targetSource.latitude + 0.002,
        longitude: targetSource.longitude - 0.001,
        notes: 'School student presenting acute vomiting and watery stool',
        reported_at: new Date(Date.now() - 5 * 60000).toISOString()
      }
    ];

    for (const r of outbreakReports) {
      dbStore.symptoms.unshift(r);
    }

    // Correlate outbreak cluster
    const clusterAlert = {
      id: uuidv4(),
      alert_code: `ALR-CLUSTER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      source_id: targetSource.id,
      source_name: targetSource.name,
      sensor_id: parentSensor?.id || null,
      hazard_type: 'community_symptom_cluster',
      severity: 'critical',
      confidence_score: 0.95,
      affected_center: [targetSource.latitude, targetSource.longitude],
      radius_km: 2.0,
      population_at_risk: targetSource.population_served,
      symptom_correlation_count: 6,
      trigger_explanation: `Cluster Detected: 6 Diarrhea cases reported near ${targetSource.name} within 2.0 km (Threshold: > 5 cases)`,
      trigger_telemetry_snapshot: {
        ph: 7.15,
        turbidity: 0.65,
        orp: 705.0,
        wqi: 90.0
      },
      recommended_action: 'Broadcast Boil Water Advisory & Deploy Mobile Medical Team',
      status: 'active',
      created_at: new Date().toISOString()
    };

    dbStore.alerts.unshift(clusterAlert);
    targetSource.status = 'critical';

    broadcastToClients('alert:new', clusterAlert);
    broadcastToClients('symptom:bulk', outbreakReports);

    res.json({
      success: true,
      message: `Injected 6 clinical cases (> 5 case cluster threshold within 2.0 km of ${targetSource.name})`,
      data: { alert: clusterAlert, cases: outbreakReports }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function resetSimulation(req, res) {
  try {
    dbStore.reset();

    broadcastToClients('simulation:reset', {
      message: 'Surveillance grid restored to clean baseline state.',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Simulation reset. Dashboard restored to clean nominal state (0 alerts, all nodes safe).'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
