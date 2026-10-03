import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate WQI score from basic water parameters
 */
function computeWqi(ph, turbidity, tds, chlorine) {
  // pH weight (optimal 7.0 - 7.8)
  let phScore = 100;
  if (ph < 6.5) phScore = Math.max(0, 100 - (6.5 - ph) * 40);
  else if (ph > 8.5) phScore = Math.max(0, 100 - (ph - 8.5) * 40);

  // Turbidity weight (optimal < 1.0, warning > 5.0)
  let turbScore = 100;
  if (turbidity > 1.0) {
    turbScore = Math.max(0, 100 - (turbidity - 1.0) * 12);
  }

  // TDS weight (optimal < 250, warning > 500)
  let tdsScore = 100;
  if (tds > 250) {
    tdsScore = Math.max(0, 100 - (tds - 250) * 0.15);
  }

  // Chlorine weight (optimal 0.2 - 0.8)
  let chlorScore = 100;
  if (chlorine < 0.2) chlorScore = 70;
  else if (chlorine > 1.2) chlorScore = 60;

  const wqi = Math.round(phScore * 0.3 + turbScore * 0.35 + tdsScore * 0.2 + chlorScore * 0.15);
  return Math.max(10, Math.min(100, wqi));
}

function getWqiGrade(wqi) {
  if (wqi >= 85) return 'Excellent';
  if (wqi >= 70) return 'Good';
  if (wqi >= 50) return 'Poor';
  if (wqi >= 35) return 'Very Poor';
  return 'Unfit';
}

/**
 * Parses jal_shield_synthetic_20000.csv and generates multi-state monitoring nodes
 */
