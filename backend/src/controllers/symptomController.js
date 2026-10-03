import { v4 as uuidv4 } from 'uuid';
import { dbStore, haversineKm } from '../models/dbStore.js';
import { correlateOutbreakWithML } from '../services/mlClient.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

export async function getSymptoms(req, res) {
  try {
    const { disease, severity, limit = '100' } = req.query;
    let list = [...dbStore.symptoms];

    if (disease) {
      list = list.filter((s) => s.suspected_disease === disease);
    }
    if (severity) {
      list = list.filter((s) => s.severity === severity);
    }

    list.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
    res.json({ success: true, data: list.slice(0, parseInt(limit, 10)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createSymptomReport(req, res) {
  try {
    const {
      reporter_type = 'clinic_staff',
      patient_identifier = `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      patient_age_group = 'adult_18_59',
      patient_gender = 'unspecified',
      symptoms = [],
      suspected_disease = 'acute_gastroenteritis',
      severity = 'moderate',
      latitude,
      longitude,
      notes = ''
    } = req.body;

    if (!latitude || !longitude || !symptoms.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: latitude, longitude, symptoms array'
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    // Associate with closest water source
    let nearestSource = null;
    let minDistance = Infinity;

    for (const source of dbStore.waterSources) {
      const dist = haversineKm(lat, lon, source.latitude, source.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestSource = source;
      }
    }

    const newReport = {
      id: uuidv4(),
      reporter_type,
      patient_identifier,
      patient_age_group,
      patient_gender,
      symptoms,
      suspected_disease,
      severity,
      water_source_id: nearestSource ? nearestSource.id : null,
      latitude: lat,
      longitude: lon,
      notes,
      reported_at: new Date().toISOString()
    };

    dbStore.symptoms.unshift(newReport);

    // Trigger Outbreak Correlation check if near a water source (2.0 km radius)
    let correlationResult = null;
    if (nearestSource) {
      const parentSensor = dbStore.sensors.find((s) => s.source_id === nearestSource.id);
      const latestTelemetry = parentSensor
        ? dbStore.telemetry
            .filter((t) => t.sensor_id === parentSensor.id)
            .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0]
        : {
            ph: 7.2,
            turbidity: 0.8,
            tds: 150.0,
            orp: 680.0,
            wqi_score: 88.0
          };

      const nearbyReports = dbStore.symptoms.filter((s) => {
        return haversineKm(nearestSource.latitude, nearestSource.longitude, s.latitude, s.longitude) <= 2.0;
      });

      // Check if cluster threshold exceeded (> 5 cases in 2.0 km)
      if (nearbyReports.length > 5) {
        correlationResult = await correlateOutbreakWithML({
          water_source: {
            id: nearestSource.id,
            name: nearestSource.name,
            type: nearestSource.type,
            location: { latitude: nearestSource.latitude, longitude: nearestSource.longitude },
            population_served: nearestSource.population_served
          },
          latest_telemetry: {
            ph: latestTelemetry.ph,
            turbidity: latestTelemetry.turbidity,
            tds: latestTelemetry.tds,
            orp: latestTelemetry.orp,
            temperature: latestTelemetry.temperature || 25.0
          },
          symptom_reports: nearbyReports.map((r) => ({
            id: r.id,
            patient_age_group: r.patient_age_group,
            symptoms: r.symptoms,
            severity: r.severity,
            location: { latitude: r.latitude, longitude: r.longitude }
          })),
          radius_km: 2.0,
          time_window_hours: 72
        });

        const alertCode = `ALR-CLUSTER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const existingAlert = dbStore.alerts.find(
          (a) => a.source_id === nearestSource.id && a.status === 'active'
        );

        const alertPayload = {
          id: existingAlert ? existingAlert.id : uuidv4(),
          alert_code: existingAlert ? existingAlert.alert_code : alertCode,
          source_id: nearestSource.id,
          source_name: nearestSource.name,
          sensor_id: parentSensor?.id || null,
          hazard_type: 'community_symptom_cluster',
          severity: 'critical',
          confidence_score: correlationResult?.risk_score || 0.95,
          affected_center: [nearestSource.latitude, nearestSource.longitude],
          radius_km: 2.0,
          population_at_risk: nearestSource.population_served,
          symptom_correlation_count: nearbyReports.length,
          trigger_explanation: `Cluster Detected: ${nearbyReports.length} Diarrhea cases reported near ${nearestSource.name} within 2.0 km (Threshold: > 5 cases)`,
          trigger_telemetry_snapshot: {
            ph: latestTelemetry.ph,
            turbidity: latestTelemetry.turbidity,
            orp: latestTelemetry.orp,
            wqi: latestTelemetry.wqi_score
          },
          recommended_action: 'Broadcast Boil Water Advisory & Deploy Mobile ORT Medical Unit',
          status: 'active',
          created_at: existingAlert ? existingAlert.created_at : new Date().toISOString()
        };

        if (existingAlert) {
          Object.assign(existingAlert, alertPayload);
        } else {
          dbStore.alerts.unshift(alertPayload);
        }

        nearestSource.status = 'critical';

        broadcastToClients('alert:new', alertPayload);
      }
    }

    // Broadcast new symptom to live maps
    broadcastToClients('symptom:new', {
      report: newReport,
      nearestSource: nearestSource?.name,
      correlationResult
    });

    res.status(201).json({
      success: true,
      data: {
        report: newReport,
        nearestSource: nearestSource?.name,
        distanceKm: nearestSource ? minDistance.toFixed(2) : null,
        correlationResult
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSymptomClusters(req, res) {
  try {
    const clusters = [];
    const visited = new Set();
    const thresholdRadiusKm = 2.0;

    for (let i = 0; i < dbStore.symptoms.length; i++) {
      if (visited.has(dbStore.symptoms[i].id)) continue;

      const base = dbStore.symptoms[i];
      const members = [base];
      visited.add(base.id);

      for (let j = i + 1; j < dbStore.symptoms.length; j++) {
        const candidate = dbStore.symptoms[j];
        if (visited.has(candidate.id)) continue;

        const dist = haversineKm(base.latitude, base.longitude, candidate.latitude, candidate.longitude);
        if (dist <= thresholdRadiusKm) {
          members.push(candidate);
          visited.add(candidate.id);
        }
      }

      if (members.length >= 1) {
        const avgLat = members.reduce((sum, m) => sum + m.latitude, 0) / members.length;
        const avgLon = members.reduce((sum, m) => sum + m.longitude, 0) / members.length;

        clusters.push({
          id: `cluster-${i + 1}`,
          center: [avgLat, avgLon],
          case_count: members.length,
          radius_km: thresholdRadiusKm,
          is_alert_threshold_breached: members.length > 5,
          primary_disease: members[0].suspected_disease,
          members
        });
      }
    }

    res.json({ success: true, data: clusters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
