import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';
import { mockMarvel } from '../fixtures/gallery-fixtures';

test('GET / healthcheck returns status ok and database info', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'GET',
    url: '/'
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.root, true);
  assert.equal(data.status, 'ok');
  assert.ok(data.database);
  await app.close();
});

test('GET /api/ normalizes prefix and returns healthcheck', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'GET',
    url: '/api/'
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.root, true);
  assert.equal(data.status, 'ok');
  await app.close();
});

test('GET /api/gallery/marvel normalizes prefix and returns marvel items', async () => {
  const app = await buildApp({ marvel: mockMarvel });
  const response = await app.inject({
    method: 'GET',
    url: '/api/gallery/marvel?limit=2'
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.results.length, 2);
  assert.equal(data.results[0].Name, 'Iron Man');
  await app.close();
});
