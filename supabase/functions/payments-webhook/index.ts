// Lemon Squeezy → Supabase: turns Pro on and off.
//
// Deploy (once):  supabase functions deploy payments-webhook --no-verify-jwt
// Secrets:        supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set by Supabase itself.)
// In Lemon Squeezy → Settings → Webhooks add
//   https://<project>.supabase.co/functions/v1/payments-webhook
// with the same signing secret and the subscription_* events.
//
// The checkout link on /pricing/ passes the user's id as
// checkout[custom][user_id], which comes back here in meta.custom_data.

const SECRET = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function hmacHex(body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// statuses that still give access; "cancelled" keeps access until ends_at
const ACTIVE = new Set(['active', 'on_trial', 'past_due', 'cancelled']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!SECRET) return new Response('webhook secret not set', { status: 500 });

  const body = await req.text();
  const signature = req.headers.get('x-signature') ?? '';
  if (!safeEqual(await hmacHex(body), signature)) return new Response('bad signature', { status: 401 });

  const event = JSON.parse(body);
  const name: string = event?.meta?.event_name ?? '';
  if (!name.startsWith('subscription_')) return new Response('ignored', { status: 200 });

  const userId: string | undefined = event?.meta?.custom_data?.user_id;
  const a = event?.data?.attributes ?? {};
  if (!userId) return new Response('no user_id in custom data', { status: 200 });

  const until: string | null = a.ends_at ?? a.renews_at ?? null;
  const active = ACTIVE.has(a.status) && (!until || new Date(until) > new Date()) && name !== 'subscription_expired';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      plan: active ? 'pro' : 'free',
      plan_until: active ? until : null,
      customer_id: a.customer_id ? String(a.customer_id) : null,
    }),
  });
  if (!res.ok) return new Response(`db error ${res.status}: ${await res.text()}`, { status: 500 });
  return new Response('ok', { status: 200 });
});
