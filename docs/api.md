# API Reference

Base URL: `http://localhost:4000/api`

All responses follow the envelope format:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "Human-readable" } }
```

---

## Health

### GET /api/health

Liveness probe. No auth, no rate limit.

**Response:** `{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }`

### GET /api/health/ready

Readiness probe. Checks database connectivity.

**Response (200):**

```json
{
  "status": "ready",
  "checks": { "database": "ok", "uptime": 86400, "memory": { ... } }
}
```

**Response (503):**

```json
{ "status": "not ready", "checks": { "database": "failed" } }
```

---

## Public Endpoints

### GET /api/tours

Returns all manually curated tours ordered by `sortOrder`.

**Response:** Array of Tour objects.

| Field       | Type      | Description                                  |
| ----------- | --------- | -------------------------------------------- |
| id          | number    | Tour ID                                      |
| title       | string    | Tour title                                   |
| destination | string    | Destination name                             |
| price       | number    | Price in CZK                                 |
| startDate   | string    | ISO date                                     |
| endDate     | string    | ISO date                                     |
| transport   | string    | Transport type                               |
| image       | string    | Cover image URL                              |
| description | string?   | Tour description                             |
| photos      | string[]? | Additional photo URLs                        |
| i18n        | object?   | Localized strings `{ cs: {...}, en: {...} }` |

---

### POST /api/inquiries

Submit a tour inquiry (creates or updates a Lead).

**Rate limit:** 30 requests / 15 minutes

**Body:**

```json
{
  "email": "user@example.com",
  "destination": "Egypt",
  "tourId": 123,
  "marketingConsent": true,
  "gdprConsent": true,
  "source": "tour-inquiry"
}
```

| Field            | Type    | Required | Description            |
| ---------------- | ------- | -------- | ---------------------- |
| email            | string  | Yes      | Valid email address    |
| destination      | string  | No       | Destination name       |
| tourId           | number  | No       | Associated tour ID     |
| marketingConsent | boolean | No       | Email marketing opt-in |
| gdprConsent      | boolean | No       | GDPR consent           |
| source           | string  | No       | Lead source identifier |

**Response (201):** `{ "ok": true }`

---

### GET /api/search/providers

List all registered providers with metadata.

**Response:**

```json
[
  {
    "id": "alexandria",
    "label": "Alexandria",
    "supportsStreaming": false,
    "filterFields": [...],
    "cacheStatus": { "itemCount": 5000, "lastRefresh": "..." }
  }
]
```

---

### GET /api/search/all/tours

Unified multi-provider search with filters and pagination.

**Rate limit:** 200 requests / minute

**Query Parameters:**

| Param           | Type   | Default | Description                       |
| --------------- | ------ | ------- | --------------------------------- |
| q               | string | —       | Free-text search                  |
| destinationSlug | string | —       | Canonical destination slug        |
| priceMin        | number | —       | Minimum price (CZK)               |
| priceMax        | number | —       | Maximum price (CZK)               |
| dateStart       | string | —       | Start date (ISO)                  |
| dateEnd         | string | —       | End date (ISO)                    |
| nights          | number | —       | Number of nights                  |
| stars           | string | —       | Hotel star rating                 |
| board           | string | —       | Board type (e.g. "all-inclusive") |
| transport       | string | —       | "flight" or "bus"                 |
| adults          | number | —       | Number of adults                  |
| children        | number | —       | Number of children                |
| sortBy          | string | "price" | Sort field: price, date, stars    |
| sortDir         | string | "asc"   | Sort direction: asc, desc         |
| page            | number | 1       | Page number                       |
| limit           | number | 20      | Results per page (max 100)        |

**Response:**

```json
{
  "tours": [
    {
      /* UnifiedTour */
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

**Headers:** `X-Cache: HIT|MISS`, `Server-Timing: search;dur=45`

---

### GET /api/search/bootstrap

Single-request bootstrap for the search page. Returns all providers + regions. Supports ETag caching.

**Response:**

```json
{
  "providers": [...],
  "regions": { "alexandria": [...] }
}
```

---

### GET /api/search/destinations

List public destinations with provider coverage.

**Query:** `?provider=alexandria` (optional filter)

**Response:** Array of `{ slug, czechName, providerCount }`

---

### GET /api/search/providers/:id/regions

Get regions for a specific provider.

**Response:** Array of `{ regionKey, externalId, name, tourCount }`

---

### GET /api/alexandria/last-minute

Homepage last-minute offers from Alexandria.

**Query:**

| Param | Type   | Default | Description           |
| ----- | ------ | ------- | --------------------- |
| zeme  | number | —       | Country ID filter     |
| limit | number | 8       | Max results (cap: 50) |

**Response:** Array of last-minute tour objects.

---

### POST /api/alerts

Subscribe to price alerts.

**Rate limit:** 20 requests / 15 minutes

**Body:**

```json
{
  "email": "user@example.com",
  "providerId": "alexandria",
  "externalId": "ABC123",
  "tourTitle": "Egypt 7 nocí",
  "priceMax": 15000
}
```

**Response (201):** `{ "ok": true, "id": 42 }`

---

### POST /api/erasure

GDPR Right to Erasure. Deletes all leads and price alerts for the given email.

**Rate limit:** 3 requests / 15 minutes

**Body:**

```json
{ "email": "user@example.com" }
```

**Response:** `{ "ok": true, "deleted": { "leads": 2, "alerts": 1 } }`

---

## Admin Endpoints

All admin endpoints require an authenticated session (cookie-based). Unauthorized requests return `401`.

**Rate limit:** 300 requests / minute (all admin routes).

### POST /api/admin/login

**Body:** `{ "login": "admin", "password": "..." }`

**Response:** `{ "ok": true, "user": { "id": 1, "login": "admin" } }`

### POST /api/admin/logout

**Response:** `{ "ok": true }`

### GET /api/admin/me

**Response:** `{ "ok": true, "user": { "id": 1, "login": "admin" } }` or `401`

---

### GET /api/admin/tours

List all admin-managed tours. Supports pagination.

### POST /api/admin/tours

Create a new tour.

### PUT /api/admin/tours/:id

Update an existing tour.

### DELETE /api/admin/tours/:id

Delete a tour.

---

### GET /api/admin/leads

List leads with filtering and pagination.

### DELETE /api/admin/leads/:id

Delete a specific lead.

---

### POST /api/admin/uploads

Upload files (images). Multipart form data via multer.

**Limits:** 5MB max, image/\* mime types only.

### GET /api/admin/uploads

List uploaded files.

### DELETE /api/admin/uploads/:filename

Delete an uploaded file.

---

### GET /api/admin/providers

List providers with sync status.

### POST /api/admin/providers/:id/sync

Trigger manual provider sync.

---

### POST /api/admin/campaigns

Create and send email campaigns.

### GET /api/admin/campaigns

List past campaigns.

---

### GET /api/admin/cache-stats

Return public search cache statistics (hit rate, size, entries).

---

## Error Codes

| Code             | HTTP | Description             |
| ---------------- | ---- | ----------------------- |
| RATE_LIMITED     | 429  | Too many requests       |
| NOT_FOUND        | 404  | Resource not found      |
| VALIDATION_ERROR | 400  | Invalid input (Zod)     |
| UNAUTHORIZED     | 401  | No valid session        |
| DB_ERROR         | 409  | Database conflict       |
| INTERNAL_ERROR   | 500  | Unexpected server error |
