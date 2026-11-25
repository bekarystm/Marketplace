-- =====================================================================
-- Push delivery: every new notification is POSTed to the `send-push`
-- edge function via pg_net. The shared secret lives in Supabase Vault
-- (name: push_webhook_secret) and is never stored in migrations.
-- Create it once:  select vault.create_secret('<value>', 'push_webhook_secret');
-- =====================================================================
create extension if not exists pg_net with schema extensions;

create or replace function public.notifications_push_webhook()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1;
  if v_secret is null then
    return new; -- push not configured yet; the in-app notification is still stored
  end if;
  perform net.http_post(
    url := 'https://dnedbkhkobyribjouxgz.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.notifications_push_webhook();

revoke execute on function public.notifications_push_webhook() from public, anon, authenticated;
