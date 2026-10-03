import { dbStore } from '../models/dbStore.js';
import { pool, isPostgresConnected } from '../config/db.js';

// Table canonical name mapper
const TABLE_CONFIGS = {
  telemetry: {
    key: 'telemetry',
    dbTable: 'telemetry_readings',
    displayName: 'Water Sensor Telemetry',
    timestampField: 'recorded_at',
    searchFields: ['id', 'sensor_id', 'wqi_grade'],
    sanitizer: (r) => r
  },
  symptoms: {
    key: 'symptoms',
    dbTable: 'symptom_reports',
    displayName: 'ASHA & Symptom Surveillance',
    timestampField: 'reported_at',
    searchFields: ['patient_identifier', 'household_head_name', 'village_ward', 'suspected_disease', 'asha_name'],
    sanitizer: (r) => r
  },
  consultations: {
    key: 'consultations',
    dbTable: 'chat_consultations',
    displayName: 'AI Chat Consultations',
    timestampField: 'created_at',
    searchFields: ['district', 'state', 'suspected_condition', 'final_advice'],
    sanitizer: (r) => r
  },
  encrypted_reports: {
    key: 'encrypted_reports',
    dbTable: 'encrypted_citizen_reports',
    displayName: 'Encrypted Citizen Dispatches',
    timestampField: 'created_at',
    searchFields: ['id', 'recipient_district', 'status'],
    sanitizer: (r) => r
  },
  advisories: {
    key: 'advisories',
    dbTable: 'advisories',
    displayName: 'Broadcast Health Advisories',
    timestampField: 'created_at',
    searchFields: ['title', 'target_area_description', 'severity', 'advisory_type'],
    sanitizer: (r) => r
  },
  alerts: {
    key: 'alerts',
    dbTable: 'alerts',
    displayName: 'Active Outbreak Alerts',
    timestampField: 'triggered_at',
    searchFields: ['title', 'alert_type', 'location_description', 'trigger_explanation'],
    sanitizer: (r) => r
  },
  users: {
    key: 'users',
    dbTable: 'users',
    displayName: 'User & Authority Registry',
    timestampField: 'created_at',
    searchFields: ['full_name', 'email', 'role', 'district', 'state'],
    sanitizer: (u) => {
      const { password_hash, plain_password_fallback, ...sanitized } = u;
      return sanitized;
    }
  },
  sources: {
    key: 'sources',
    dbTable: 'water_sources',
    displayName: 'Monitored Water Sources',
    timestampField: 'created_at',
    searchFields: ['name', 'type', 'status'],
    sanitizer: (r) => r
  },
  sensors: {
    key: 'sensors',
    dbTable: 'sensor_nodes',
    displayName: 'IoT Grid Sensors',
    timestampField: 'last_ping',
    searchFields: ['node_uid', 'model', 'status'],
    sanitizer: (r) => r
  }
};

/**
 * Helper to convert array of JSON objects to RFC 4180 CSV
 */
