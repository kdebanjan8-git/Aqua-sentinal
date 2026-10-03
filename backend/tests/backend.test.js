import test from 'node:test';
import assert from 'node:assert';
import { dbStore, haversineKm } from '../src/models/dbStore.js';

test('Haversine distance calculation', () => {
  const d = haversineKm(26.1850, 91.7500, 26.1720, 91.7080);
  assert.ok(d > 1.0 && d < 6.0, `Expected distance ~4.5km, got ${d}`);
});

test('dbStore clean baseline initialization from 20000 dataset', () => {
  assert.ok(dbStore.waterSources.length >= 30, `Expected >= 30 stations, got ${dbStore.waterSources.length}`);
  assert.ok(dbStore.sensors.length >= 30, `Expected >= 30 sensors, got ${dbStore.sensors.length}`);
  assert.ok(dbStore.telemetry.length >= 30, `Expected >= 30 telemetry readings, got ${dbStore.telemetry.length}`);
  assert.ok(dbStore.users.length >= 3, `Expected >= 3 users, got ${dbStore.users.length}`);
});

test('dbStore reset restores regional dataset stations', () => {
  const initialCount = dbStore.symptoms.length;
  dbStore.symptoms.push({ id: 'temp-symptom' });
  assert.strictEqual(dbStore.symptoms.length, initialCount + 1);
  dbStore.reset();
  assert.strictEqual(dbStore.symptoms.length, initialCount);
  assert.ok(dbStore.waterSources.length >= 30);
});
