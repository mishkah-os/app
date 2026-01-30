# PWA Control Plane

A production-minded **control plane** that turns any HTTPS PWA into Android **TWA** and iOS **WKWebView** apps, orchestrated through **GitHub Actions**. It provides secure secrets management, project metadata, GitHub repo integration, workflow dispatching, and build/run tracking — all protected by **API key authentication**, **IP banning**, and **rate limiting**.

> This repository is the backend “control plane”. Your mobile wrappers, Fastlane scripts, and GitHub Actions workflows live in the target repo(s) that the control plane provisions and manages.

---

## Features

- **Developer API Key auth** with HMAC hashing.
- **IP ban after N failed attempts** (with TTL) and global + per-key **rate limits**.
- **AES-256-GCM** encryption for all sensitive secrets (Apple/Google/Android keystore/OAuth tokens).
- **Project management** (PWA domain, Android package, iOS bundle info).
- **GitHub integration** to:
  - store PAT securely
  - sync secrets into repo Actions secrets
  - dispatch workflows
  - list workflow runs / retrieve run details
- **Audit logging** for sensitive actions (secret updates and downloads).

---

## Architecture Overview

**Control Plane** (this repo):
- Stores project metadata, encrypted secrets, and audit logs.
- Secures access with API keys, rate limiting, and IP bans.
- Talks to GitHub Actions to inject secrets and trigger builds.

**Execution Plane** (your repo):
- Contains the actual mobile wrappers (TWA / WKWebView) and Fastlane automation.
- GitHub Actions workflows build and upload to **Google Play** and **Apple TestFlight / App Store**.

---

## Tech Stack

- **Node.js + TypeScript**
- **Fastify** for the API server
- **Postgres** for persistent data (Prisma ORM)
- **Redis** for rate limits and IP ban tracking
- **Octokit** for GitHub API
- **AES-256-GCM** encryption for secrets

---

## Project Structure

```
pwa-control-plane/
  docker-compose.yml
  package.json
  tsconfig.json
  .env.example
  prisma/
    schema.prisma
  src/
    server.ts
    env.ts
    crypto.ts
    http.ts
    plugins/
      auth.ts
      rate.ts
    routes/
      health.ts
      devkeys.ts
      projects.ts
      credentials.ts
      github.ts
    integrations/
      github.ts
  scripts/
    bootstrap.ts
```

---

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Start Postgres + Redis

```bash
docker compose up -d
```

### 3) Configure environment

Copy `.env.example` to `.env` and set the required values:

```bash
cp .env.example .env
```

Generate keys:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set in `.env`:

- `MASTER_KEY_B64`
- `APIKEY_HMAC_SECRET_B64`

### 4) Initialize database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5) Create first admin API key

```bash
npm run bootstrap
```

### 6) Run server

```bash
npm run dev
```

Open docs:

```
http://localhost:8080/docs
```

---

## API Documentation

- English docs: `docs/README.md`
- Arabic docs: `docs/README-ar.md`
- Beginner guide (EN/AR): `docs/guides/publishing-guide-en.md`, `docs/guides/publishing-guide-ar.md`
- Privacy policy templates: `docs/templates/privacy-policy-en.md`, `docs/templates/privacy-policy-ar.md`

---

## Security Notes

- The **secret download** endpoint returns decrypted values; restrict it by role and keep audit logs.
- Run behind a WAF / reverse proxy (Cloudflare / Nginx) for extra DDoS protection.
- Prefer GitHub App installations for production. PAT is easier to start but less secure.

---

## Roadmap Suggestions

- `/v1/projects/:id/pwa/validate` to check manifest, service worker, HTTPS.
- `/v1/templates/repo` to bootstrap wrapper repos automatically.
- `/v1/projects/:id/releases` to track TestFlight / Play releases.
