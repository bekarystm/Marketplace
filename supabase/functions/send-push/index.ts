// Delivers rows inserted into public.notifications as Expo push notifications.
// Trigger: Database Webhook (public.notifications, INSERT) -> POST this function
// with header `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`.
import { adminClient, json, safeEqual } from '../_shared/admin.ts';

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
  if (!secret || !safeEqual(req.headers.get('x-webhook-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }
  const payload = await req.json();
  const row: NotificationRow | undefined = payload?.record;
  if (payload?.type !== 'INSERT' || !row) return json({ skipped: true });

  const app = row.data?.app === 'partner' ? 'partner' : 'client';
  const db = adminClient();
  const { data: tokens, error } = await db.from('push_tokens').select('token').eq('user_id', row.user_id).eq('app', app);
  if (error) return json({ error: error.message }, 500);
  if (!tokens?.length) return json({ sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token,
    title: row.title,
    body: row.body ?? undefined,
    data: row.data,
    sound: 'default',
    channelId: 'orders',
    priority: 'high',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const result = await res.json().catch(() => ({}));

  // drop tokens Expo reports as no longer valid
  const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];
  const dead = tickets
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter((t): t is string => !!t);
  if (dead.length) await db.from('push_tokens').delete().in('token', dead);

  return json({ sent: messages.length, removed: dead.length });
});
