import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';

test('CORS preflight request allows modern methods and origins', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/',
    headers: {
      origin: 'http://localhost:4200',
      'access-control-request-method': 'POST'
    }
  });

  assert.equal(response.statusCode, 204);
  const allowMethods = String(response.headers['access-control-allow-methods'] || '');
  assert.ok(allowMethods.includes('GET'));
  assert.ok(allowMethods.includes('POST'));
  assert.ok(allowMethods.includes('OPTIONS'));
  await app.close();
});
