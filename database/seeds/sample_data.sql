-- sample_data.sql
-- Seed initial data for Jal-Satark Northeast Regional Water Grid
-- Clean Baseline State: All stations operational and nominal

-- 1. Water Sources (All 5 operational)
INSERT INTO water_sources (id, name, type, capacity_liters_day, population_served, location, supply_zone, status)
VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'Kamrup Main Intake & Treatment Plant',
    'treatment_plant',
    650000.0,
    48000,
    ST_SetSRID(ST_MakePoint(91.7500, 26.1850), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((91.7400 26.1750, 91.7600 26.1750, 91.7600 26.1950, 91.7400 26.1950, 91.7400 26.1750))'), 4326),
    'operational'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Pandu Ghat Brahmaputra Pumping Station',
    'river_intake',
    950000.0,
    72000,
    ST_SetSRID(ST_MakePoint(91.7080, 26.1720), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((91.7000 26.1650, 91.7180 26.1650, 91.7180 26.1800, 91.7000 26.1800, 91.7000 26.1650))'), 4326),
    'operational'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Aizawl North Zone Borehole Station',
    'borehole',
    140000.0,
    16500,
    ST_SetSRID(ST_MakePoint(91.7820, 26.1580), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((91.7750 26.1500, 91.7900 26.1500, 91.7900 26.1650, 91.7750 26.1650, 91.7750 26.1500))'), 4326),
    'operational'
),
(
    'a1000000-0000-0000-0000-000000000004',
    'Dispur Capital Tap Cluster #7',
    'communal_tap',
    55000.0,
    8200,
    ST_SetSRID(ST_MakePoint(91.7910, 26.1420), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((91.7850 26.1350, 91.7980 26.1350, 91.7980 26.1480, 91.7850 26.1480, 91.7850 26.1350))'), 4326),
    'operational'
),
(
    'a1000000-0000-0000-0000-000000000005',
    'Imphal River Downstream Terminal',
    'reservoir',
    1100000.0,
    85000,
    ST_SetSRID(ST_MakePoint(91.7280, 26.1950), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((91.7200 26.1850, 91.7350 26.1850, 91.7350 26.2050, 91.7200 26.2050, 91.7200 26.1850))'), 4326),
    'operational'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Sensor Nodes
INSERT INTO sensor_nodes (id, node_uid, source_id, model, battery_level, signal_rssi, location, status, last_ping)
VALUES
(
    'b1000000-0000-0000-0000-000000000001',
    'NODE-KAMRUP-01',
    'a1000000-0000-0000-0000-000000000001',
    'JalSense-Tele-Pro',
    97.5,
    -56,
    ST_SetSRID(ST_MakePoint(91.7500, 26.1850), 4326),
    'active',
    NOW()
),
(
    'b1000000-0000-0000-0000-000000000002',
    'NODE-PANDU-02',
    'a1000000-0000-0000-0000-000000000002',
    'JalSense-Tele-Pro',
    94.0,
    -61,
    ST_SetSRID(ST_MakePoint(91.7080, 26.1720), 4326),
    'active',
    NOW()
),
(
    'b1000000-0000-0000-0000-000000000003',
    'NODE-AIZAWL-03',
    'a1000000-0000-0000-0000-000000000003',
    'JalSense-Tele-Pro',
    92.0,
    -62,
    ST_SetSRID(ST_MakePoint(91.7820, 26.1580), 4326),
    'active',
    NOW()
),
(
    'b1000000-0000-0000-0000-000000000004',
    'NODE-DISPUR-04',
    'a1000000-0000-0000-0000-000000000004',
    'JalSense-Tele-Pro',
    91.5,
    -65,
    ST_SetSRID(ST_MakePoint(91.7910, 26.1420), 4326),
    'active',
    NOW()
),
(
    'b1000000-0000-0000-0000-000000000005',
    'NODE-IMPHAL-05',
    'a1000000-0000-0000-0000-000000000005',
    'JalSense-Tele-Pro',
    89.0,
    -58,
    ST_SetSRID(ST_MakePoint(91.7280, 26.1950), 4326),
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Clean Baseline Telemetry Readings (All nominal within WHO/BIS standards)
INSERT INTO telemetry_readings (sensor_id, ph, turbidity, tds, orp, temperature, dissolved_oxygen, free_chlorine, conductivity, wqi_score, wqi_grade, is_anomalous, anomaly_confidence, recorded_at)
VALUES
('b1000000-0000-0000-0000-000000000001', 7.25, 0.42, 135.0, 715.0, 23.8, 7.9, 0.65, 310.0, 95.0, 'Excellent', FALSE, 0.02, NOW() - INTERVAL '15 minutes'),
('b1000000-0000-0000-0000-000000000002', 7.30, 0.58, 160.0, 695.0, 24.2, 7.5, 0.55, 340.0, 92.0, 'Excellent', FALSE, 0.03, NOW() - INTERVAL '12 minutes'),
('b1000000-0000-0000-0000-000000000003', 7.15, 0.65, 175.0, 705.0, 24.0, 7.6, 0.52, 350.0, 90.0, 'Excellent', FALSE, 0.02, NOW() - INTERVAL '5 minutes'),
('b1000000-0000-0000-0000-000000000004', 7.18, 0.80, 180.0, 665.0, 25.0, 7.2, 0.48, 375.0, 88.0, 'Good', FALSE, 0.04, NOW() - INTERVAL '8 minutes'),
('b1000000-0000-0000-0000-000000000005', 7.42, 1.15, 205.0, 655.0, 24.9, 7.0, 0.42, 405.0, 85.0, 'Good', FALSE, 0.04, NOW() - INTERVAL '10 minutes');
