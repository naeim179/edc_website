# دليل التسليم والنشر

## محتويات التسليم

- المستودع والـlockfile ونسخة الإصلاح ونتائج الفحوصات.
- نقل صلاحيات GitHub والاستضافة والنطاق وDNS وSupabase وPayTabs ومزودي الفيديو
  عبر دعوات الفرق أو نقل الملكية. انقل الأسرار عبر مدير أسرار، خارج Git وZIP.
- نسخة احتياطية من قاعدة البيانات وخطة استعادة ملفات Storage؛ ملف schema
  وحده لا ينقل مستخدمي Auth أو الملفات والفيديوهات.
- مسؤول عن الفواتير وتجديد النطاق وSMTP وتسويات الدفع والطلبات تحت المراجعة.

## تحديث قاعدة قائمة

1. جهّز staging مستقلًا ونسخة احتياطية قابلة للاستعادة. استخدم بوابة دفع
   اختبارية، ولا تشغّل التجديد الآلي على بيانات بطاقات حقيقية في staging.
2. طابق سجل migrations مع المشروع. إذا كانت ملفات مطبّقة يدويًا، راجع السجل
   قبل `db push`؛ بعض migrations القديمة تحذف محادثات.
3. ملفات هذه الحزمة الجديدة:
   - `20260921165900_restore_lesson_metadata_view.sql`: متطلبات تاريخية ناقصة؛
     لا يعيد تعريف view موجود.
   - `20261106153555_protect_lesson_content.sql`: كتالوج آمن وعداد وحماية قراءة المحتوى.
   - `20261106152644_track_bunny_video_ownership.sql`: ملكية أهداف رفع Bunny.
   - `20261106152652_complete_username_schema.sql`: أسماء المستخدمين ودوالها.
4. إذا كان عمود `profiles.username` موجودًا، افحص التعارضات قبل التطبيق:

   ```sql
   select lower(username), count(*) from public.profiles
   where username is not null
   group by lower(username) having count(*) > 1;
   ```

   حلّ التعارض بمراجعة أصحاب الحسابات؛ الـmigration يتوقف بدل إعادة تسمية
   مستخدمين تلقائيًا. backfill من Auth metadata يختار الأسماء الصحيحة والفريدة
   وغير المحجوزة فقط. أسماء الحسابات القديمة غير الموجودة تبقى `NULL`.
   راجع أيضًا الأسماء القديمة المخالفة لنمط 3–30 حرفًا إنجليزيًا/رقمًا/نقطة/شرطة
   سفلية أو للأسماء المحجوزة؛ قيود الكتابة الجديدة قد تمنع تحديث ملفاتها حتى
   تصحيح الاسم. لا تعِد تسمية حساب قائم بدون مراجعة مالكه.
5. بعد ربط Supabase CLI بمشروع staging المقصود:

   ```bash
   npx supabase migration list
   npx supabase db push --include-all --dry-run
   ```

   راجع القائمة قبل `npx supabase db push --include-all`. الخيار مطلوب للملف
   التاريخي الجديد؛ لا تستخدمه لتجاوز سجل غير مفهوم، ولا تعِد تشغيل ملفات قديمة.
6. نسّق نافذة صيانة لتطبيق migrations ونشر التطبيق الجديد معًا. الكتالوج
   الجديد بلا محتوى، وعقد Mux تغيّر إلى `lessonId` بدل `playbackId`؛ حدّث
   العميل والسيرفر معًا واطلب إعادة تحميل الصفحات المفتوحة.
7. نفّذ فحص القبول أدناه على staging ثم كرر الخطوات على الإنتاج بعد نجاحه.

عند تعطل النشر، احتفظ بسياسات الحماية وأوقف الوصول مؤقتًا حتى تصحيح التطبيق.
إعادة كود قديم وحده لا تتوافق مع الكتالوج الآمن أو عقد Mux الجديد.

## Supabase والمدير الأول

- اضبط Auth Site URL على `SITE_URL` النهائي، وأضف
  `https://YOUR_DOMAIN/reset-password` لقائمة Redirect URLs وروابط التطوير
  المناظرة عند الحاجة. جهّز SMTP واختبر التسجيل واستعادة كلمة المرور.
- أنشئ حساب المدير عبر Auth، ثم من SQL Editor بصلاحيات مالك القاعدة:

  ```sql
  update public.profiles
  set role = 'admin', is_super_admin = true, permissions = '{}'
  where id = 'REPLACE_WITH_VERIFIED_AUTH_USER_UUID';
  ```

  استخدم UUID الحساب الذي تحققت من هويته، وليس حسابًا تختاره من بيانات تجريبية.
- buckets من migrations: `images` عام؛ `chat-files` و`payment-proofs` و
  `assignment-files` خاصة. انقل الملفات بشكل مستقل مع مراعاة `owner_id`.
- بعد تحديث المشروع يمكن إعادة توليد `lib/supabase/database.types.ts` بواسطة
  `npx supabase gen types typescript --project-id PROJECT_REF` ثم فحص TypeScript.

## الفيديو والصور

- Mux: الـPlayback ID يُقرأ من درس حقيقي على السيرفر. المعاينة المنشورة أو
  صاحب صلاحية الدرس فقط يحصل على توكن. التوكن الحالي مدته أربع ساعات؛ التوكنات
  المصدرة سابقًا تبقى صالحة حتى انتهاء مدتها ما لم تُلغ مفاتيحها عند المزود.
