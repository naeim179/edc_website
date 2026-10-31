Your Way - PayTabs expired checkout recovery patch
===============================================

المحتويات:
1) app/api/payments/reconcile/route.ts
   - يتعرف على X كمعاملة منتهية غير مدفوعة.
   - Canary يطلب نفس cart_id وtran_ref وحالة A قبل السماح بإغلاق 404.
   - يسجل أخطاء تحديث آخر فحص في طابور التسوية.
   - يتعامل مع 404 code 2 No entries found بعد هامش 15 دقيقة فقط.
2) supabase/migrations/20261031090000_paytabs_expired_unpaid_recovery.sql
   - Migration جديدة، بصلاحية service_role فقط، تمنع إغلاق الطلبات المدفوعة
     والمحاولات تحت المراجعة، وتحرر كوبون الحجز/موعد Private عند الأهلية.
3) supabase/staging-expiry-recovery-test.sql
   - اختبار إلزامي على مشروع STAGING منفصل، داخل BEGIN / ROLLBACK.
   - عند ظهور TEST FAILED أو توقف psql، اعتبر الاختبار غير ناجح.

للتثبيت بعد وضع الـZIP داخل جذر المشروع D:\educational-platform:
  git diff --quiet -- app/api/payments/reconcile/route.ts && unzip -o your-way-payment-fix.zip

ثم افحص قبل أي نشر:
  git diff --check
  npx tsc --noEmit
  git diff -- app/api/payments/reconcile/route.ts
  git status --short

مهم:
- إذا كانت migration بهذا الاسم قد طُبقت مسبقاً، لا تعيد كتابة ملفها؛
  أنشئ migration جديدة للفرق بدلاً من ذلك.
- لا تشغّل اختبار SQL على قاعدة الإنتاج؛ يتطلب اتصال STAGING_DB_URL بقاعدة
  منفصلة مع بيانات تجريبية وطلب PayTabs غير مدفوع عمره أكثر من 15 دقيقة.
- الاختبار يجب أن ينفذ بدور DB يسمح باستدعاء RPCs (عادة دور staging postgres)
  ويجب أن تتأكد أن بيانات الاختبار لم تنتج عن دفع حقيقي.
- مثال للأمر في staging بعد إعداد متغيرات الاتصال ومعرّفات الاختبار:
  psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
    -v order_id=YOUR_TEST_ORDER_UUID \
    -v attempt_id=YOUR_TEST_ATTEMPT_UUID \
    -f supabase/staging-expiry-recovery-test.sql
- على قاعدة staging: طبّق migration أولاً، ثم شغّل اختبار SQL، وبعدها اختبر
  cron على staging باستخدام بوابة PayTabs الاختبار فقط.
- لا تنشر Worker الجديد على production قبل تطبيق migration على production
  بعد نجاح الاختبارات؛ وإلا سيحصل خطأ في الاستعلام عن عمود
  paytabs_last_reconciled_at.
- حد 15 دقيقة ليس ضماناً أن الدفع لن ينجح متأخراً. PayTabs تشير إلى أن
  حالات 3DS المهجورة قد لا تُسجل حتى الاستعلام الدوري للبنك بعد أكثر من ساعة.
  إذا ظهر تأكيد متأخر يتحول إلى مراجعة يدوية؛ قد يلزم استرداد دفعة مكررة.
  ناقش تمديد الهامش واختبار أثره قبل استخدام بوابة حقيقية.
- راقب paytabs_fulfillment_reviews ونتائج reconcile باستمرار.

ملاحظة: تم فحص صياغة TypeScript محلياً بدون أخطاء؛ لم يتم تشغيل build
كامل أو اختبار Postgres/PayTabs فعلي من هنا، لأن المشروع وبيئة staging
غير موجودين في بيئة إنشاء الحزمة.
