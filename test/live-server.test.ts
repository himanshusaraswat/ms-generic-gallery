/// <reference lib="dom" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

declare const fetch: any;

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

test('Live Server Automated Tests', async (t) => {
  try {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) {
      console.log(`⚠️  Live server returned status ${res.status}`);
      return;
    }
  } catch {
    console.log(`⚠️  Live server is not running at ${BASE_URL}.`);
    console.log('💡 Start the server first with `npm run dev` in another terminal, then run `npm run test:live`.');
    return;
  }

  await t.test('Live GET / returns health status 200 with DB status', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.root, true);
    assert.equal(data.status, 'ok');
    assert.ok(data.database);
    assert.equal(data.database.status, 'connected');
  });

  await t.test('Live OPTIONS / preflight returns CORS headers for Angular app', async () => {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:4200',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(res.status, 204);
    const allowMethods = String(res.headers.get('access-control-allow-methods') || '');
    assert.ok(allowMethods.includes('GET'));
    assert.ok(allowMethods.includes('POST'));
  });

  await t.test('Live GET /gallery/marvel returns paginated Marvel heroes from DB', async () => {
    const res = await fetch(`${BASE_URL}/gallery/marvel?limit=5`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.count > 0, 'Marvel count should be > 0');
    assert.ok(Array.isArray(data.results), 'results should be an array');
    assert.equal(data.results.length, 5);
  });

  await t.test('Live GET /gallery/nfl returns paginated NFL players from DB', async () => {
    const res = await fetch(`${BASE_URL}/gallery/nfl?limit=5`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.count > 0, 'NFL count should be > 0');
    assert.ok(Array.isArray(data.results), 'results should be an array');
    assert.equal(data.results.length, 5);
  });

  await t.test('Live GET /gallery/marvel/search searches by superhero keyword', async () => {
    const res = await fetch(`${BASE_URL}/gallery/marvel/search?q=Spider`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.count > 0, 'Should find Spider heroes');
    assert.ok(data.results.some((r: any) => r.name.includes('Spider')));
  });

  await t.test('Live GET /documentation returns Swagger UI 200', async () => {
    const res = await fetch(`${BASE_URL}/documentation/static/index.html`);
    assert.equal(res.status, 200);
  });

  await t.test('Live GET /gallery/nfl/verify requires query parameters', async () => {
    const res = await fetch(`${BASE_URL}/gallery/nfl/verify`);
    assert.equal(res.status, 400);
  });
});
