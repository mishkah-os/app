# دليل النشر (شرح مبسّط جداً للمبتدئين)

هذا الدليل مكتوب لشخص **لا يعرف شيئاً عن المتاجر** لكنه يملك PWA شغّالة عبر HTTPS. سنمشي خطوة بخطوة حتى تعرف كيف تُجهّز حساباتك ومفاتيحك وكيف ترفع تطبيقك إلى Google Play وApp Store.

---

## 0) قبل أن تبدأ (ماذا تحتاج؟)

- موقع PWA شغّال على HTTPS.
- بريد إلكتروني فعّال.
- بطاقة دفع (لرسوم الاشتراك في المتاجر).
- مكان آمن لحفظ المفاتيح (Password Manager).

---

## 1) إنشاء حساب GitHub

1. افتح https://github.com وأنشئ حساباً جديداً.
2. فعّل **المصادقة الثنائية (2FA)** لحماية حسابك.
3. أنشئ **مستودع جديد** (يفضّل خاص/Private).
4. هذا المستودع سيحتوي على:
   - ملفات Android TWA
   - ملفات iOS WKWebView
   - ملفات البناء والنشر (Workflows)

---

## 2) Google Play Console (أندرويد)

### 2.1 التسجيل في Play Console

1. ادخل إلى https://play.google.com/console.
2. ادفع رسوم التسجيل (مرة واحدة).
3. أكمل بيانات حساب المطوّر (الاسم، العنوان، البريد).

### 2.2 إنشاء تطبيق جديد

1. اضغط **Create app**.
2. أدخل اسم التطبيق واللغة الافتراضية.
3. اختر النوع: **App**.
4. اختر اسم الحزمة (Package Name) مثل:

```
com.company.app
```

### 2.3 إنشاء مفتاح توقيع أندرويد (Keystore)

ستحتاج مفتاح رفع (Upload Key).

1. من جهازك نفّذ الأمر:

```bash
keytool -genkeypair -v \
  -keystore upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

2. احتفظ بهذه الأشياء **بدقة**:
   - ملف `upload.jks`
   - كلمة مرور الـ keystore
   - الـ alias (مثل `upload`)
   - كلمة مرور الـ key

3. في Play Console → **App integrity**:
   - ارفع شهادة مفتاح الرفع.

> ⚠️ إذا فقدت مفتاح الرفع ستواجه مشاكل عند تحديث التطبيق. احفظه جيداً.

### 2.4 إنشاء حساب خدمة (Service Account)

هذا الحساب يستخدم في الرفع الآلي عبر CI/CD.

1. في Play Console → **Setup → API access**.
2. أنشئ **Service Account** في Google Cloud.
3. حمّل ملف JSON.
4. احتفظ به في مكان آمن.

---

## 3) Apple Developer Program (iOS)

### 3.1 الاشتراك في برنامج المطورين

1. ادخل https://developer.apple.com/programs/.
2. اشترك في **Apple Developer Program** (رسوم سنوية).
3. استخدم نفس Apple ID دائماً.

### 3.2 إنشاء التطبيق في App Store Connect

1. ادخل إلى https://appstoreconnect.apple.com.
2. افتح **My Apps** ثم **New App**.
3. اختر **Bundle ID** مثل:

```
com.company.app
```

### 3.3 إنشاء مفتاح App Store Connect API

1. App Store Connect → **Users and Access → Keys**.
2. أنشئ API Key جديد.
3. حمّل ملف `.p8` (مرة واحدة فقط).
4. احتفظ بهذه القيم:
   - Key ID
   - Issuer ID
   - ملف `.p8` (سنحوّله Base64 لاحقاً)

### 3.4 الشهادات والبروفايل

غالباً أدوات مثل Fastlane تُنشئها تلقائياً.
لكن لو تعملها يدوياً:

1. أنشئ **Distribution Certificate**.
2. أنشئ **Provisioning Profile** للنشر على App Store.

---

## 4) متطلبات المتاجر (صور وأيقونات)

### Google Play
- أيقونة التطبيق: **512x512 PNG**
- صورة مميزة: **1024x500**
- لقطات شاشة (Screenshots) لكل الأجهزة
- رابط سياسة الخصوصية (إجباري)

### Apple App Store
- أيقونة: **1024x1024**
- لقطات شاشة (iPhone و iPad)
- رابط سياسة الخصوصية (إجباري)
- معلومات المراجعة (بيانات التواصل)

> جهّز لقطات شاشة نظيفة وواضحة لتطبيقك.

---

## 5) ملفات البناء

- **Android**: ملف AAB (Android App Bundle)
- **iOS**: ملف IPA (موقّع للنشر)

هذه الملفات يتم إنتاجها بواسطة أدوات البناء (GitHub Actions + Fastlane).

### 5.1 تنزيل ملفات البناء (GitHub Actions)

1. افتح المستودع في GitHub.
2. اضغط **Actions**.
3. افتح آخر عملية ناجحة.
4. في قسم **Artifacts** قم بتنزيل:
   - ملف Android AAB
   - ملف iOS IPA

احفظ الملفات قبل رفعها إلى المتاجر.

---

## 6) تحديثات الإصدارات

كل إصدار جديد يجب أن ترفع الأرقام:

- Android: `versionCode` و `versionName`
- iOS: `CFBundleShortVersionString` و `CFBundleVersion`

احتفظ بسجل تغييرات صغير لكل إصدار.

---

## 7) إدارة المفاتيح عند التحديث

إذا احتجت تغيير المفاتيح:

- **Android upload key**: قدّم طلب Reset من Play Console.
- **Google Service Account**: أنشئ مفتاح جديد وألغِ القديم.
- **Apple API key**: أنشئ مفتاح جديد من App Store Connect.

ثم حدّث الأسرار في نظام الـ CI/CD.

---

## 8) سياسة الخصوصية (رابط مطلوب في المتاجر)

المتاجر تطلب رابط سياسة خصوصية واضح.

يمكنك استخدام رابط نسبي داخل النظام مثل:

```
/public/projects/:id/privacy
```

أو باستخدام اسم عام فريد:

```
/public/projects/slug/:slug/privacy
```

> يجب أن يكون الاسم العام فريد وطوله بين 3 و 32 حرفاً.

---

## 9) قائمة تحقق سريعة

- [ ] حساب GitHub نشط + مستودع جاهز
- [ ] حساب Google Play Console مفعل
- [ ] حساب Apple Developer مفعل
- [ ] ملف Keystore محفوظ بأمان
- [ ] ملف Service Account JSON محفوظ
- [ ] مفتاح App Store Connect محفوظ
- [ ] الأيقونات والصور جاهزة
- [ ] رابط الخصوصية جاهز
- [ ] أرقام الإصدارات تزداد مع كل تحديث

---

## 10) خطوات النشر النهائية

1. ارفع ملف AAB إلى Play Console.
2. ارفع ملف IPA إلى App Store Connect (TestFlight أولاً).
3. ارسل النسخة للمراجعة.
4. رد على أي ملاحظات من فريق المراجعة.
