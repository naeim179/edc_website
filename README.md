# Your Way — المنصة التعليمية

منصة عربية/إنجليزية للدورات المسجلة والمباشرة، الطلاب والمدرسين والإدارة،
الاشتراكات والحجز والواجبات والمحادثات. تستخدم Next.js وReact وSupabase،
وتدعم Cloudflare عبر vinext، وPayTabs وCliQ للدفع.

## التشغيل المحلي

المتطلبات: Node.js 24 LTS وnpm. استخدم الـlockfile لتثبيت نفس إصدارات الحزم.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

املأ `.env.local` بقيم مشروع تطوير أو staging قبل التشغيل. العنوان
http://localhost:3000. بديل Cloudflare المحلي: `npm run dev:vinext` على 3001.
لا تشغّل المسارين على نفس نسخة العمل بالتزامن؛ كلاهما يولّد أنواعًا داخل `.next`.

## قاعدة البيانات

مع Docker محلي يمكنك إنشاء Supabase للتطوير:

```bash
npx supabase start
npx supabase db reset --local
```

الأمر الثاني يعيد إنشاء **القاعدة المحلية**. انسخ URL والمفتاح العام ومفتاح
service role من إعدادات Supabase المحلي إلى `.env.local` بدون حفظها في Git.
يمكن بدلًا من ذلك استخدام مشروع Supabase staging مستقل.

جميع migrations داخل `supabase/migrations/`. الملف الجديد
`20260921165900_restore_lesson_metadata_view.sql` يرمّم متطلبات تاريخية كانت
موجودة يدويًا. اقرأ [دليل التسليم](docs/HANDOVER.md) قبل تحديث قاعدة قائمة.

## متغيرات البيئة

`.env.example` يحتوي أسماء المتغيرات بدون أسرار:

| المجموعة | المتغيرات |
|---|---|
| Supabase — مطلوبة | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| الموقع | `SITE_URL` — العنوان المطلق النهائي؛ محلي في التطوير |
| PayTabs | `PAYTABS_BASE_URL`, `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY` |
| Cron | `CRON_SECRET` — نفس السر في التطبيق وعامل الجدولة |
| CliQ | `CLIQ_ALIAS`, `CLIQ_ACCOUNT_NAME` |
| Mux | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY` |
| Bunny | `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY` |

قيم `NEXT_PUBLIC_` عامة وتُستخدم عند بناء العميل. مفاتيح service role والدفع
والفيديو وCron تبقى على السيرفر. الـPEM يقبل أسطرًا فعلية أو `\n`.
مزود الفيديو اختياري؛ يجب إعداد مفاتيح المزود الذي ستستخدمه.

## الفحوصات والبناء

```bash
npm test
npm run test:db
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

`npm test` اختبارات أمان معزولة للمسارات بدون اتصال بالخدمات. `npm run test:db`
يتطلب Bash وDocker محليًا، ويطبّق جميع migrations على PostgreSQL 17 مؤقت بدون
منفذ خارجي ثم يفحص سياسات المحتوى والأسماء والصور ويحذف الحاوية. يستخدم بدائل
اختبارية لـAuth وStorage؛ يلزم اختبار تكامل على Supabase staging.

إذا منعت البيئة منافذ Turbopack الداخلية: `npm run build -- --webpack`.
بعد بناء vinext، أعد `npx next typegen` قبل فحص TypeScript أو بناء Next.js.
اختبار تسوية الدفع في `supabase/staging-expiry-recovery-test.sql` يحتاج staging
وبيانات دفع تجريبية؛ راجع `README-payment-fix-AR.txt`، ولا تشغله على الإنتاج.

## الاستضافة

- Next.js: `npm run build` ثم `npm start`.
- Cloudflare: `npm run build:vinext` ثم `npm run deploy:vinext` بعد تجهيز الحساب.
- Cron منفصل في `cloudflare/renewal-cron/`: تسوية كل خمس دقائق وتجديد كل ساعة؛
  يحتاج `APP_URL` و`CRON_SECRET` وservice binding باسم `MAIN_APP`.

إعدادات `wrangler.jsonc` الحالية تخص موارد المالك الأصلي. راجع اسم العامل
والنطاق وKV وSupabase ومزودي الفيديو عند نقل الملكية وفق [دليل التسليم](docs/HANDOVER.md).
