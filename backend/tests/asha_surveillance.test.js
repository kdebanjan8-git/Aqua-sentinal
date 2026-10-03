import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRouter from '../src/routes/api.js';

describe('ASHA Field Surveillance & Citizen Proxy Registration Suite', () => {
  let app;
  let server;
  let baseUrl;
  let ashaToken;
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

    // 1. Login as ASHA Worker
    const ashaLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'healthworker@jalsatark.gov.in', password: 'Health@123' })
    });
    const ashaData = await ashaLogin.json();
    ashaToken = ashaData.token;

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

  test('Citizen blocked from accessing ASHA proxy intake (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/asha/proxy-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        household_head_name: 'Bora Household',
        village_ward: 'Ward 7, Pandu Ghat',
        symptoms: ['watery_diarrhea']
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('ASHA worker successfully submits proxy field report (201 Created)', async () => {
    const res = await fetch(`${baseUrl}/asha/proxy-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ashaToken}`
      },
      body: JSON.stringify({
        household_head_name: 'Bora Household',
        village_ward: 'Ward 7, Pandu Ghat',
        affected_count: 4,
        vulnerable_age_flags: ['children_under_5', 'elderly'],
        symptoms: ['watery_diarrhea', 'vomiting', 'fever'],
        suspected_disease: 'acute_gastroenteritis',
        severity: 'severe',
        urgency_level: 'priority',
        field_intervention: 'ors_distributed',
        notes: 'Four household members developed acute diarrhea within 12 hours of tap water consumption. Distributed 8 ORS packets.'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.id);
    assert.equal(data.data.affected_count, 4);
    assert.equal(data.data.household_head_name, 'Bora Household');
    assert.equal(data.data.field_intervention, 'ors_distributed');
    assert.ok(data.data.registered_by_asha_id);
    assert.ok(data.data.asha_name);
  });

  test('Emergency cluster flag triggers immediate triage alert', async () => {
    const res = await fetch(`${baseUrl}/asha/proxy-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ashaToken}`
      },
      body: JSON.stringify({
        household_head_name: 'Kalita Family Cluster',
        village_ward: 'Aizawl North Zone',
        affected_count: 6,
        symptoms: ['watery_diarrhea', 'severe_dehydration'],
        severity: 'critical',
        urgency_level: 'critical_emergency',
        emergency_cluster_flag: true,
        field_intervention: 'phc_referral',
        notes: '6 members severely dehydrated. Referred immediately to District Civil Hospital.'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.emergency_cluster_flag, true);
    assert.equal(data.data.status, 'investigating');

    // Verify alert in triage feed
    const alertsRes = await fetch(`${baseUrl}/alerts`);
    const alertsData = await alertsRes.json();
    assert.equal(alertsRes.status, 200);
    const matchedAlert = alertsData.data.find((a) =>
      a.title?.includes('Kalita Family Cluster') || a.trigger_explanation?.includes('Kalita')
    );
    assert.ok(matchedAlert, 'Critical ASHA escalation created triage alert');
  });

  test('ASHA worker retrieves submitted field logs (GET /api/asha/my-reports)', async () => {
    const res = await fetch(`${baseUrl}/asha/my-reports`, {
      headers: {
        Authorization: `Bearer ${ashaToken}`
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 2);
  });
});
