# توثيق الـ API (عربي)

هذا المستند يشرح كيفية استخدام منصة التحكم لتحويل PWA إلى تطبيقات متجرية، ونظام المصادقة، وكيفية تنفيذ خط البناء الكامل PWA → Android/iOS.

---

## رابط الخدمة

```
http://localhost:8080
```

---

## المصادقة (API Key)

جميع الـ endpoints تتطلب API Key داخل الـ header:

```
x-api-key: YOUR_API_KEY
```

### كيف يتم تخزين المفاتيح
- لا يتم تخزين أي مفتاح بشكل صريح.
- يتم تخزين **HMAC-SHA256 hash** في قاعدة البيانات.
- التحقق يتم باستخدام **timing-safe comparison**.

### سياسة حظر IP
- يتم حظر الـ IP بعد عدد معين من المحاولات الفاشلة.
- الإعدادات:
  - `BAN_AFTER_FAILS`
  - `BAN_TTL_SECONDS`
  - `FAIL_TTL_SECONDS`

### Rate Limiting
- حد عام لكل IP: `RATE_GLOBAL_PER_IP_PER_MIN`
- حد إضافي لكل API Key: `RATE_PER_KEY_PER_MIN`

---

## مسار العمل (Pipeline)

1) إنشاء مشروع جديد (النطاق + المعرفات).
2) تخزين الأسرار بأمان.
3) ربط المستودع الخاص بالمشروع.
4) تخزين GitHub PAT بأمان.
5) رفع الأسرار إلى GitHub Actions secrets.
6) تشغيل workflows الخاصة بالبناء والنشر.
7) تتبع الـ runs والتقارير.

---

## دليل النشر وسياسة الخصوصية

تم تجهيز دليل مفصل للمبتدئين ويتم توفيره كملفات Markdown.

### ملفات الدليل
- `docs/guides/publishing-guide-en.md`
- `docs/guides/publishing-guide-ar.md`

### قوالب سياسة الخصوصية
- `docs/templates/privacy-policy-en.md`
- `docs/templates/privacy-policy-ar.md`

### صفحة خصوصية عامة (HTML)

يمكن مشاركة الرابط مع فريق مراجعة المتاجر:

```
/public/projects/:id/privacy
/public/projects/slug/:slug/privacy
```

لاستخدام اسم عام، ضع `publicSlug` في المشروع (3–32 حرفاً، فريد، حروف صغيرة وأرقام وشرطة).
---

## الـ Endpoints

### الصحة

#### `GET /v1/health`
فحص بسيط لحالة الخدمة.

**الاستجابة**
```json
{ "ok": true, "data": { "status": "up" } }
```

---

### مفاتيح المطورين

#### `POST /v1/devkeys`
إنشاء API Key جديد (Admin فقط).

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

> المفتاح يُعرض مرة واحدة فقط. قم بحفظه بأمان.

---

#### `GET /v1/me`
جلب معلومات المطوّر الحالي.

---

### المشاريع

#### `POST /v1/projects`
إنشاء مشروع (PWA).

**Body**
```json
{
  "name": "My PWA",
  "domain": "https://pwa.example.com",
  "iosBundleId": "com.example.pwa",
  "iosScheme": "EXAMPLEPWA",
  "androidPackage": "com.example.pwa",
  "publicSlug": "my-app"
}
```

---

#### `GET /v1/projects`
قائمة المشاريع الخاصة بالمطوّر.

---

#### `GET /v1/projects/:id`
جلب مشروع محدد بالـ ID.

---

#### `PATCH /v1/projects/:id`
تحديث بيانات المشروع وربط GitHub.

**Body**
```json
{
  "githubOwner": "ORG_OR_USER",
  "githubRepo": "REPO_NAME",
  "publicSlug": "my-app"
}
```

---

#### `DELETE /v1/projects/:id`
حذف المشروع والأسرار والبناءات المرتبطة به.

---

### الأسرار (Credentials)

#### `PUT /v1/projects/:id/credentials/:type`
حفظ/تحديث سر (مشفّر).

**الأنواع المتاحة**
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
عرض أنواع الأسرار المخزنة فقط (بدون القيم).

---

#### `POST /v1/projects/:id/credentials/:type/download`
تنزيل سر **مفكوك التشفير**.

> Endpoint حساس ويجب تقييده.

---

### GitHub Integration

#### `PUT /v1/projects/:id/github/pat`
تخزين GitHub Personal Access Token.

**Body**
```json
{ "pat": "ghp_xxx" }
```

---

#### `POST /v1/projects/:id/github/sync-secrets`
رفع الأسرار إلى GitHub Actions repo secrets.

**متطلبات**
- لابد من ربط `githubOwner` و `githubRepo`.
- يجب أن يكون PAT محفوظًا مسبقًا.

---

#### `POST /v1/projects/:id/github/dispatch`
تشغيل workflow داخل GitHub Actions.

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
عرض قائمة تشغيلات workflows.

استعلام اختياري:
```
?workflow=ios-testflight.yml
```

---

#### `GET /v1/projects/:id/github/runs/:runId`
جلب تفاصيل تشغيل محدد.

---

### الأدلة والسياسات

#### `GET /v1/projects/:id/guides/publishing`
جلب دليل النشر المفصل بصيغة Markdown.

استعلام:
```
?lang=en|ar
```

---

#### `GET /v1/projects/:id/privacy-policy`
جلب سياسة الخصوصية بصيغة Markdown مع تعبئة بيانات المشروع.

استعلام:
```
?lang=en|ar
```

---

### سياسة الخصوصية العامة (HTML)

#### `GET /public/projects/:id/privacy`
صفحة HTML عامة لإرسالها لمراجعة المتاجر.

استعلام اختياري:
```
?lang=en|ar
```

---

#### `GET /public/projects/slug/:slug/privacy`
صفحة HTML عامة باستخدام الاسم العام الفريد.

استعلام اختياري:
```
?lang=en|ar
```

---

## أسرار GitHub المقترحة

يتم ضبطها عبر `/github/sync-secrets`:

- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_KEY_P8_B64`
- `UPLOAD_JKS_B64`
- `UPLOAD_JKS_PASS`
- `UPLOAD_KEY_ALIAS`
- `UPLOAD_KEY_PASS`
- `GOOGLE_PLAY_SA_B64`

---

## أمثلة سريعة

### إنشاء مشروع
```bash
curl -X POST http://localhost:8080/v1/projects \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"My PWA","domain":"https://pwa.example.com"}'
```

### ربط GitHub
```bash
curl -X PATCH http://localhost:8080/v1/projects/PROJECT_ID \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"githubOwner":"ORG","githubRepo":"REPO"}'
```

### حفظ PAT
```bash
curl -X PUT http://localhost:8080/v1/projects/PROJECT_ID/github/pat \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"pat":"ghp_xxx"}'
```

### رفع الأسرار
```bash
curl -X POST http://localhost:8080/v1/projects/PROJECT_ID/github/sync-secrets \
  -H "x-api-key: ADMIN_KEY"
```

### تشغيل Workflow
```bash
curl -X POST http://localhost:8080/v1/projects/PROJECT_ID/github/dispatch \
  -H "x-api-key: ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"workflowFile":"android-release.yml","ref":"main"}'
```
