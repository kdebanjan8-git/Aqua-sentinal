import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { pool, isPostgresConnected } from '../config/db.js';

export async function saveConsultation(req, res) {
  try {
    const {
      latitude = 26.1850,
      longitude = 91.7500,
      district = 'Kamrup Metro',
      state = 'Assam',
      reported_symptoms = [],
      suspected_condition = 'acute_gastroenteritis',
      severity = 'moderate',
      visual_cue_findings = null,
      ambient_telemetry_snapshot = {},
      final_advice = 'Hydrate with ORS and boil drinking water.'
    } = req.body;

    const consultationId = uuidv4();
    const userId = req.user?.id || null;
    const createdAt = new Date().toISOString();

    let saved = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        `INSERT INTO chat_consultations (
          id, user_id, location, latitude, longitude, district, state,
          reported_symptoms, suspected_condition, severity, visual_cue_findings,
          ambient_telemetry_snapshot, final_advice, is_verified, created_at
        ) VALUES (
          $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $4, $3, $5, $6,
          $7, $8, $9, $10,
          $11, $12, FALSE, $13
        ) RETURNING *`,
        [
          consultationId,
          userId,
          Number(longitude),
          Number(latitude),
          district,
          state,
          reported_symptoms,
          suspected_condition,
          severity,
          visual_cue_findings,
          JSON.stringify(ambient_telemetry_snapshot),
          final_advice,
          createdAt
        ]
      );
      saved = result.rows[0];
    } else {
      saved = await dbStore.saveConsultation({
        id: consultationId,
        user_id: userId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        district,
        state,
        reported_symptoms,
        suspected_condition,
        severity,
        visual_cue_findings,
        ambient_telemetry_snapshot,
        final_advice,
        is_verified: false,
        created_at: createdAt
      });
    }

    // Broadcast live assessment via socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('consultation:logged', {
        id: saved.id,
        district: saved.district,
        severity: saved.severity,
        suspected_condition: saved.suspected_condition,
        created_at: saved.created_at
      });

      if (['high', 'critical'].includes(saved.severity)) {
        io.emit('surveillance:high_risk_flag', {
          id: saved.id,
          location: { latitude: saved.latitude, longitude: saved.longitude },
          severity: saved.severity,
          condition: saved.suspected_condition,
          timestamp: saved.created_at
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Assessment saved to regional health registry for continuous surveillance.',
      data: saved
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to save consultation: ${error.message}`
    });
  }
}

export async function getConsultations(req, res) {
  try {
    const { is_verified, district, limit = 50 } = req.query;

    if (isPostgresConnected) {
      let query = 'SELECT * FROM chat_consultations';
      const params = [];
      const conditions = [];

      if (is_verified !== undefined) {
        params.push(is_verified === 'true');
        conditions.push(`is_verified = $${params.length}`);
      }

      if (district) {
        params.push(district);
        conditions.push(`district ILIKE $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);
      return res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } else {
      const filter = {};
      if (is_verified !== undefined) {
        filter.is_verified = is_verified === 'true';
      }
      if (district) {
        filter.district = district;
      }
      const list = await dbStore.getConsultations(filter);
      return res.json({
        success: true,
        count: list.length,
        data: list.slice(0, Number(limit))
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to retrieve consultations: ${error.message}`
    });
  }
}

export async function verifyConsultation(req, res) {
  try {
    const { id } = req.params;
    const verifiedBy = req.user?.id || null;
    const verifiedAt = new Date().toISOString();

    let updated = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        `UPDATE chat_consultations
         SET is_verified = TRUE, verified_by = $1, verified_at = $2
         WHERE id = $3
         RETURNING *`,
        [verifiedBy, verifiedAt, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Consultation record not found.' });
      }
      updated = result.rows[0];
    } else {
      updated = await dbStore.verifyConsultation(id, verifiedBy);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Consultation record not found.' });
      }
    }

    return res.json({
      success: true,
      message: 'Consultation successfully verified for ML retraining pipeline.',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to verify consultation: ${error.message}`
    });
  }
}
