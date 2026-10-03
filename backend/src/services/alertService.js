import { v4 as uuidv4 } from 'uuid';
import { dbStore, haversineKm } from '../models/dbStore.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

export function buildHumanReadableExplanation(sourceName, telemetry, mlResult) {
  if (telemetry.turbidity > 5.0 && (telemetry.ph < 6.5 || telemetry.ph > 8.5)) {
    return `${sourceName}: Turbidity recorded at ${telemetry.turbidity.toFixed(2)} NTU (Limit: 5.0 NTU) & pH at ${telemetry.ph.toFixed(2)} (Safe Range: 6.5 - 8.5)`;
  }
  if (telemetry.turbidity > 5.0) {
    return `${sourceName}: Turbidity recorded at ${telemetry.turbidity.toFixed(2)} NTU (Safety Limit: 5.0 NTU - High suspended matter/microbial risk)`;
  }
  if (telemetry.ph < 6.5) {
    return `${sourceName}: Acidic shift detected at pH ${telemetry.ph.toFixed(2)} (Permissible Range: 6.5 - 8.5)`;
  }
  if (telemetry.ph > 8.5) {
    return `${sourceName}: Alkaline spike detected at pH ${telemetry.ph.toFixed(2)} (Permissible Range: 6.5 - 8.5)`;
  }
  if (telemetry.tds > 500.0) {
    return `${sourceName}: TDS recorded at ${telemetry.tds.toFixed(1)} ppm (Permissible Limit: 500.0 ppm)`;
  }
  return mlResult?.anomaly_reasons?.[0] || `${sourceName}: Water quality parameter breach detected.`;
}

export async function processTelemetryAlerts(sensor, telemetry, mlResult) {
  if (!mlResult.is_anomalous && mlResult.severity === 'normal') {
    return null;
  }

  const waterSource = dbStore.waterSources.find((ws) => ws.id === sensor.source_id);
  const sourceName = waterSource ? waterSource.name : 'Municipal Station';
  const existingAlert = dbStore.alerts.find(
    (a) => a.source_id === sensor.source_id && a.status === 'active'
  );

  const alertCode = `ALR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  // Find symptoms near this source to calculate correlation
  const nearbySymptoms = dbStore.symptoms.filter((s) => {
    if (s.water_source_id === sensor.source_id) return true;
    if (waterSource && s.latitude && s.longitude) {
      return haversineKm(waterSource.latitude, waterSource.longitude, s.latitude, s.longitude) <= 2.0;
    }
    return false;
  });

  const triggerExplanation = buildHumanReadableExplanation(sourceName, telemetry, mlResult);

  const alertData = {
    id: existingAlert ? existingAlert.id : uuidv4(),
    alert_code: existingAlert ? existingAlert.alert_code : alertCode,
    source_id: sensor.source_id,
    source_name: sourceName,
    sensor_id: sensor.id,
    hazard_type: mlResult.hazard_type || 'turbidity_spike',
    severity: mlResult.severity || 'high',
    confidence_score: mlResult.confidence || 0.95,
    affected_center: [sensor.latitude, sensor.longitude],
    radius_km: 2.0,
    population_at_risk: waterSource ? waterSource.population_served : 15000,
    symptom_correlation_count: nearbySymptoms.length,
    trigger_explanation: triggerExplanation,
    trigger_telemetry_snapshot: {
      ph: telemetry.ph,
      turbidity: telemetry.turbidity,
      tds: telemetry.tds,
      orp: telemetry.orp,
      wqi: mlResult.wqi?.score
    },
    recommended_action: mlResult.recommended_actions?.[0] || 'Issue Boil Water Notice & Inspect Filtration',
    status: 'active',
    created_at: existingAlert ? existingAlert.created_at : new Date().toISOString()
  };

  if (existingAlert) {
    Object.assign(existingAlert, alertData);
  } else {
    dbStore.alerts.unshift(alertData);
  }

  // Update water source status if critical
  if (waterSource) {
    waterSource.status = mlResult.severity === 'critical' ? 'critical' : 'warning';
  }

  // Broadcast to all connected WebSockets
  broadcastToClients('alert:new', alertData);

  return alertData;
}
