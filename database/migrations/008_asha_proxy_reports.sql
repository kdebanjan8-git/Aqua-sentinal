-- 008_asha_proxy_reports.sql
-- Schema migration for ASHA Field Surveillance & Citizen Proxy Registration

ALTER TABLE symptom_reports
    ADD COLUMN IF NOT EXISTS registered_by_asha_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS asha_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS household_head_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS village_ward VARCHAR(150),
    ADD COLUMN IF NOT EXISTS affected_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS vulnerable_age_flags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS suspected_water_source_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS field_intervention VARCHAR(80) DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(30) DEFAULT 'routine',
    ADD COLUMN IF NOT EXISTS emergency_cluster_flag BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'logged';

CREATE INDEX IF NOT EXISTS idx_symptom_reports_asha_id ON symptom_reports(registered_by_asha_id);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_urgency ON symptom_reports(urgency_level);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_cluster_flag ON symptom_reports(emergency_cluster_flag) WHERE emergency_cluster_flag = TRUE;
