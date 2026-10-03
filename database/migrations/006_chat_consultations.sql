-- 006_chat_consultations.sql
-- Create table for AI health assistant triage consultations for continuous epidemiological learning

CREATE TABLE IF NOT EXISTS chat_consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    district VARCHAR(100) DEFAULT 'Kamrup Metro',
    state VARCHAR(100) DEFAULT 'Assam',
    reported_symptoms TEXT[] NOT NULL DEFAULT '{}',
    suspected_condition VARCHAR(120) NOT NULL DEFAULT 'acute_gastroenteritis',
    severity VARCHAR(30) NOT NULL DEFAULT 'moderate' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    visual_cue_findings TEXT,
    ambient_telemetry_snapshot JSONB DEFAULT '{}'::jsonb,
    final_advice TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and temporal indices for field surveillance and retraining pipeline
CREATE INDEX IF NOT EXISTS idx_chat_consultations_location ON chat_consultations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_chat_consultations_time ON chat_consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_consultations_severity ON chat_consultations(severity);
CREATE INDEX IF NOT EXISTS idx_chat_consultations_verified ON chat_consultations(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_chat_consultations_district ON chat_consultations(district);
