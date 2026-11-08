import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../helpers/build-app';
import { mockHeadshots } from '../fixtures/gallery-fixtures';

const seedData = {
  'nfl-headshot': mockHeadshots,
};

test('GET /nfl/headshots returns paginated headshots', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/nfl/headshots?limit=2&offset=0',
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.count, 3);
  assert.equal(data.results.length, 2);
  assert.equal(data.results[0].Name, 'Patrick Mahomes');
  await app.close();
});

test('GET /nfl/headshots/gameResult checks player guess accurately', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/nfl/headshots/gameResult?id=64b000000000000000000001&name=Patrick Mahomes',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json(), true);
  await app.close();
});

test('GET /nfl/headshots/gameResult returns 404 on missing player id', async () => {
  const app = await buildApp(seedData);
  const response = await app.inject({
    method: 'GET',
    url: '/nfl/headshots/gameResult?id=000000000000000000000000&name=Anyone',
  });

  assert.equal(response.statusCode, 404);
  const data = response.json();
  assert.equal(data.match, false);
  await app.close();
});
