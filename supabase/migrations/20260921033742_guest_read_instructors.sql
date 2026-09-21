-- الزائر (anon) يحتاج صلاحية قراءة على الجداول نفسها (GRANT) غير سياسات الـ RLS.
-- الخطأ "permission denied for table ..." معناه ما في GRANT، مش إن السياسة ناقصة.

-- ربط المدرب بالدورة (السياسة الموجودة أصلاً بتحصرها بالدورات المنشورة)
grant select on public.course_instructors to anon;

-- من جدول profiles نعطي الزائر عمودين بس (الاسم والمعرّف). باقي الأعمدة (إيميل، هاتف...) تبقى محمية.
grant select (id, full_name) on public.profiles to anon;
