import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { pool, isPostgresConnected } from '../config/db.js';

export async function dispatchEncryptedReport(req, res) {
  try {
    const {
      recipient_district = 'Kamrup Metro',
      recipient_admin_id = null,
      encrypted_payload,
      encrypted_symmetric_key,
      iv
    } = req.body;

    if (!encrypted_payload || !encrypted_symmetric_key || !iv) {
      return res.status(400).json({
        success: false,
        error: 'Missing required cryptographic fields (encrypted_payload, encrypted_symmetric_key, iv).'
      });
    }

    const reportId = uuidv4();
    const senderId = req.user?.id || null;
    const createdAt = new Date().toISOString();

    let saved = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        `INSERT INTO encrypted_citizen_reports (
          id, sender_id, recipient_district, recipient_admin_id,
          encrypted_payload, encrypted_symmetric_key, iv, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'unread', $8)
        RETURNING *`,
        [
          reportId,
          senderId,
          recipient_district,
          recipient_admin_id,
          encrypted_payload,
          encrypted_symmetric_key,
          iv,
          createdAt
        ]
      );
      saved = result.rows[0];
    } else {
      saved = await dbStore.saveEncryptedReport({
        id: reportId,
        sender_id: senderId,
        recipient_district,
        recipient_admin_id,
        encrypted_payload,
        encrypted_symmetric_key,
        iv,
        status: 'unread',
        created_at: createdAt
      });
    }

    // Broadcast real-time encrypted dispatch notification to district admin sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('encrypted_report:received', {
        id: saved.id,
        recipient_district: saved.recipient_district,
        status: saved.status,
        created_at: saved.created_at
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Confidential report securely encrypted and dispatched to district authorities.',
      data: saved
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to dispatch encrypted report: ${error.message}`
    });
  }
}

export async function getEncryptedReports(req, res) {
  try {
    const { district, status } = req.query;
    // Admins default to their assigned district if not explicitly requested
    const targetDistrict = district || req.user?.district || null;

    if (isPostgresConnected) {
      let query = 'SELECT * FROM encrypted_citizen_reports';
      const params = [];
      const conditions = [];

      if (targetDistrict) {
        params.push(targetDistrict);
        conditions.push(`recipient_district ILIKE $${params.length}`);
      }

      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      return res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } else {
      const filter = {};
      if (targetDistrict) filter.recipient_district = targetDistrict;
      if (status) filter.status = status;

      const list = await dbStore.getEncryptedReports(filter);
      return res.json({
        success: true,
        count: list.length,
        data: list
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to fetch encrypted reports: ${error.message}`
    });
  }
}

export async function updateEncryptedReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['unread', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: unread, investigating, resolved.'
      });
    }

    let updated = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        `UPDATE encrypted_citizen_reports
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found.' });
      }
      updated = result.rows[0];
    } else {
      updated = await dbStore.updateEncryptedReportStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Report not found.' });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('encrypted_report:status_updated', {
        id: updated.id,
        status: updated.status
      });
    }

    return res.json({
      success: true,
      message: `Report status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to update report status: ${error.message}`
    });
  }
}

export async function getDistrictKeys(req, res) {
  try {
    const { district } = req.query;

    if (isPostgresConnected) {
      let query = `
        SELECT id, full_name, email, district, state, public_key, key_fingerprint
        FROM users
        WHERE role IN ('district_admin', 'government') AND public_key IS NOT NULL
      `;
      const params = [];
      if (district) {
        params.push(district);
        query += ` AND (district ILIKE $1 OR district IS NULL)`;
      }

      const result = await pool.query(query, params);
      return res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } else {
      const admins = await dbStore.getDistrictAdmins(district);
      return res.json({
        success: true,
        count: admins.length,
        data: admins
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to retrieve district public keys: ${error.message}`
    });
  }
}

export async function registerPublicKey(req, res) {
  try {
    const userId = req.user.id;
    const { public_key, key_fingerprint } = req.body;

    if (!public_key || !key_fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Both public_key and key_fingerprint are required.'
      });
    }

    if (isPostgresConnected) {
      const result = await pool.query(
        `UPDATE users
         SET public_key = $1, key_fingerprint = $2
         WHERE id = $3
         RETURNING id, full_name, email, role, district, public_key, key_fingerprint`,
        [public_key, key_fingerprint, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      return res.json({
        success: true,
        message: 'Public key successfully registered for official dispatch.',
        data: result.rows[0]
      });
    } else {
      const updated = await dbStore.updateUserPublicKey(userId, public_key, key_fingerprint);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      return res.json({
        success: true,
        message: 'Public key successfully registered for official dispatch.',
        data: {
          id: updated.id,
          full_name: updated.full_name,
          email: updated.email,
          role: updated.role,
          district: updated.district,
          public_key: updated.public_key,
          key_fingerprint: updated.key_fingerprint
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to register public key: ${error.message}`
    });
  }
}