export function loadDatasetNodes() {
  const candidatePaths = [
    path.resolve(process.cwd(), '../ml-service/data/jal_shield_synthetic_20000.csv'),
    path.resolve(process.cwd(), 'ml-service/data/jal_shield_synthetic_20000.csv'),
    path.resolve(__dirname, '../../../ml-service/data/jal_shield_synthetic_20000.csv'),
    path.resolve(__dirname, '../../../../ml-service/data/jal_shield_synthetic_20000.csv'),
    'C:/Users/soham/.gemini/antigravity/scratch/aqua-sentinel/ml-service/data/jal_shield_synthetic_20000.csv'
  ];

  let csvContent = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        csvContent = fs.readFileSync(p, 'utf8');
        break;
      } catch (e) {
        // continue
      }
    }
  }

  if (!csvContent) {
    console.warn('[DatasetLoader] CSV file not found in candidate paths. Using fallback seeds.');
    return getFallbackNodes();
  }

  const lines = csvContent.split('\n');
  const nodeMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    if (cols.length < 32) continue;

    const date = cols[1]?.trim() || '';
    const state = cols[2]?.trim() || 'Assam';
    const district = cols[3]?.trim() || 'Kamrup Metro';
    const village = cols[4]?.trim() || 'Sector';
    const pop = parseInt(cols[5], 10) || 4500;
    const lat = parseFloat(cols[6]);
    const lon = parseFloat(cols[7]);
    const ph = parseFloat(cols[11]) || 7.2;
    const turbidity = parseFloat(cols[12]) || 0.8;
    const tds = parseFloat(cols[13]) || 180.0;
    const chlorine = parseFloat(cols[14]) || 0.45;
    const contamination = cols[15] === '1';
    const diarrheaCases = parseInt(cols[20], 10) || 0;
    const totalCases = parseInt(cols[23], 10) || 0;
    const riskScore = parseFloat(cols[30]) || 20.0;
    const riskLevel = cols[31]?.trim() || (contamination ? 'High' : 'Low');

    const key = `${state}::${district}::${village}`;

    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        date,
        state,
        district,
        village,
        population: pop,
        latitude: lat,
        longitude: lon,
        ph,
        turbidity,
        tds,
        residual_chlorine: chlorine,
        contamination,
        diarrhea_cases: diarrheaCases,
        total_cases: totalCases,
        risk_score: riskScore,
        risk_level: riskLevel,
        readingsCount: 1
      });
    } else {
      // Keep the most recent date reading to accurately reflect live current station telemetry
      const curr = nodeMap.get(key);
      curr.readingsCount++;
      if (date >= curr.date) {
        nodeMap.set(key, {
          date,
          state,
          district,
          village,
          population: pop,
          latitude: lat,
          longitude: lon,
          ph,
          turbidity,
          tds,
          residual_chlorine: chlorine,
          contamination,
          diarrhea_cases: diarrheaCases,
          total_cases: totalCases,
          risk_score: riskScore,
          risk_level: riskLevel,
          readingsCount: curr.readingsCount
        });
      }
    }
  }

  const waterSources = [];
  const sensors = [];
  const telemetry = [];
  const alerts = [];
  const symptoms = [];

  let idx = 1;

  for (const [key, n] of nodeMap.entries()) {
    const sourceId = `ws-${n.state.toLowerCase().slice(0, 3)}-${String(idx).padStart(4, '0')}`;
    const sensorId = `sensor-${n.state.toLowerCase().slice(0, 3)}-${String(idx).padStart(4, '0')}`;
    const nodeUid = `NODE-${n.state.toUpperCase().slice(0, 3)}-${n.village.toUpperCase().replace(/\s+/g, '').slice(0, 6)}-${String(idx).padStart(2, '0')}`;

    let stationType = 'communal_tap';
    if (n.population > 50000) stationType = 'reservoir';
    else if (n.population > 15000) stationType = 'river_intake';
    else if (n.population > 4000) stationType = 'borehole';

    const wqi = computeWqi(n.ph, n.turbidity, n.tds, n.residual_chlorine);
    const wqiGrade = getWqiGrade(wqi);
    
    // Critical Outbreak: Strictly triggered if risk_level === 'High' OR (water_contamination_flag === 1 AND diarrhea_cases > 10)
    const isCriticalOutbreak = (n.risk_level === 'High') || (n.contamination && n.diarrhea_cases > 10);
    const isAnomalous = isCriticalOutbreak || (n.contamination && n.turbidity > 5.0);

    const sourceObj = {
      id: sourceId,
      name: `${n.village} Station (${n.district})`,
      type: stationType,
      capacity_liters_day: Math.max(50000, n.population * 120),
      population_served: n.population,
      district: n.district,
      state: n.state,
      village: n.village,
      latitude: n.latitude,
      longitude: n.longitude,
      status: isCriticalOutbreak ? 'critical' : n.risk_level === 'Moderate' ? 'warning' : 'operational',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    };

    const sensorObj = {
      id: sensorId,
      node_uid: nodeUid,
      source_id: sourceId,
      model: 'JalSense-Tele-Pro',
      battery_level: Math.round(75 + Math.random() * 24),
      signal_rssi: -50 - Math.round(Math.random() * 25),
      latitude: n.latitude,
      longitude: n.longitude,
      district: n.district,
      state: n.state,
      status: 'active',
      last_ping: new Date(Date.now() - Math.round(Math.random() * 15 * 60000)).toISOString()
    };

    const telemetryObj = {
      id: uuidv4(),
      sensor_id: sensorId,
      ph: Number(n.ph.toFixed(2)),
      turbidity: Number(n.turbidity.toFixed(2)),
      tds: Number(n.tds.toFixed(1)),
      orp: Number((650 + (n.residual_chlorine > 0.3 ? 50 : -80) + Math.random() * 20).toFixed(1)),
      temperature: Number((22 + Math.random() * 5).toFixed(1)),
      dissolved_oxygen: Number((7.0 + Math.random() * 1.2).toFixed(1)),
      free_chlorine: Number(n.residual_chlorine.toFixed(2)),
      conductivity: Number((n.tds * 2.1).toFixed(1)),
      wqi_score: wqi,
      wqi_grade: wqiGrade,
      is_anomalous: isAnomalous,
      is_critical_outbreak: isCriticalOutbreak,
      contamination: n.contamination,
      diarrhea_cases: n.diarrhea_cases,
      total_cases: n.total_cases,
      anomaly_confidence: isCriticalOutbreak ? 0.94 : isAnomalous ? 0.75 : 0.02,
      risk_level: isCriticalOutbreak ? 'High' : n.risk_level,
      risk_score: n.risk_score,
      anomaly_reasons: isAnomalous
        ? [
            n.turbidity > 5.0 ? `High turbidity (${n.turbidity} NTU > 5.0 limit)` : null,
            n.ph < 6.5 ? `Acidic water (pH ${n.ph} < 6.5)` : null,
            n.ph > 8.5 ? `Alkaline contamination (pH ${n.ph} > 8.5)` : null,
            n.contamination ? 'Biological microbial contamination flag' : null,
            n.diarrhea_cases > 10 ? `Active clinical case spike (${n.diarrhea_cases} diarrhea cases)` : null
          ].filter(Boolean)
        : [],
      recorded_at: new Date(Date.now() - Math.round(Math.random() * 20 * 60000)).toISOString()
    };

    waterSources.push(sourceObj);
    sensors.push(sensorObj);
    telemetry.push(telemetryObj);

    // Strictly generate active alerts for genuine critical outbreak hotspots
    if (isCriticalOutbreak) {
      alerts.push({
        id: uuidv4(),
        water_source_id: sourceId,
        sensor_id: sensorId,
        title: `🚨 Outbreak Alert: ${n.village} Cluster`,
        alert_type: n.turbidity > 5.0 ? 'turbidity_spike' : 'water_quality_hazard',
        severity: 'critical',
        status: 'active',
        affected_population: n.population,
        population_at_risk: n.population,
        location_description: `${n.village}, ${n.district} (${n.state}) &bull; ${nodeUid}`,
        trigger_explanation: `${n.village} Node detected Critical Pathogen Outbreak (Turbidity: ${n.turbidity} NTU, pH: ${n.ph}, Diarrhea Cases: ${n.diarrhea_cases}). Exceeds emergency threshold.`,
        recommended_action: 'Initiate emergency chlorination & deploy rapid PHC rehydration kits.',
        triggered_at: new Date(Date.now() - Math.round(Math.random() * 120 * 60000)).toISOString()
      });
    }

    // If diarrhea cases reported, generate sample surveillance case
    if (n.diarrhea_cases > 5 || n.total_cases > 10) {
      symptoms.push({
        id: uuidv4(),
        reporter_type: 'community_health_worker',
        patient_identifier: `HH-${n.village.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
        household_head_name: `${n.village} Community Cluster`,
        village_ward: `${n.village} Ward (${n.district})`,
        affected_count: Math.max(1, Math.min(6, n.diarrhea_cases || 3)),
        vulnerable_age_flags: ['children_under_5'],
        symptoms: ['watery_diarrhea', 'vomiting', 'fever'],
        suspected_disease: 'acute_gastroenteritis',
        severity: isCriticalOutbreak ? 'critical' : 'moderate',
        urgency_level: isCriticalOutbreak ? 'critical_emergency' : 'priority',
        emergency_cluster_flag: isCriticalOutbreak,
        field_intervention: isCriticalOutbreak ? 'phc_referral' : 'ors_distributed',
        suspected_water_source_id: sourceId,
        water_source_id: sourceId,
        district: n.district,
        state: n.state,
        latitude: n.latitude + (Math.random() - 0.5) * 0.005,
        longitude: n.longitude + (Math.random() - 0.5) * 0.005,
        notes: `Household cluster presented with diarrhea and vomiting after using ${n.village} municipal station.`,
        status: isCriticalOutbreak ? 'investigating' : 'logged',
        reported_at: new Date(Date.now() - Math.round(Math.random() * 180 * 60000)).toISOString()
      });
    }

    idx++;
  }

  console.log(`[DatasetLoader] Successfully loaded ${waterSources.length} regional monitoring stations across 5 Northeast states.`);

  return {
    waterSources,
    sensors,
    telemetry,
    alerts,
    symptoms
  };
}

function getFallbackNodes() {
  return {
    waterSources: [],
    sensors: [],
    telemetry: [],
    alerts: [],
    symptoms: []
  };
}
