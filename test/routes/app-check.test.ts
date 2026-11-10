import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';
import { mockMarvel } from '../fixtures/gallery-fixtures';

test('App Check Audit Mode: Allows requests through without token', async () => {
  delete process.env.APP_CHECK_ENFORCE;
  const app = await buildApp({ marvel: mockMarvel });

  const response = await app.inject({
    method: 'GET',
    url: '/api/gallery/marvel?limit=2'
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.results.length, 2);
  await app.close();
});

test('App Check: Health checks always bypass token validation', async () => {
  process.env.APP_CHECK_ENFORCE = 'true';
  const app = await buildApp({});

  const rootRes = await app.inject({ method: 'GET', url: '/' });
  assert.equal(rootRes.statusCode, 200);

  const apiRes = await app.inject({ method: 'GET', url: '/api/' });
  assert.equal(apiRes.statusCode, 200);

  delete process.env.APP_CHECK_ENFORCE;
  await app.close();
});

test('App Check Enforce Mode: Rejects requests missing token with 401', async () => {
  process.env.APP_CHECK_ENFORCE = 'true';
  const app = await buildApp({ marvel: mockMarvel });

  const response = await app.inject({
    method: 'GET',
    url: '/api/gallery/marvel?limit=2'
  });

  assert.equal(response.statusCode, 401);
  const data = response.json();
  assert.equal(data.error, 'Unauthorized');
  assert.equal(data.message, 'Missing required App Check token.');

  delete process.env.APP_CHECK_ENFORCE;
  await app.close();
});
