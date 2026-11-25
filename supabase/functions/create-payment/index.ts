// Starts a card payment for an order in status `awaiting_payment` and returns a URL
// to open in the in-app browser.
//
// PAYMENT_PROVIDER:
//   "test"  — built-in sandbox page (payment-webhook) that simulates a successful payment.
//             Requires PAYMENT_TEST_SECRET. Never enable in production.
//   others  — real acquiring (ioka / Freedom Pay / CloudPayments) is plugged in here once the
//             merchant account (ИП/ТОО) is ready: create the provider order and return its checkout URL.
import { hmacHex, json, userClient } from '../_shared/admin.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: 'order_id required' }, 400);

  // RLS guarantees the caller can only read their own order
  const db = userClient(req);
  const { data: order, error } = await db.from('orders').select('id, client_id, total, status').eq('id', order_id).single();
  if (error || !order) return json({ error: 'order_not_found' }, 404);
  const { data: auth } = await db.auth.getUser();
  if (auth.user?.id !== order.client_id) return json({ error: 'forbidden' }, 403);
  if (order.status !== 'awaiting_payment') return json({ error: 'order_not_awaiting_payment' }, 409);

  const provider = (Deno.env.get('PAYMENT_PROVIDER') ?? '').trim().toLowerCase();
  if (provider === 'test') {
    const secret = Deno.env.get('PAYMENT_TEST_SECRET')?.trim();
    if (!secret) return json({ error: 'payment_not_configured' }, 500);
    const amount = String(order.total);
    const sig = await hmacHex(secret, `${order.id}:${amount}`);
    // Supabase serves function responses to browsers as text/plain (no HTML pages),
    // so the sandbox is confirmed in-app: the client shows a dialog and POSTs confirm_url.
    const confirm_url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook?test=1&order=${order.id}&amount=${amount}&sig=${sig}`;
    return json({ test: true, amount: order.total, confirm_url }, 200);
  }

  return json({ error: 'payment_provider_not_configured' }, 501);
});
