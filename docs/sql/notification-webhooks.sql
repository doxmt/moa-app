-- 질문, 답변, 스토리, 일정 생성 알림용 Database Webhook SQL
-- Supabase SQL Editor에서 실행해주세요.
--
-- 실행 전 확인:
-- 1. Edge Function send-notification 배포 완료
-- 2. Supabase project URL / service role key / WEBHOOK_SECRET 값을 아래 설정에 입력
--
-- 주의: service_role key는 DB vault에 저장되며, 클라이언트 코드에는 넣지 않습니다.

create extension if not exists pg_net;
create extension if not exists supabase_vault cascade;

delete from vault.secrets
where name in (
  'send_notification_url',
  'send_notification_service_role_key',
  'send_notification_webhook_secret'
);

select vault.create_secret(
  'https://okcsqhqanjmqituothkk.supabase.co/functions/v1/send-notification',
  'send_notification_url',
  'send-notification Edge Function URL'
);

select vault.create_secret(
  '<SUPABASE_SERVICE_ROLE_KEY>',
  'send_notification_service_role_key',
  'service role key for send-notification webhook'
);

select vault.create_secret(
  '1bdcbc239a738fb116045e55c9b376c4d57991210041abcb74797c2bda691bc2',
  'send_notification_webhook_secret',
  'shared secret for send-notification webhook'
);

create or replace function public.call_send_notification_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  function_url text;
  service_role_key text;
  webhook_secret text;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'send_notification_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'send_notification_service_role_key';

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'send_notification_webhook_secret';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );

  return new;
end;
$$;

drop trigger if exists balance_games_send_notification_webhook on public.balance_games;
create trigger balance_games_send_notification_webhook
after insert on public.balance_games
for each row
execute function public.call_send_notification_webhook();

drop trigger if exists game_answers_insert_send_notification_webhook on public.game_answers;
create trigger game_answers_insert_send_notification_webhook
after insert on public.game_answers
for each row
execute function public.call_send_notification_webhook();

drop trigger if exists game_answers_update_send_notification_webhook on public.game_answers;
create trigger game_answers_update_send_notification_webhook
after update on public.game_answers
for each row
execute function public.call_send_notification_webhook();

drop trigger if exists stories_insert_send_notification_webhook on public.stories;
drop trigger if exists stories_send_notification_webhook on public.stories;
create trigger stories_insert_send_notification_webhook
after insert on public.stories
for each row
execute function public.call_send_notification_webhook();

drop trigger if exists calendar_events_insert_send_notification_webhook on public.calendar_events;
drop trigger if exists calendar_events_send_notification_webhook on public.calendar_events;
create trigger calendar_events_insert_send_notification_webhook
after insert on public.calendar_events
for each row
execute function public.call_send_notification_webhook();
