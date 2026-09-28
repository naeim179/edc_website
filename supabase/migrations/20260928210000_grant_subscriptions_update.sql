-- الـ RLS policy "Admins can manage subscriptions" هي اللي بتقصر التعديل على الأدمن
grant update on public.subscriptions to authenticated;