- Bunny: كل فيديو جديد يُسجّل مع الدورة والمكتبة قبل إصدار هدف الرفع. تُفحص
  إدارة الدورة وملكية الفيديو في كل رفع. الفيديوهات القديمة تبقى قابلة
  للمشاهدة؛ لاستبدال فيديو قديم غير مسجل ارفع فيديو جديدًا واحفظ الدرس.
- إذا نجح إنشاء فيديو Bunny وفشل تسجيله بالقاعدة، لن يصدر هدف رفع. قد يبقى
  فيديو فارغ يُنظف من لوحة Bunny بواسطة المشغل.
- حماية روابط Bunny خارج التطبيق تُضبط لدى Bunny نفسه (إعدادات embed والنطاق).
  هذه الحزمة لا تغيّر إعدادات مزود خارجي.
- حذف صورة المدرس يمر بصلاحيات صاحب الطلب. ملف قديم رفعه مدير نيابة عن المدرس
  قد يحتاج تنظيفًا من مدير مخوّل؛ إزالة الرابط لا تعطي المدرس ملكية ملفات غيره.

## Cloudflare والدفع وCron

1. راجع `wrangler.jsonc`: اسم التطبيق وKV والنطاق وقيم Supabase ومزودي الفيديو
   تخص المالك الحالي. حدّثها عند نقل المشروع. قيم `NEXT_PUBLIC_` مطلوبة عند
   البناء أيضًا؛ لا تستخدم service role مكان المفتاح العام.
2. ضع أسرار التطبيق في العامل المستهدف عبر لوحة Cloudflare أو
   `npx wrangler secret put NAME`: مفتاح Supabase الإداري، مفتاح PayTabs،
   `CRON_SECRET`، وأسرار مزودي الفيديو المستخدمة. لا تحفظها في ملفات التسليم.
3. جهّز حساب PayTabs المقصود و`SITE_URL` الصحيح عبر HTTPS. التطبيق يرسل callback
   إلى `/api/payments/webhook` وreturn إلى `/api/payments/return`.
4. بعد نجاح staging:

   ```bash
   npm run build:vinext
   npm run deploy:vinext
   ```

5. راجع `MAIN_APP.service` بعامل Cron ليطابق اسم التطبيق المنشور. اضبط
   `APP_URL` على عنوانه و`CRON_SECRET` على نفس سر التطبيق:

   ```bash
   npx wrangler secret put CRON_SECRET --config cloudflare/renewal-cron/wrangler.jsonc
   npx wrangler deploy --config cloudflare/renewal-cron/wrangler.jsonc --var APP_URL:https://YOUR_DOMAIN
   ```

   التسوية إلى `/api/payments/reconcile` كل خمس دقائق؛ التجديد إلى
   `/api/subscriptions/renew` كل ساعة. لا تضف Cron آخر لنفس المهمة دون حاجة.
6. راقب `paytabs_fulfillment_reviews` وسجلات العامل والطلبات غير المحسومة،
   وحدّد مسؤول الاستردادات والمراجعة اليدوية مع مالك حساب الدفع.

## فحص قبول staging

- تسجيل اسم جديد؛ رفض اسم مكرر بحالة أحرف مختلفة واسم محجوز؛ تعديل الاسم
  والدخول بالاسم الجديد والبريد؛ استعادة كلمة المرور.
- زائر يرى المنهج والمعاينات فقط. طالب غير مشترك أو اشتراكه منتهٍ لا يرى
  المحتوى المدفوع عبر الواجهة أو REST مباشر. الكتالوج لا يُرجع روابط، والعداد كامل.
- اشتراك فعال ومدرس مسؤول يقرآن المحتوى المسموح؛ Mux يعمل لهما وللمعاينة
  ويرفض الطلب الحر أو الدرس غير المصرّح.
- مدرس يرفع Bunny لدورته ويُرفض رفعه لهدف دورة أخرى أو فيديو غير مسجل.
- المدرس يزيل صورته؛ رابط صورة شخص آخر لا يؤدي لحذف ملفه.
- PayTabs: نجاح ورفض وإلغاء وcallback مكرر واستجابة متأخرة؛ كوبون وحجز Private
  وCliQ وتجديد. اختبر sandbox والـCron قبل فتح الدفع الحقيقي.
- العربية والإنجليزية والموبايل والواجبات والمحادثات، ثم توثيق استلام الحسابات.

نجاح البناء والفحوصات المحلية لا يثبت إعداد حسابات الخدمات أو نقل ملكية
الملفات؛ تُستكمل هذه النقاط في staging والحسابات المعنية.

## Production rollout on 6 November 2026

The compatible lesson-count RPC, Bunny ownership table and username repair were
applied before the application rollout. Their filenames match the actual MCP
migration-history versions. The content-catalog/RLS migration was finalized as version 20261106153555 after
the new application was serving, so the previous lesson page remained compatible
during the Cloudflare build.

Original source and pre-rollout function/policy definitions are retained on
`backup/before-security-2026-11-06` at commit
`e3ca9d7c6bc403712324755b8d5acf95dc1782fb`. This is source/schema recovery,
not a full customer-data or Storage backup. Previous Cloudflare version:
`4e2e4f38-fd8b-4f51-bb64-c63d9dc7fb0d`.

## تجهيز مراجعة الدفع والسياسات

راجع [قائمة جاهزية PayTabs](PAYTABS-READINESS.md) للصفحات الجاهزة، ومسودات السياسات، والبيانات التجارية المطلوبة والمؤجل. تبقى السياسات مسودات إلى اعتماد صاحب النشاط؛ ولا تُفعّل موافقة شراء ملزمة بناءً عليها. معاينة الموافقة متاحة في `/policy-review` وغير مفعّلة في الدفع.
