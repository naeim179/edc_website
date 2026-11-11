-- Additive indexes: do not remove unique or rarely used integrity indexes.
set local lock_timeout = '5s';
create index if not exists sections_course_order_idx on public.sections(course_id,order_index,id);
create index if not exists lessons_section_order_idx on public.lessons(section_id,order_index,id);
create index if not exists course_instructors_teacher_course_idx on public.course_instructors(teacher_id,course_id);
create index if not exists orders_course_created_idx on public.orders(course_id,created_at desc,id);
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc,id);
create index if not exists orders_status_created_idx on public.orders(status,created_at desc,id);
create index if not exists courses_published_created_idx on public.courses(is_published,created_at desc,id);
create index if not exists courses_instructor_idx on public.courses(instructor_id);
create index if not exists sections_offer_idx on public.sections(offer_id);
create index if not exists conversations_course_idx on public.conversations(course_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists assignments_created_by_idx on public.assignments(created_by);
create index if not exists assignment_submissions_graded_by_idx on public.assignment_submissions(graded_by);
create index if not exists course_coupons_used_by_idx on public.course_coupons(used_by);
create index if not exists private_booking_slots_availability_idx on public.private_booking_slots(availability_slot_id);
create index if not exists announcements_created_by_idx on public.announcements(created_by);
create index if not exists coupon_redemptions_course_idx on public.coupon_redemptions(course_id);
create index if not exists paytabs_reviews_order_idx on public.paytabs_fulfillment_reviews(order_id);
create index if not exists paytabs_reviews_attempt_idx on public.paytabs_fulfillment_reviews(attempt_id);
create index if not exists bunny_video_uploads_course_idx on public.bunny_video_uploads(course_id);

-- auth.uid() is independent of a row. Cache it once per statement, preserving
-- policy roles, command, permissive/restrictive mode and all existing predicates.
do $$
declare p record; q text; c text; statement text;
begin
 for p in select * from pg_policies where schemaname in ('public','storage','realtime') loop
  q := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
  c := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
  q := regexp_replace(q, '(?<!SELECT )\m(is_admin|my_role|can_manage_courses|can_manage_announcements)\(\)', '(select \1())', 'g');
  c := regexp_replace(c, '(?<!SELECT )\m(is_admin|my_role|can_manage_courses|can_manage_announcements)\(\)', '(select \1())', 'g');
  if q is distinct from p.qual or c is distinct from p.with_check then
   statement := format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
   if q is not null then statement := statement || ' using (' || q || ')'; end if;
   if c is not null then statement := statement || ' with check (' || c || ')'; end if;
   execute statement;
  end if;
 end loop;
end $$;

-- Only an exact legacy duplicate may be removed. Keep the restrictive guard
-- and the other legitimate OR policies; merging them would change access rules.
do $$ begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename='lessons'
  and policyname='Read lessons: preview, enrolled or course staff' and permissive='PERMISSIVE'
  and cmd='SELECT' and qual='can_read_lesson(section_id, is_free_preview)') then
  drop policy "Read lessons: preview, enrolled or course staff" on public.lessons;
 end if;
end $$;
