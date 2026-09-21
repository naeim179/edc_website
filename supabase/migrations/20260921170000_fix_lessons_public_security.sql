-- Make lessons_public respect the permissions and RLS
-- of the user executing the query instead of the view owner.

alter view public.lessons_public
set (security_invoker = true);
