import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { broadcastToClients } from '../sockets/socketHandler.js';

export async function getAlerts(req, res) {
  try {
    const { status, severity } = req.query;
    let list = [...dbStore.alerts];

    if (status) {
      list = list.filter((a) => a.status === status);
    }
    if (severity) {
      list = list.filter((a) => a.severity === severity);
    }

    const enrichedAlerts = list.map((alert) => {
      const source = dbStore.waterSources.find((w) => w.id === alert.source_id);
      const sensor = dbStore.sensors.find((s) => s.id === alert.sensor_id);
      return {
        ...alert,
        source_name: source?.name || 'Municipal Water Network',
        sensor_uid: sensor?.node_uid || null
      };
    });

    enrichedAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: enrichedAlerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateAlertStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const alert = dbStore.alerts.find((a) => a.id === id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    alert.status = status;
    if (status === 'resolved') {
      alert.resolved_at = new Date().toISOString();
      // Restore water source status
      const source = dbStore.waterSources.find((w) => w.id === alert.source_id);
      if (source) {
        source.status = 'operational';
      }
    }

    broadcastToClients('alert:updated', alert);
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAdvisories(req, res) {
  try {
    res.json({ success: true, data: dbStore.advisories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createAdvisory(req, res) {
  try {
    const {
      alert_id,
      title,
      advisory_type = 'boil_water_notice',
      severity = 'critical',
      message_content,
      content,
      details,
      action_recommendations,
      target_area_description,
      affected_district,
      target_zone,
      district,
      broadcast_channels = ['sms', 'dashboard', 'mobile_push', 'clinic_radio']
    } = req.body;

    const actualContent =
      message_content ||
      content ||
      details ||
      (Array.isArray(action_recommendations) ? action_recommendations.join('. ') : action_recommendations);

    const actualArea =
      target_area_description ||
      affected_district ||
      target_zone ||
      district ||
      'Regional Ward & Intake Community';

    if (!title || !actualContent) {
      return res.status(400).json({ success: false, error: 'Title and message_content required' });
    }

    const advisory = {
      id: uuidv4(),
      alert_id: alert_id || null,
      title,
      advisory_type,
      severity,
      broadcast_channels: Array.isArray(broadcast_channels) ? broadcast_channels : ['sms', 'dashboard', 'mobile_push'],
      message_content: actualContent,
      target_area_description: actualArea,
      action_recommendations: Array.isArray(action_recommendations)
        ? action_recommendations
        : [actualContent],
      issued_by: req.user ? { id: req.user.id, name: req.user.full_name, role: req.user.role } : null,
      is_active: true,
      issued_at: new Date().toISOString()
    };

    dbStore.advisories.unshift(advisory);
    broadcastToClients('advisory:new', advisory);

    res.status(201).json({
      success: true,
      message: 'Emergency public health advisory successfully broadcast across regional channels.',
      data: advisory
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getInterventions(req, res) {
  try {
    res.json({ success: true, data: dbStore.interventions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createIntervention(req, res) {
  try {
    const { alert_id, action_type, assigned_team, notes } = req.body;
    const intervention = {
      id: uuidv4(),
      alert_id,
      action_type: action_type || 'superchlorination_dose',
      assigned_team: assigned_team || 'Municipal Water Rapid Response',
      status: 'dispatched',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    dbStore.interventions.unshift(intervention);
    broadcastToClients('intervention:new', intervention);

    res.status(201).json({ success: true, data: intervention });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
