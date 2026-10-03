-- 007_encrypted_messages.sql
-- Schema for End-to-End Encrypted (E2EE) Citizen-to-Government Whistleblower & Emergency Dispatch

-- Add public key and fingerprint columns to users table for official government officers
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(128);

-- Create table for encrypted citizen reports
CREATE TABLE IF NOT EXISTS encrypted_citizen_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_district VARCHAR(100) NOT NULL DEFAULT 'Kamrup Metro',
    recipient_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    encrypted_payload TEXT NOT NULL,          -- Base64 AES-GCM ciphertext of message, GPS coordinates, and hazard metadata
    encrypted_symmetric_key TEXT NOT NULL,    -- Base64 RSA-OAEP wrapped AES-256 key
    iv TEXT NOT NULL,                         -- Base64 12-byte initialization vector
    status VARCHAR(30) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'investigating', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying by district admins and status filters
CREATE INDEX IF NOT EXISTS idx_encrypted_reports_district ON encrypted_citizen_reports(recipient_district);
CREATE INDEX IF NOT EXISTS idx_encrypted_reports_status ON encrypted_citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_encrypted_reports_admin ON encrypted_citizen_reports(recipient_admin_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_reports_created ON encrypted_citizen_reports(created_at DESC);
