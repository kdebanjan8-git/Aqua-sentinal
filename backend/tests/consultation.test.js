import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRouter from '../src/routes/api.js';

describe('Chat Consultation & Continuous Learning Registry Tests', () => {
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

  test('Save consultation assessment (POST /api/consultations/save)', async () => {
    const payload = {
      latitude: 26.1850,
      longitude: 91.7500,
      district: 'Kamrup Metro',
      state: 'Assam',
      reported_symptoms: ['watery_diarrhea', 'vomiting'],
      suspected_condition: 'cholera_suspect',
      severity: 'high',
      visual_cue_findings: 'Visual Cue Detected: Yellow-brown particulate suspension (~7.8 NTU)',
      ambient_telemetry_snapshot: {
        station_name: 'Kamrup Main Intake',
        wqi_score: 52,
        turbidity: 8.2,
        ph: 6.4
      },
      final_advice: 'URGENT: Initiate continuous ORS intake and boil all drinking water.'
    };

    const res = await fetch(`${baseUrl}/consultations/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.id);
    assert.equal(data.data.severity, 'high');
    assert.equal(data.data.is_verified, false);
    assert.equal(data.data.district, 'Kamrup Metro');
  });

  test('Query consultations (GET /api/consultations)', async () => {
    const res = await fetch(`${baseUrl}/consultations?limit=10`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 1);
  });

  test('Verify consultation for retraining (PATCH /api/consultations/:id/verify)', async () => {
    // 1. Get first consultation
    const getRes = await fetch(`${baseUrl}/consultations?limit=1`);
    const getData = await getRes.json();
    const target = getData.data[0];
    assert.ok(target);

    // 2. Verify
    const verifyRes = await fetch(`${baseUrl}/consultations/${target.id}/verify`, {
      method: 'PATCH'
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.success, true);
    assert.equal(verifyData.data.is_verified, true);
  });
});
