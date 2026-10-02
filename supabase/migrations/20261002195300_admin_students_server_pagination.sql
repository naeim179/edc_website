create or replace function public.admin_list_students(
  p_search text default null,
  p_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  id uuid,
  full_name text,
  phone text,
  email text,
  created_at timestamptz,
  enrollments_count bigint,
  active_courses_count bigint,
  expired_courses_count bigint,
  student_state text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with student_rows as (
    select
      p.id,
      p.full_name,
      p.phone,
      u.email::text as email,
      p.created_at,

      count(e.id) as enrollments_count,

      count(e.id) filter (
        where
          e.id is not null
          and (
            coalesce(c.is_free, false) = true
            or (
              s.id is not null
              and s.status = 'active'
              and (
                s.expires_at is null
                or s.expires_at > now()
              )
            )
          )
      ) as active_courses_count,

      count(e.id) filter (
        where
          e.id is not null
          and coalesce(c.is_free, false) = false
          and not (
            s.id is not null
            and s.status = 'active'
            and (
              s.expires_at is null
              or s.expires_at > now()
            )
          )
      ) as expired_courses_count

    from public.profiles p

    join auth.users u
      on u.id = p.id

    left join public.enrollments e
      on e.student_id = p.id

    left join public.courses c
      on c.id = e.course_id

    left join public.subscriptions s
      on s.student_id = p.id
      and s.course_id = e.course_id

    where
      p.role = 'student'
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or coalesce(p.full_name, '') ilike '%' || trim(p_search) || '%'
        or coalesce(p.phone, '') ilike '%' || trim(p_search) || '%'
        or coalesce(u.email, '') ilike '%' || trim(p_search) || '%'
      )

    group by
      p.id,
      p.full_name,
      p.phone,
      u.email,
      p.created_at
  ),

  filtered as (
    select
      sr.*,

      case
        when sr.enrollments_count = 0 then 'no_courses'
        when sr.active_courses_count > 0 then 'active'
        when sr.expired_courses_count > 0 then 'expired'
        else 'no_courses'
      end as student_state

    from student_rows sr

    where
      coalesce(p_filter, 'all') = 'all'

      or (
        p_filter = 'active'
        and sr.active_courses_count > 0
      )

      or (
        p_filter = 'expired'
        and sr.expired_courses_count > 0
      )

      or (
        p_filter = 'no_courses'
        and sr.enrollments_count = 0
      )
  ),

  numbered as (
    select
      f.*,
      count(*) over() as total_count
    from filtered f
  )

  select
    n.id,
    n.full_name,
    n.phone,
    n.email,
    n.created_at,
    n.enrollments_count,
    n.active_courses_count,
    n.expired_courses_count,
    n.student_state,
    n.total_count

  from numbered n

  order by
    n.created_at desc,
    n.id

  limit least(
    greatest(coalesce(p_page_size, 20), 1),
    100
  )

  offset (
    greatest(coalesce(p_page, 1), 1) - 1
  ) * least(
    greatest(coalesce(p_page_size, 20), 1),
    100
  );
$$;


revoke all
on function public.admin_list_students(
  text,
  text,
  integer,
  integer
)
from public, anon, authenticated;


grant execute
on function public.admin_list_students(
  text,
  text,
  integer,
  integer
)
to service_role;
