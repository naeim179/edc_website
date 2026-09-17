-- Remove offer relation from teachers assignment

alter table public.course_instructors
drop constraint if exists course_instructors_unique_offer_teacher;


alter table public.course_instructors
drop column if exists offer_id;


alter table public.course_instructors
drop constraint if exists course_instructors_course_id_teacher_id_key;


alter table public.course_instructors
add constraint course_instructors_course_teacher_unique
unique(course_id, teacher_id);
