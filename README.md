# ms-generic-gallery

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v4%20%2F%20v5-black.svg)](https://fastify.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-node%3Atest-brightgreen.svg)]()
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A high-performance, modular REST API microservice built with **Fastify**, **TypeScript**, and **MongoDB**. Designed to serve generic paginated galleries, cards, headshots, search, and interactive guessing games.

Pairs natively with [**prj-generic-gallery**](https://github.com/himanshusaraswat/prj-generic-gallery).

---

## Architecture & Features

- **Generic Category Architecture**: Serve any collection (`nfl`, `marvel`, `cards`, etc.) from a single unified API.
- **Sub-Second TDD Suite**: Complete test coverage using Node 22's native `node:test` and Fastify's zero-overhead `fastify.inject()`.
- **Zero-Secret Design**: Clean environment configuration with strict separation of secrets.
- **Production Ready**: Configured for Google Cloud Platform (App Engine Standard / Cloud Run) with automatic scaling and health monitoring.

---

## API Endpoints

### 1. Healthcheck
```http
GET /
```
**Response**: `200 OK`
```json
{ "root": true }
```

### 2. Generic Paginated Gallery
```http
GET /gallery/:category?limit=10&offset=0
```
Supports any collection (e.g. `/gallery/nfl`, `/gallery/marvel`, `/gallery/headshots`).

**Response**: `200 OK`
```json
{
  "count": 32,
  "next": null,
  "previous": null,
  "results": [
    {
      "_id": "64b000000000000000000001",
      "Name": "Patrick Mahomes",
      "Team": "Kansas City Chiefs"
    }
  ]
}
```

### 3. Guess Verification (Interactive Game Mode)
```http
GET /gallery/:category/verify?id=<ITEM_ID>&name=<GUESS_NAME>
```
Validates guesses case-insensitively with automatic whitespace trimming and null safety.

**Response**: `200 OK`
```json
true
```

### 4. Search
```http
GET /gallery/:category/search?q=<KEYWORD>&limit=10&offset=0
```
Performs regex-based case-insensitive search on item names.

### 5. Backward Compatibility (NFL Headshots)
- `GET /nfl/headshots` — Paginated NFL player cards
- `GET /nfl/headshots/gameResult?id=...&name=...` — Guess verification

---

## Quickstart & Local Development

### 1. Clone & Install
```bash
git clone https://github.com/himanshusaraswat/ms-generic-gallery.git
cd ms-generic-gallery
npm install
```

### 2. Configure Environment
Copy the example environment template:
```bash
cp .env.example .env
```
Update `.env` with your MongoDB credentials:
```bash
DB_USER=your_mongo_user
DB_PASS=your_mongo_password
DB_NAME=generic-gallery
PORT=3000
```

### 3. Run the TDD Test Suite
Execute the full test suite in under 1 second:
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with hot-reloading.

---

## Cloud Deployment (Google Cloud Platform)

Configured for **Google App Engine** and **Cloud Run** with Node 22:
```bash
gcloud app deploy app.yml
```

Automated CI/CD runs via GitHub Actions on merge to `develop` ([`.github/workflows/deploy-to-dev-stg-on-develop-merge.yml`](.github/workflows/deploy-to-dev-stg-on-develop-merge.yml)).

---

## License
ISC © [Himanshu Saraswat](https://github.com/himanshusaraswat)
