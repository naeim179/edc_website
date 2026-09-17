-- Add course type

create type public.course_type_enum
as enum (
  'group',
  'private'
);


alter table public.courses
add column if not exists course_type public.course_type_enum;


-- Temporary default for existing courses
update public.courses
set course_type = 'group'
where course_type is null;


alter table public.courses
alter column course_type set not null;
