-- Fix table privileges for chat

grant select, insert, update, delete on table messages to authenticated;

grant select, insert, update, delete on table conversations to authenticated;
