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
  const env = (k: string) => (Deno.env.get(k) ?? '').trim();
  const secret = env('SEND_SMS_HOOK_SECRET').replace('v1,whsec_', '');
  let event: { user: { phone: string }; sms: { otp: string } };
  try {
    event = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as typeof event;
  } catch (e) {
    // diagnostics without leaking the secret
    console.error('hook signature check failed', {
      reason: e instanceof Error ? e.message : String(e),
      secretLength: secret.length,
      rawStartsWith: env('SEND_SMS_HOOK_SECRET').slice(0, 9),
      hasWebhookHeaders: ['webhook-id', 'webhook-timestamp', 'webhook-signature'].map((h) => req.headers.has(h)),
    });
    return json({ error: { http_code: 401, message: 'invalid signature' } }, 401);
  }

  const phone = event.user.phone.replace(/\D/g, '');
  const code = event.sms.otp;
  const token = env('WHATSAPP_TOKEN');
  const phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) {
    return json({ error: { http_code: 500, message: 'WhatsApp provider is not configured' } }, 500);
  }

  const graph = 'https://graph.facebook.com/v21.0';
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const sendCode = () =>
    fetch(`${graph}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: env('WHATSAPP_TEMPLATE') || 'login_code',
          language: { code: env('WHATSAPP_TEMPLATE_LANG') || 'ru' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    });

  let res = await sendCode();
  if (!res.ok) {
    const first = await res.clone().text();
    // #133010 "Account not registered": the sender number is verified but not yet registered
    // for the Cloud API. Register it once (WHATSAPP_PIN = two-step verification PIN) and retry.
    if (first.includes('133010')) {
      const reg = await fetch(`${graph}/${phoneNumberId}/register`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ messaging_product: 'whatsapp', pin: env('WHATSAPP_PIN') || '000000' }),
      });
      console.log('cloud api registration', reg.status, await reg.text());
      res = await sendCode();
    }
  }

  if (!res.ok) {
    const detail = await res.text();
    // diagnostics: which sender id is configured and what Meta knows about it (no secrets logged)
    const info = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,platform_type,status`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.text()).catch((e) => String(e));
    console.error('whatsapp send failed', res.status, detail, { phoneNumberId, senderInfo: info });
    return json({ error: { http_code: 502, message: 'failed to deliver code via WhatsApp' } }, 502);
  }
  return json({});
});
