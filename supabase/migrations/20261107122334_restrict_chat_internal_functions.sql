-- These trigger helpers are not public RPC endpoints. Trigger execution is unaffected.
do $$
declare helper regprocedure;
begin
  foreach helper in array array[
    to_regprocedure('public.handle_new_message()'),
    to_regprocedure('public.touch_conversation_on_message()'),
    to_regprocedure('public.cleanup_course_teacher_conversations()')
  ] loop
    if helper is not null then
      execute format('revoke all on function %s from public, anon, authenticated', helper);
    end if;
  end loop;
  helper := to_regprocedure('public.is_conversation_participant(uuid)');
  if helper is not null then
    execute format('revoke all on function %s from public, anon', helper);
    execute format('grant execute on function %s to authenticated, service_role', helper);
  end if;
end $$;
