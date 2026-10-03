-- 003_telemetry_and_symptoms.sql
-- Create tables for high-frequency water sensor telemetry and community symptom surveillance reports

CREATE TABLE IF NOT EXISTS telemetry_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES sensor_nodes(id) ON DELETE CASCADE,
    ph NUMERIC(4, 2) NOT NULL,                        -- Normal: 6.5 - 8.5
    turbidity NUMERIC(6, 2) NOT NULL,                 -- Normal: < 1.0 NTU, Warning: > 4.0 NTU
    tds NUMERIC(7, 2) NOT NULL,                       -- Total Dissolved Solids in ppm/mg/L (Normal: < 300 ppm)
    orp NUMERIC(6, 2) NOT NULL,                       -- Oxidation-Reduction Potential in mV (Normal: > 650 mV for disinfection)
    temperature NUMERIC(5, 2) NOT NULL,               -- Temperature in Celsius
    dissolved_oxygen NUMERIC(5, 2) DEFAULT 7.5,       -- DO in mg/L (Normal: > 6.0 mg/L)
    free_chlorine NUMERIC(4, 2) DEFAULT 0.5,          -- Residual Free Chlorine in mg/L (Normal: 0.2 - 1.0 mg/L)
    conductivity NUMERIC(7, 2) DEFAULT 400.0,         -- Electrical Conductivity in µS/cm
    wqi_score NUMERIC(5, 2),                          -- Calculated Water Quality Index (0 - 100)
    wqi_grade VARCHAR(20),                            -- Excellent, Good, Poor, Very Poor, Unfit
    is_anomalous BOOLEAN DEFAULT FALSE,
    anomaly_confidence NUMERIC(4, 3) DEFAULT 0.0,
    anomaly_reasons TEXT[] DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for time-series queries
CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_time ON telemetry_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON telemetry_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_anomalous ON telemetry_readings(is_anomalous) WHERE is_anomalous = TRUE;

CREATE TABLE IF NOT EXISTS symptom_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_type VARCHAR(50) DEFAULT 'community_health_worker' CHECK (reporter_type IN ('citizen', 'community_health_worker', 'clinic_staff', 'hospital_intake')),
    patient_identifier VARCHAR(100),                  -- Hashed or pseudonymous ID for privacy
    patient_age_group VARCHAR(30) CHECK (patient_age_group IN ('infant_0_5', 'child_6_17', 'adult_18_59', 'senior_60_plus')),
    patient_gender VARCHAR(20) DEFAULT 'unspecified',
    symptoms TEXT[] NOT NULL,                         -- Array: ['watery_diarrhea', 'vomiting', 'severe_dehydration', 'fever', 'abdominal_cramps', 'jaundice']
    suspected_disease VARCHAR(80),                    -- 'cholera', 'acute_gastroenteritis', 'typhoid', 'dysentery', 'hepatitis_a', 'giardiasis'
    severity VARCHAR(20) DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    water_source_id UUID REFERENCES water_sources(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    notes TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and temporal indices for symptom surveillance
CREATE INDEX IF NOT EXISTS idx_symptom_reports_location ON symptom_reports USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_time ON symptom_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_source ON symptom_reports(water_source_id);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_suspected ON symptom_reports(suspected_disease);
