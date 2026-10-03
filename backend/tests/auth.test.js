import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRouter from '../src/routes/api.js';
import { dbStore } from '../src/models/dbStore.js';
import { JWT_SECRET } from '../src/middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

describe('User Authentication & RBAC Authorization Suite', () => {
  let app;
  let server;
  let baseUrl;

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
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('Demo Admin Login (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@jalsatark.gov.in',
        password: 'Admin@123'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.role, 'district_admin');
    assert.equal(data.user.email, 'admin@jalsatark.gov.in');
    assert.equal(data.user.password_hash, undefined);
  });

  test('Login failure with incorrect password (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@jalsatark.gov.in',
        password: 'WrongPassword999'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('User Registration (POST /api/auth/register)', async () => {
    const randomEmail = `field_worker_${Date.now()}@jalsatark.gov.in`;
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Jonali Phukan (ASHA Worker)',
        email: randomEmail,
        password: 'SecurePassword@123',
        role: 'health_worker',
        state: 'Assam',
        district: 'Dibrugarh'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.role, 'health_worker');
    assert.equal(data.user.district, 'Dibrugarh');

    // Verify duplicate registration rejection
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Jonali Phukan',
        email: randomEmail,
        password: 'SecurePassword@123'
      })
    });
    assert.equal(dupRes.status, 409);
  });

  test('Profile verification via Bearer Token (GET /api/auth/me)', async () => {
    // 1. Sign in as Health Worker
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'healthworker@jalsatark.gov.in',
        password: 'Health@123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Fetch /auth/me with Bearer token
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.success, true);
    assert.equal(meData.user.email, 'healthworker@jalsatark.gov.in');
    assert.equal(meData.user.role, 'health_worker');

    // 3. Fetch without token -> 401
    const unauthRes = await fetch(`${baseUrl}/auth/me`);
    assert.equal(unauthRes.status, 401);
  });
});
