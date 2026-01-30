# API Documentation (EN)

This document explains how to use the **PWA Control Plane** API, how authentication works, and how to orchestrate the full PWA → Android/iOS pipeline.

---

## Base URL

```
http://localhost:8080
```

---

## Authentication

All endpoints require an **API key** sent in the header:

```
x-api-key: YOUR_API_KEY
```

### How API keys are stored
- API keys are never stored in plaintext.
- A **HMAC-SHA256 hash** is stored in Postgres.
- Requests are validated using **timing-safe comparison**.

### IP Ban Policy
- After **N failed attempts**, the IP is temporarily banned.
- Configuration:
  - `BAN_AFTER_FAILS`
  - `BAN_TTL_SECONDS`
  - `FAIL_TTL_SECONDS`

### Rate Limiting
- Global per-IP rate limit: `RATE_GLOBAL_PER_IP_PER_MIN`
- Additional per-key rate limit: `RATE_PER_KEY_PER_MIN`

---

## Pipeline Flow (High Level)

1) **Create a project** with domain + IDs.
2) **Store credentials** securely (Apple/Google/Android).
3) **Attach GitHub repo** to the project.
4) **Store GitHub PAT** securely.
5) **Sync secrets** to repo Actions secrets.
6) **Dispatch GitHub Actions workflows**.
7) **Track workflow runs** and update release processes.

---

## Endpoints

### Health

#### `GET /v1/health`
Simple health check.

**Response**
```json
{ "ok": true, "data": { "status": "up" } }
```

---

### Developer Keys

#### `POST /v1/devkeys`
Create a new developer API key (Admin only).

**Headers**
```
x-api-key: ADMIN_KEY
```

**Body**
```json
{ "name": "Developer Name", "role": "DEV" }
```

**Response**
```json
{ "ok": true, "data": { "developerId": "...", "apiKey": "..." } }
```

> The API key is returned **once**. Store it securely.

---

#### `GET /v1/me`
Get the current developer identity.

**Response**
```json
{ "ok": true, "data": { "dev": { "id": "...", "name": "...", "role": "ADMIN" } } }
```

---

### Projects

#### `POST /v1/projects`
Create a project (PWA app).

**Body**
```json
{
  "name": "My PWA",
  "domain": "https://pwa.example.com",
  "iosBundleId": "com.example.pwa",
  "iosScheme": "EXAMPLEPWA",
  "androidPackage": "com.example.pwa"
}
```

**Response**
```json
{ "ok": true, "data": { "id": "...", "name": "..." } }
```

---

#### `GET /v1/projects`
List projects owned by the current developer.

---

#### `GET /v1/projects/:id`
Get a project by ID.

---

#### `PATCH /v1/projects/:id`
Update project metadata. Useful for GitHub repo binding.

**Body**
```json
{
  "githubOwner": "ORG_OR_USER",
  "githubRepo": "REPO_NAME"
}
```

---

#### `DELETE /v1/projects/:id`
Delete a project and all its secrets/builds.

---

### Credentials (Secrets)

#### `PUT /v1/projects/:id/credentials/:type`
Store or update a secret (encrypted at rest).

**Valid types**
- `APPLE_ASC_KEY_ID`
- `APPLE_ASC_ISSUER_ID`
- `APPLE_ASC_P8_B64`
- `ANDROID_UPLOAD_JKS_B64`
- `ANDROID_UPLOAD_JKS_PASS`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASS`
- `GOOGLE_PLAY_SA_B64`

**Body**
```json
{ "value": "SECRET_VALUE" }
```

---

#### `GET /v1/projects/:id/credentials`
List stored secret types for a project (metadata only).

---

#### `POST /v1/projects/:id/credentials/:type/download`
Download a secret (decrypted).

> This is sensitive. Keep it admin-only and audit all usage.

---

### GitHub Integration

#### `PUT /v1/projects/:id/github/pat`
Store GitHub Personal Access Token for repo access.

**Body**
```json
{ "pat": "ghp_xxx" }
```

---

#### `POST /v1/projects/:id/github/sync-secrets`
Sync stored secrets to GitHub Actions repo secrets.

**Requirements**
- Project must have `githubOwner` and `githubRepo`.
- PAT must be stored.

---

#### `POST /v1/projects/:id/github/dispatch`
Dispatch a GitHub Actions workflow.

**Body**
```json
{
  "workflowFile": "ios-testflight.yml",
  "ref": "main",
  "inputs": { "env": "prod" }
}
```

---

#### `GET /v1/projects/:id/github/runs`
List workflow runs.

Optional query:
```
?workflow=ios-testflight.yml
```

---

#### `GET /v1/projects/:id/github/runs/:runId`
Get details for a specific workflow run.

---

## Required GitHub Secrets (Suggested)

These are set by `/github/sync-secrets`:

- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_KEY_P8_B64`
- `UPLOAD_JKS_B64`
- `UPLOAD_JKS_PASS`
- `UPLOAD_KEY_ALIAS`
- `UPLOAD_KEY_PASS`
- `GOOGLE_PLAY_SA_B64`

---

## Example Usage

### Create Project
```bash
curl -X POST http://localhost:8080/v1/projects \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"My PWA","domain":"https://pwa.example.com"}'
```

### Attach GitHub Repo
```bash
curl -X PATCH http://localhost:8080/v1/projects/PROJECT_ID \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"githubOwner":"ORG","githubRepo":"REPO"}'
```

### Store PAT
```bash
curl -X PUT http://localhost:8080/v1/projects/PROJECT_ID/github/pat \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"pat":"ghp_xxx"}'
```

### Sync Secrets
```bash
curl -X POST http://localhost:8080/v1/projects/PROJECT_ID/github/sync-secrets \
  -H "x-api-key: ADMIN_KEY"
```

### Dispatch Workflow
```bash
curl -X POST http://localhost:8080/v1/projects/PROJECT_ID/github/dispatch \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"workflowFile":"android-release.yml","ref":"main"}'
```
