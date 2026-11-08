import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';

test('GET / healthcheck returns root true', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'GET',
    url: '/',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { root: true });
  await app.close();
});
