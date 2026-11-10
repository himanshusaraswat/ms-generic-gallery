import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';

test('CORS preflight request allows localhost origins', async () => {
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
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:4200');
  await app.close();
});

test('CORS preflight request allows production domain meraki-public.web.app', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/',
    headers: {
      origin: 'https://meraki-public.web.app',
      'access-control-request-method': 'GET'
    }
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'https://meraki-public.web.app');
  await app.close();
});

test('CORS rejects unauthorized origin', async () => {
  const app = await buildApp({});
  const response = await app.inject({
    method: 'GET',
    url: '/',
    headers: {
      origin: 'https://unauthorized-domain.com'
    }
  });

  assert.notEqual(
    response.headers['access-control-allow-origin'],
    'https://unauthorized-domain.com'
  );
  await app.close();
});
