# منصة التحكم لتحويل PWA إلى تطبيقات متجرية

منصة **Control Plane** جاهزة للإنتاج لتحويل أي PWA تعمل عبر HTTPS إلى تطبيقات **Android TWA** و **iOS WKWebView**، مع أتمتة كاملة عبر **GitHub Actions**. تقوم المنصة بتأمين الأسرار، إدارة المشاريع، ربط المستودعات، تشغيل الـ workflows، وتتبع عمليات البناء — وكل ذلك محمي بـ **API Key** + **Rate Limit** + **IP Ban**.

> هذا المستودع يمثل الـ Backend فقط. أما مشروع الـ wrappers (TWA / WKWebView) وملفات Fastlane وGitHub Actions فتكون داخل المستودع الذي تديره المنصة.

---

## المزايا

- مصادقة عبر **Developer API Keys** باستخدام HMAC.
- **حظر IP بعد عدد محدد من المحاولات الفاشلة** مع زمن انتهاء.
- **Rate Limits** عالمي وعلى مستوى الـ API Key.
- تشفير الأسرار باستخدام **AES-256-GCM**.
- إدارة المشاريع (النطاق، معرفات iOS/Android).
- تكامل كامل مع GitHub:
  - تخزين PAT بشكل آمن
  - رفع secrets إلى repo
  - تشغيل workflows
  - متابعة الـ runs
- **سجلات تدقيق (Audit Logs)** لكل عمليات الوصول الحساسة.

---

## نظرة معمارية

**طبقة التحكم (هذا المشروع):**
- تخزين بيانات المشاريع والأسرار المشفرة وسجلات التدقيق.
- حماية الوصول بواسطة API keys وقيود المعدلات وحظر IP.
- ربط GitHub Actions لإرسال الأسرار وتشغيل عمليات البناء.

**طبقة التنفيذ (مستودعات التطبيقات):**
- تحتوي على wrappers (TWA / WKWebView) وFastlane.
- GitHub Actions تقوم بالبناء والرفع إلى **Google Play** و **Apple TestFlight / App Store**.

---

## التقنيات المستخدمة

- **Node.js + TypeScript**
- **Fastify** لخادم الـ API
- **Postgres** (عبر Prisma)
- **Redis** للـ Rate Limit وحظر IP
- **Octokit** لـ GitHub API
- **AES-256-GCM** لتشفير الأسرار

---

## هيكل المشروع

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

## التشغيل

### 1) تثبيت الاعتمادات

```bash
npm install
```

### 2) تشغيل Postgres + Redis

```bash
docker compose up -d
```

### 3) إعداد البيئة

انسخ `.env.example` إلى `.env` وحدد القيم:

```bash
cp .env.example .env
```

توليد المفاتيح:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

ضع الناتج في:

- `MASTER_KEY_B64`
- `APIKEY_HMAC_SECRET_B64`

### 4) تهيئة قاعدة البيانات

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5) إنشاء أول API Key (Admin)

```bash
npm run bootstrap
```

### 6) تشغيل الخادم

```bash
npm run dev
```

الوثائق:

```
http://localhost:8080/docs
```

---

## التوثيق

- توثيق إنجليزي: `docs/README.md`
- توثيق عربي: `docs/README-ar.md`

---

## ملاحظات أمنية

- Endpoint تنزيل الأسرار يرجع القيمة **decrypted** لذلك يجب تقييده بالـ role وإبقاء سجل تدقيق.
- يفضّل تشغيل المنصة خلف WAF أو Nginx.
- استخدام GitHub App أكثر أماناً من PAT على المدى الطويل.

---

## أفكار تطوير لاحقة

- فحص PWA عبر `/v1/projects/:id/pwa/validate`.
- Endpoint لتوليد Repo جاهز بالـ wrappers والـ workflows.
- تتبع الإصدارات عبر `/v1/projects/:id/releases`.
