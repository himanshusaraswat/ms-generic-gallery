import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';

test('Swagger OpenAPI Documentation and Live Console', async (t) => {
  const app = await buildApp();

  t.after(async () => {
    await app.close();
  });

  await t.test('GET /documentation/static/index.html returns Swagger UI HTML page', async () => {
    const res = await app.inject({
      url: '/documentation/static/index.html',
      method: 'GET',
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type']?.includes('text/html'));
  });

  await t.test('GET /documentation/json returns valid OpenAPI 3.0 schema', async () => {
    const res = await app.inject({
      url: '/documentation/json',
      method: 'GET',
    });
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.openapi, '3.0.3');
    assert.equal(data.info.title, 'Generic Gallery Microservice API');
    assert.ok(data.paths['/gallery/{category}']);
    assert.ok(data.paths['/gallery/{category}/verify']);
    assert.ok(data.paths['/gallery/{category}/search']);
  });
});
