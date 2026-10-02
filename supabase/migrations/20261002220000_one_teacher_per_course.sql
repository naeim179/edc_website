-- Each course can have only one assigned teacher.
--
-- Existing unique(course_id, teacher_id) prevents the same teacher/course pair
-- from being duplicated, but it still allows two different teachers
-- to be assigned to the same course.
--
-- This constraint closes that gap at database level.

alter table public.course_instructors
drop constraint if exists course_instructors_one_teacher_per_course;

alter table public.course_instructors
add constraint course_instructors_one_teacher_per_course
unique (course_id);
