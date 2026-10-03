import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { detectAnomalyWithML } from '../services/mlClient.js';
import { processTelemetryAlerts } from '../services/alertService.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

export async function getWaterSources(req, res) {
  try {
    const sourcesWithSensors = dbStore.waterSources.map((source) => {
      const sourceSensors = dbStore.sensors.filter((s) => s.source_id === source.id);
      const activeAlerts = dbStore.alerts.filter((a) => a.source_id === source.id && a.status === 'active');
      return {
        ...source,
        sensors: sourceSensors,
        has_active_alert: activeAlerts.length > 0,
        active_alert_severity: activeAlerts[0]?.severity || null
      };
    });
    res.json({ success: true, data: sourcesWithSensors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSensors(req, res) {
  try {
    const sensorsWithLatest = dbStore.sensors.map((sensor) => {
      const readings = dbStore.telemetry.filter((t) => t.sensor_id === sensor.id);
      const latestTelemetry = readings.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0] || null;
      const parentSource = dbStore.waterSources.find((w) => w.id === sensor.source_id);
      return {
        ...sensor,
        source_name: parentSource?.name || 'Unknown Source',
        latest_telemetry: latestTelemetry
      };
    });
    res.json({ success: true, data: sensorsWithSensors(sensorsWithLatest) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function sensorsWithSensors(list) {
  return list;
}

export async function getSensorHistory(req, res) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);
    const readings = dbStore.telemetry
      .filter((t) => t.sensor_id === id)
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
      .slice(-limit);

    res.json({ success: true, data: readings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function ingestTelemetry(req, res) {
  try {
    const {
      sensor_id,
      ph,
      turbidity,
      tds,
      orp,
      temperature = 25.0,
      dissolved_oxygen = 7.5,
      free_chlorine = 0.5,
      conductivity = 400.0
    } = req.body;

    if (!sensor_id || ph === undefined || turbidity === undefined || tds === undefined || orp === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sensor_id, ph, turbidity, tds, orp'
      });
    }

    const sensor = dbStore.sensors.find((s) => s.id === sensor_id || s.node_uid === sensor_id);
    if (!sensor) {
      return res.status(404).json({ success: false, error: `Sensor ${sensor_id} not found` });
    }

    // Call ML anomaly detection
    const mlPayload = {
      sensor_id: sensor.id,
      ph: Number(ph),
      turbidity: Number(turbidity),
      tds: Number(tds),
      orp: Number(orp),
      temperature: Number(temperature),
      dissolved_oxygen: Number(dissolved_oxygen),
      free_chlorine: Number(free_chlorine),
      conductivity: Number(conductivity)
    };

    const mlResult = await detectAnomalyWithML(mlPayload);

    // Save telemetry reading
    const reading = {
      id: uuidv4(),
      sensor_id: sensor.id,
      ph: mlPayload.ph,
      turbidity: mlPayload.turbidity,
      tds: mlPayload.tds,
      orp: mlPayload.orp,
      temperature: mlPayload.temperature,
      dissolved_oxygen: mlPayload.dissolved_oxygen,
      free_chlorine: mlPayload.free_chlorine,
      conductivity: mlPayload.conductivity,
      wqi_score: mlResult.wqi?.score || 80.0,
      wqi_grade: mlResult.wqi?.grade || 'Good',
      is_anomalous: mlResult.is_anomalous,
      anomaly_confidence: mlResult.confidence,
      anomaly_reasons: mlResult.anomaly_reasons || [],
      recorded_at: new Date().toISOString()
    };

    dbStore.telemetry.push(reading);
    sensor.last_ping = reading.recorded_at;

    // Process alerts
    const alert = await processTelemetryAlerts(sensor, reading, mlResult);

    // Real-time broadcast
    broadcastToClients('telemetry:new', {
      reading,
      sensor,
      mlResult,
      alert
    });

    res.status(201).json({
      success: true,
      data: {
        reading,
        mlResult,
        alert
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
