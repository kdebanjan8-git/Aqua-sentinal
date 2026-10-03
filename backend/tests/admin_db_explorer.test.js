import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRouter from '../src/routes/api.js';

describe('Master Database Explorer & Unified Audit Console Suite', () => {
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

    // 1. Login as District Admin
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

  test('Citizen blocked from accessing database overview (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/db/overview`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('District Admin retrieves comprehensive database overview (GET /api/admin/db/overview)', async () => {
    const res = await fetch(`${baseUrl}/admin/db/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 7, 'Includes all core tables');

    const telemetryTable = data.data.find((t) => t.table_key === 'telemetry');
    assert.ok(telemetryTable, 'Telemetry table in overview');
    assert.ok(telemetryTable.row_count >= 5);

    const userTable = data.data.find((t) => t.table_key === 'users');
    assert.ok(userTable, 'Users table in overview');
    assert.ok(userTable.row_count >= 3);
  });

  test('District Admin queries paginated telemetry records (GET /api/admin/db/telemetry)', async () => {
    const res = await fetch(`${baseUrl}/admin/db/telemetry?page=1&limit=3`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.page, 1);
    assert.equal(data.limit, 3);
    assert.equal(data.data.length, 3);
    assert.ok(data.total >= 5);
  });

  test('Sanitization test: Querying users table strips password_hash & plain fallback', async () => {
    const res = await fetch(`${baseUrl}/admin/db/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.length > 0);

    for (const u of data.data) {
      assert.equal(u.password_hash, undefined, 'password_hash must be sanitized');
      assert.equal(u.plain_password_fallback, undefined, 'plain_password_fallback must be sanitized');
      assert.ok(u.email, 'Email present');
      assert.ok(u.role, 'Role present');
    }
  });

  test('District Admin exports table records as CSV (GET /api/admin/db/telemetry/export?format=csv)', async () => {
    const res = await fetch(`${baseUrl}/admin/db/telemetry/export?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType?.includes('text/csv'));
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition?.includes('attachment; filename='));

    const csvText = await res.text();
    assert.ok(csvText.includes('"sensor_id"'));
    assert.ok(csvText.includes('"wqi_score"'));
  });

  test('District Admin exports table records as JSON (GET /api/admin/db/symptoms/export?format=json)', async () => {
    const res = await fetch(`${baseUrl}/admin/db/symptoms/export?format=json`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType?.includes('application/json'));

    const jsonData = await res.json();
    assert.ok(Array.isArray(jsonData));
  });
});
