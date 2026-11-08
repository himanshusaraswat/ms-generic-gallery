import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';
import { mockHeadshots, mockMarvel } from '../fixtures/gallery-fixtures';

const seedData = {
  'nfl-headshot': mockHeadshots,
  marvel: mockMarvel,
};

test('GET /gallery/:category returns paginated items with count and results', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl?limit=2&offset=0',
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.count, 3);
  assert.equal(data.results.length, 2);
  assert.equal(data.results[0].Name, 'Patrick Mahomes');
  await app.close();
});

test('GET /gallery/:category with Marvel returns marvel items', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/marvel?limit=5&offset=0',
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.count, 2);
  assert.equal(data.results[0].Name, 'Iron Man');
  await app.close();
});

test('GET /gallery/:category/verify matches correct guess case-insensitively with trimming', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl/verify?id=64b000000000000000000001&name=  pATRIck MAhOMEs  ',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json(), true);
  await app.close();
});

test('GET /gallery/:category/verify returns false for wrong guess', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl/verify?id=64b000000000000000000001&name=Tom Brady',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json(), false);
  await app.close();
});

test('GET /gallery/:category/verify returns 404 for non-existent item id', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl/verify?id=000000000000000000000000&name=Anyone',
  });

  assert.equal(response.statusCode, 404);
  const data = response.json();
  assert.equal(data.match, false);
  await app.close();
});

test('GET /gallery/:category/verify returns 400 when missing query parameters', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl/verify',
  });

  assert.equal(response.statusCode, 400);
  await app.close();
});

test('GET /gallery/:category/search searches items by keyword', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/nfl/search?q=mahomes',
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.count, 1);
  assert.equal(data.results[0].Name, 'Patrick Mahomes');
  await app.close();
});


test('GET /gallery/:category/random returns a single random character', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/gallery/marvel/random',
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.ok(data.id);
  assert.ok(data.name);
  assert.equal(data.category, 'marvel');
  await app.close();
});
