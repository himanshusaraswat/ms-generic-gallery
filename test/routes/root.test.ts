import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';

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
