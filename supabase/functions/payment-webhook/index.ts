// Payment confirmations.
//  - Sandbox (PAYMENT_PROVIDER=test): GET shows a fake checkout page, POST confirms the payment.
//  - Real provider callbacks are verified and handled here once acquiring is connected.
import { adminClient, hmacHex, safeEqual } from '../_shared/admin.ts';

const html = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Оплата</title><style>body{font-family:system-ui;padding:32px;max-width:420px;margin:auto;text-align:center}
button{background:#16a34a;color:#fff;border:0;border-radius:12px;padding:14px 24px;font-size:17px;width:100%}</style></head>
<body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get('test') !== '1' || Deno.env.get('PAYMENT_PROVIDER') !== 'test') {
    return new Response('not found', { status: 404 });
  }
  const secret = Deno.env.get('PAYMENT_TEST_SECRET') ?? '';
  const orderId = url.searchParams.get('order') ?? '';
  const amount = url.searchParams.get('amount') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  const expected = secret ? await hmacHex(secret, `${orderId}:${amount}`) : '';
  if (!expected || !safeEqual(sig, expected)) return html('<h2>Ссылка недействительна</h2>', 403);

  if (req.method === 'GET') {
    return html(`<h2>Тестовая оплата</h2><p>Сумма: <b>${Number(amount).toLocaleString('ru-RU')} ₸</b></p>
      <form method="POST"><button type="submit">Оплатить</button></form>
      <p style="color:#888;font-size:13px">Это песочница. Реальные деньги не списываются.</p>`);
  }

  const db = adminClient();
  const { error } = await db.rpc('confirm_card_payment', {
    p_order_id: orderId,
    p_provider: 'test',
    p_provider_payment_id: `test_${crypto.randomUUID()}`,
    p_amount: Number(amount),
    p_payload: { sandbox: true },
  });
  if (error) return html(`<h2>Ошибка</h2><p>${error.message}</p>`, 500);
  return html('<h2>✅ Оплачено</h2><p>Можно вернуться в приложение.</p>');
});
