-- Allow empty content only for soft-deleted messages

alter table messages
drop constraint if exists messages_content_check;

alter table messages
add constraint messages_content_check
check (
  (deleted_at is not null)
  or
  (char_length(content) > 0 and char_length(content) <= 4000)
);