function convertToCSV(data) {
  if (!data || !data.length) return '';

  // Extract all distinct keys
  const keys = Array.from(
    new Set(
      data.flatMap((item) => Object.keys(item))
    )
  );

  const headerRow = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(',');

  const rows = data.map((item) => {
    return keys
      .map((key) => {
        const val = item[key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * GET /api/admin/db/overview
 * Live row counts, latest timestamps, and status summaries across all core tables
 */
export async function getDatabaseOverview(req, res) {
  try {
    const overview = [];

    for (const [tableKey, config] of Object.entries(TABLE_CONFIGS)) {
      let count = 0;
      let latestRecord = null;
      let statusSummary = '';

      if (isPostgresConnected) {
        try {
          const countRes = await pool.query(`SELECT COUNT(*) FROM ${config.dbTable}`);
          count = parseInt(countRes.rows[0].count, 10);
          const latestRes = await pool.query(
            `SELECT * FROM ${config.dbTable} ORDER BY ${config.timestampField} DESC LIMIT 1`
          );
          latestRecord = latestRes.rows[0] ? config.sanitizer(latestRes.rows[0]) : null;
        } catch (e) {
          // Table might not exist yet in postgres, fallback to dbStore
          const list = dbStore[tableKey] || [];
          count = list.length;
          latestRecord = list[0] ? config.sanitizer(list[0]) : null;
        }
      } else {
        let list = [];
        if (tableKey === 'telemetry') list = dbStore.telemetry;
        else if (tableKey === 'symptoms') list = dbStore.symptoms;
        else if (tableKey === 'consultations') list = dbStore.consultations;
        else if (tableKey === 'encrypted_reports') list = dbStore.encryptedReports;
        else if (tableKey === 'advisories') list = dbStore.advisories;
        else if (tableKey === 'alerts') list = dbStore.alerts;
        else if (tableKey === 'users') list = dbStore.users;
        else if (tableKey === 'sources') list = dbStore.waterSources;
        else if (tableKey === 'sensors') list = dbStore.sensors;

        count = list.length;
        latestRecord = list[0] ? config.sanitizer(list[0]) : null;
      }

      // Generate context-rich status summary
      if (tableKey === 'telemetry') {
        const avgWqi = dbStore.telemetry.length
          ? Math.round(
              dbStore.telemetry.reduce((acc, t) => acc + (t.wqi_score || 0), 0) /
                dbStore.telemetry.length
            )
          : 90;
        statusSummary = `Avg Regional WQI: ${avgWqi}/100 (${dbStore.telemetry.filter((t) => t.is_anomalous).length} anomalies)`;
      } else if (tableKey === 'symptoms') {
        const urgentCount = dbStore.symptoms.filter((s) => s.emergency_cluster_flag || s.urgency_level === 'critical_emergency').length;
        statusSummary = `${dbStore.symptoms.length} Total Cases (${urgentCount} Cluster Flags)`;
      } else if (tableKey === 'alerts') {
        const activeCount = dbStore.alerts.filter((a) => a.status === 'active').length;
        statusSummary = `${activeCount} Active Triage Incidents`;
      } else if (tableKey === 'encrypted_reports') {
        const unreadCount = dbStore.encryptedReports.filter((r) => r.status === 'unread').length;
        statusSummary = `${unreadCount} Unread Cryptographic Dispatches`;
      } else if (tableKey === 'users') {
        const admins = dbStore.users.filter((u) => u.role === 'district_admin').length;
        const ashas = dbStore.users.filter((u) => u.role === 'health_worker').length;
        statusSummary = `${admins} Admins &bull; ${ashas} ASHA Supervisors &bull; ${dbStore.users.length} Total`;
      } else {
        statusSummary = `${count} Total Registered Records`;
      }

      overview.push({
        table_key: tableKey,
        db_table: config.dbTable,
        display_name: config.displayName,
        row_count: count,
        last_updated: latestRecord ? latestRecord[config.timestampField] || new Date().toISOString() : null,
        status_summary: statusSummary
      });
    }

    res.json({
      success: true,
      data: overview,
      system_info: {
        mode: isPostgresConnected ? 'PostgreSQL PostGIS Cluster' : 'In-Memory High-Performance Store',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error fetching database overview:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/db/:table
 * Paginated and searchable records for a specified table
 */
export async function getTableRecords(req, res) {
  try {
    const { table } = req.params;
    const {
      page = 1,
      limit = 25,
      search = '',
      district = '',
      status = '',
      severity = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const config = TABLE_CONFIGS[table];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Unknown table: '${table}'. Supported tables: ${Object.keys(TABLE_CONFIGS).join(', ')}`
      });
    }

    let records = [];

    if (table === 'telemetry') records = [...dbStore.telemetry];
    else if (table === 'symptoms') records = [...dbStore.symptoms];
    else if (table === 'consultations') records = [...dbStore.consultations];
    else if (table === 'encrypted_reports') records = [...dbStore.encryptedReports];
    else if (table === 'advisories') records = [...dbStore.advisories];
    else if (table === 'alerts') records = [...dbStore.alerts];
    else if (table === 'users') records = [...dbStore.users];
    else if (table === 'sources') records = [...dbStore.waterSources];
    else if (table === 'sensors') records = [...dbStore.sensors];

    // Sanitize records (strip password hashes)
    records = records.map(config.sanitizer);

    // Filter by search keyword across specified fields
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((item) => {
        return Object.entries(item).some(([k, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string') return v.toLowerCase().includes(q);
          if (typeof v === 'number') return v.toString().includes(q);
          if (Array.isArray(v)) return v.some((val) => String(val).toLowerCase().includes(q));
          return false;
        });
      });
    }

    // Filter by district
    if (district.trim()) {
      const d = district.trim().toLowerCase();
      records = records.filter(
        (r) =>
          (r.district && r.district.toLowerCase().includes(d)) ||
          (r.recipient_district && r.recipient_district.toLowerCase().includes(d)) ||
          (r.target_area_description && r.target_area_description.toLowerCase().includes(d))
      );
    }

    // Filter by status
    if (status.trim()) {
      const st = status.trim().toLowerCase();
      records = records.filter((r) => r.status && r.status.toLowerCase() === st);
    }

    // Filter by severity
    if (severity.trim()) {
      const sev = severity.trim().toLowerCase();
      records = records.filter((r) => r.severity && r.severity.toLowerCase() === sev);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      records = records.filter((r) => {
        const t = new Date(r[config.timestampField] || r.created_at || r.reported_at).getTime();
        return !isNaN(t) && t >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      records = records.filter((r) => {
        const t = new Date(r[config.timestampField] || r.created_at || r.reported_at).getTime();
        return !isNaN(t) && t <= end;
      });
    }

    // Sort by timestamp descending
    records.sort((a, b) => {
      const ta = new Date(a[config.timestampField] || a.created_at || a.reported_at || 0).getTime();
      const tb = new Date(b[config.timestampField] || b.created_at || b.reported_at || 0).getTime();
      return tb - ta;
    });

    const total = records.length;
    const p = Math.max(1, parseInt(page, 10));
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const totalPages = Math.ceil(total / lim) || 1;
    const startIndex = (p - 1) * lim;
    const paginatedData = records.slice(startIndex, startIndex + lim);

    res.json({
      success: true,
      table,
      display_name: config.displayName,
      total,
      page: p,
      limit: lim,
      total_pages: totalPages,
      data: paginatedData
    });
  } catch (err) {
    console.error(`Error querying table ${req.params.table}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/db/:table/export
 * Downloads/Streams table data as CSV or JSON
 */
export async function exportTableData(req, res) {
  try {
    const { table } = req.params;
    const { format = 'csv', search = '', district = '', status = '', severity = '' } = req.query;

    const config = TABLE_CONFIGS[table];
    if (!config) {
      return res.status(404).json({ success: false, error: `Unknown table: '${table}'` });
    }

    let records = [];
    if (table === 'telemetry') records = [...dbStore.telemetry];
    else if (table === 'symptoms') records = [...dbStore.symptoms];
    else if (table === 'consultations') records = [...dbStore.consultations];
    else if (table === 'encrypted_reports') records = [...dbStore.encryptedReports];
    else if (table === 'advisories') records = [...dbStore.advisories];
    else if (table === 'alerts') records = [...dbStore.alerts];
    else if (table === 'users') records = [...dbStore.users];
    else if (table === 'sources') records = [...dbStore.waterSources];
    else if (table === 'sensors') records = [...dbStore.sensors];

    // Sanitize records
    records = records.map(config.sanitizer);

    // Apply optional search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((item) =>
        Object.entries(item).some(([k, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string') return v.toLowerCase().includes(q);
          if (typeof v === 'number') return v.toString().includes(q);
          if (Array.isArray(v)) return v.some((val) => String(val).toLowerCase().includes(q));
          return false;
        })
      );
    }

    if (district.trim()) {
      const d = district.trim().toLowerCase();
      records = records.filter(
        (r) =>
          (r.district && r.district.toLowerCase().includes(d)) ||
          (r.recipient_district && r.recipient_district.toLowerCase().includes(d))
      );
    }

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `jal_satark_${table}_export_${timestampStr}`;

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(records, null, 2));
    } else {
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }
  } catch (err) {
    console.error(`Error exporting table ${req.params.table}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
}
