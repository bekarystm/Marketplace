// Supabase Auth "Send SMS" hook: delivers the login code through WhatsApp
// (Meta WhatsApp Cloud API, authentication template with a one-time code).
//
// Secrets:
//   SEND_SMS_HOOK_SECRET      "v1,whsec_..." from Auth > Hooks
//   WHATSAPP_TOKEN            permanent access token of the WhatsApp Business app
//   WHATSAPP_PHONE_NUMBER_ID  sender phone number id
//   WHATSAPP_TEMPLATE         approved authentication template name (default "login_code")
//   WHATSAPP_TEMPLATE_LANG    template language code (default "ru")
import { Webhook } from 'npm:standardwebhooks@1.0.0';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const payload = await req.text();
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  let event: { user: { phone: string }; sms: { otp: string } };
  try {
    event = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as typeof event;
  } catch {
    return json({ error: { http_code: 401, message: 'invalid signature' } }, 401);
  }

  const phone = event.user.phone.replace(/\D/g, '');
  const code = event.sms.otp;
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) {
    return json({ error: { http_code: 500, message: 'WhatsApp provider is not configured' } }, 500);
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: Deno.env.get('WHATSAPP_TEMPLATE') ?? 'login_code',
        language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'ru' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('whatsapp send failed', res.status, detail);
    return json({ error: { http_code: 502, message: 'failed to deliver code via WhatsApp' } }, 502);
  }
  return json({});
});
