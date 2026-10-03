import { dbStore, haversineKm } from '../models/dbStore.js';
import { chatWithHealthAssistant } from '../services/mlClient.js';
import { isPostgresConnected, pool } from '../config/db.js';

export async function handleHealthChat(req, res) {
  try {
    const {
      message,
      language = 'en',
      latitude,
      longitude,
      stationId,
      history = [],
      image_base64
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string.'
      });
    }

    let nearestSource = null;
    let latestTelemetry = null;
    let activeAlerts = [];

    if (isPostgresConnected) {
      try {
        let sourceQuery = 'SELECT * FROM water_sources LIMIT 1';
        let sourceParams = [];

        if (stationId) {
          sourceQuery = 'SELECT * FROM water_sources WHERE id = $1';
          sourceParams = [stationId];
        } else if (latitude && longitude) {
          sourceQuery = `
            SELECT id, name, type, capacity_liters_day, population_served, status,
                   ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                   ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
            FROM water_sources
            ORDER BY distance_meters ASC
            LIMIT 1
          `;
          sourceParams = [longitude, latitude];
        }

        const sourceRes = await pool.query(sourceQuery, sourceParams);
        if (sourceRes.rows.length > 0) {
          nearestSource = sourceRes.rows[0];

          // Fetch latest sensor telemetry
          const telemRes = await pool.query(
            `SELECT t.*, s.node_uid
             FROM telemetry_readings t
             JOIN sensor_nodes s ON t.sensor_id = s.id
             WHERE s.source_id = $1
             ORDER BY t.recorded_at DESC
             LIMIT 1`,
            [nearestSource.id]
          );
          if (telemRes.rows.length > 0) {
            latestTelemetry = telemRes.rows[0];
          }

          // Fetch active alerts
          const alertRes = await pool.query(
            `SELECT id, alert_code, hazard_type, severity, recommended_action
             FROM contamination_alerts
             WHERE source_id = $1 AND status = 'active'
             ORDER BY created_at DESC`,
            [nearestSource.id]
          );
          activeAlerts = alertRes.rows;
        }
      } catch (dbErr) {
        // Fallback to in-memory store
      }
    }

    // In-memory fallback
    if (!nearestSource) {
      const sources = await dbStore.getWaterSources();
      if (stationId) {
        nearestSource = sources.find((s) => s.id === stationId);
      } else if (latitude && longitude) {
        let minDist = Infinity;
        for (const s of sources) {
          const d = haversineKm(latitude, longitude, s.latitude, s.longitude);
          if (d < minDist) {
            minDist = d;
            nearestSource = s;
          }
        }
      }

      if (!nearestSource) {
        nearestSource = sources[0] || {
          id: 'default',
          name: 'Kamrup Main Intake & Treatment Plant',
          latitude: 26.1850,
          longitude: 91.7500
        };
      }

      const allSensors = await dbStore.getSensors();
      const matchedSensor = allSensors.find((s) => s.source_id === nearestSource.id) || allSensors[0];
      if (matchedSensor) {
        latestTelemetry = matchedSensor.latest_telemetry;
      }

      const allAlerts = await dbStore.getAlerts();
      activeAlerts = allAlerts.filter((a) => a.source_id === nearestSource.id && a.status === 'active');
    }

    const payload = {
      message,
      language: ['en', 'bn', 'hi', 'as'].includes(language) ? language : 'en',
      location: latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : null,
      station_id: nearestSource?.id,
      station_name: nearestSource?.name || 'Regional Supply Grid',
      telemetry: latestTelemetry ? {
        ph: latestTelemetry.ph,
        turbidity: latestTelemetry.turbidity,
        tds: latestTelemetry.tds,
        orp: latestTelemetry.orp,
        wqi_score: latestTelemetry.wqi_score,
        wqi_grade: latestTelemetry.wqi_grade,
        is_anomalous: latestTelemetry.is_anomalous,
        anomaly_reasons: latestTelemetry.anomaly_reasons || []
      } : {
        ph: 7.2,
        turbidity: 0.8,
        tds: 160.0,
        orp: 690.0,
        wqi_score: 88,
        wqi_grade: 'Good',
        is_anomalous: false
      },
      active_alerts: activeAlerts,
      conversation_history: history,
      image_base64: image_base64 || null
    };

    const aiResult = await chatWithHealthAssistant(payload);

    return res.json({
      success: true,
      ...aiResult,
      station: {
        id: nearestSource?.id,
        name: nearestSource?.name,
        latitude: nearestSource?.latitude,
        longitude: nearestSource?.longitude
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to generate health assistant response: ${error.message}`
    });
  }
}
