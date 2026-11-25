// Payment confirmations.
//  - Sandbox (PAYMENT_PROVIDER=test): the app POSTs the signed confirm_url returned by
//    create-payment; the signature binds order id and amount.
//  - Real provider callbacks are verified and handled here once acquiring is connected.
import { adminClient, hmacHex, json, safeEqual } from '../_shared/admin.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const env = (k: string) => (Deno.env.get(k) ?? '').trim();
  if (url.searchParams.get('test') !== '1' || env('PAYMENT_PROVIDER').toLowerCase() !== 'test') {
    return json({ error: 'not_found' }, 404);
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = env('PAYMENT_TEST_SECRET');
  const orderId = url.searchParams.get('order') ?? '';
  const amount = url.searchParams.get('amount') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  const expected = secret ? await hmacHex(secret, `${orderId}:${amount}`) : '';
  if (!expected || !safeEqual(sig, expected)) return json({ error: 'invalid_signature' }, 403);

  const db = adminClient();
  const { data: order } = await db.from('orders').select('status, payment_status').eq('id', orderId).maybeSingle();
  if (!order) return json({ error: 'order_not_found' }, 404);
  if (order.payment_status === 'paid') return json({ ok: true, already_paid: true });

  const { error } = await db.rpc('confirm_card_payment', {
    p_order_id: orderId,
    p_provider: 'test',
    p_provider_payment_id: `test_${crypto.randomUUID()}`,
    p_amount: Number(amount),
    p_payload: { sandbox: true },
  });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
