-- Remove old duplicate pending orders first

DELETE FROM public.orders a
USING public.orders b
WHERE
  a.status = 'pending'
  AND b.status = 'pending'
  AND a.user_id = b.user_id
  AND a.course_id = b.course_id
  AND a.created_at < b.created_at;


-- Prevent future duplicate pending orders

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_order_per_user_course
ON public.orders (user_id, course_id)
WHERE status = 'pending';
