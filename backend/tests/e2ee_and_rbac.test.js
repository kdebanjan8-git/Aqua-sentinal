import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRouter from '../src/routes/api.js';

describe('Role-Based Advisory Permissions & E2EE Citizen Dispatch Suite', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;
  let citizenToken;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 1. Login as Admin
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@jalsatark.gov.in', password: 'Admin@123' })
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    // 2. Login as Citizen
    const citizenLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@jalsatark.gov.in', password: 'Citizen@123' })
    });
    const citizenData = await citizenLogin.json();
    citizenToken = citizenData.token;
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('Citizen blocked from broadcasting advisory (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/advisories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        alert_id: null,
        title: 'Unauthorized Citizen Advisory',
        content: 'This should fail',
        urgency: 'high',
        target_zone: 'Kamrup Metro'
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes('Access denied'));
  });

  test('District Admin successfully broadcasts advisory (201 Created)', async () => {
    const res = await fetch(`${baseUrl}/advisories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        alert_id: null,
        title: 'Official Boil Water Notice',
        content: 'Boil all tap water for at least 2 minutes prior to consumption.',
        urgency: 'high',
        target_zone: 'Kamrup Metro'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.id);
  });

  test('Admin registers official RSA public key (POST /api/auth/register-public-key)', async () => {
    const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';
    const mockFingerprint = 'SHA256:4a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';

    const res = await fetch(`${baseUrl}/auth/register-public-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        public_key: mockPublicKey,
        key_fingerprint: mockFingerprint
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.public_key, mockPublicKey);
  });

  test('Citizen queries district public keys (GET /api/encrypted-reports/district-keys)', async () => {
    const res = await fetch(`${baseUrl}/encrypted-reports/district-keys?district=Kamrup Metro`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 1);
    assert.ok(data.data[0].public_key);
  });

  test('Citizen dispatches encrypted report (POST /api/encrypted-reports/dispatch)', async () => {
    const payload = {
      recipient_district: 'Kamrup Metro',
      encrypted_payload: 'Base64CiphertextBlob==',
      encrypted_symmetric_key: 'Base64WrappedKeyBlob==',
      iv: 'Base64IVBlob=='
    };

    const res = await fetch(`${baseUrl}/encrypted-reports/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'unread');
    assert.equal(data.data.recipient_district, 'Kamrup Metro');
  });

  test('Admin retrieves and updates report status (GET & PATCH /api/encrypted-reports)', async () => {
    // 1. Get reports
    const getRes = await fetch(`${baseUrl}/encrypted-reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(getData.data.length >= 1);
    const reportId = getData.data[0].id;

    // 2. Update status to investigating
    const patchRes = await fetch(`${baseUrl}/encrypted-reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'investigating' })
    });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.data.status, 'investigating');
  });

  test('District Health Admin broadcasts advisory via POST /api/alerts/advisory alias', async () => {
    const res = await fetch(`${baseUrl}/alerts/advisory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'EMERGENCY: Cholera Risk Notice',
        severity: 'critical',
        affected_district: 'Kamrup Metro',
        action_recommendations: [
          'Boil water for 1 minute before drinking',
          'Use chlorinated water for cooking',
          'Report acute watery diarrhea to nearest ASHA clinic'
        ],
        broadcast_channels: ['sms', 'dashboard', 'mobile_push', 'clinic_radio']
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.title, 'EMERGENCY: Cholera Risk Notice');
    assert.equal(data.data.severity, 'critical');
    assert.equal(data.data.target_area_description, 'Kamrup Metro');
    assert.ok(data.data.message_content.includes('Boil water'));
  });
});
