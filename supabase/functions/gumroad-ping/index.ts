// Gumroad → Supabase: turns Atlas Pro on after every payment.
//
// Gumroad sends a "Ping" (form POST) on every sale and on every recurring
// charge of a membership. Each ping extends Pro by one billing period plus a
// few days of grace; when someone cancels, renewals stop and Pro runs out by
// itself. A refund switches Pro off at once.
//
// Setup (Supabase dashboard → Edge Functions → Deploy a new function → Via editor):
//   name: gumroad-ping, paste this file, turn OFF "Verify JWT".
//   Secret: GUMROAD_PING_KEY = any long random string (Edge Functions → Secrets).
// Gumroad → Settings → Advanced → Ping endpoint:
//   https://<project>.supabase.co/functions/v1/gumroad-ping?key=<GUMROAD_PING_KEY>
//
// The account is found by url_params[user_id] (the /pro/ page adds it to the
// checkout link) or, failing that, by the buyer's email.

const KEY = Deno.env.get('GUMROAD_PING_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const DAY = 864e5;
const PERIOD_DAYS: Record<string, number> = { monthly: 31, quarterly: 92, biannually: 183, yearly: 366, every_two_years: 731 };
const GRACE_DAYS = 5;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function findUser(userId: string | null, email: string | null): Promise<string | null> {
  const q = userId && /^[0-9a-f-]{36}$/i.test(userId)
    ? `id=eq.${userId}`
    : email ? `email=ilike.${encodeURIComponent(email.replace(/[%_*]/g, ''))}` : '';
  if (!q) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${q}&select=id,plan_until`, { headers });
  const rows = r.ok ? await r.json() : [];
  return rows[0]?.id ?? null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!KEY || url.searchParams.get('key') !== KEY) return new Response('forbidden', { status: 403 });

  const form = await req.formData();
  const get = (k: string) => (form.get(k) as string | null) ?? null;

  const uid = await findUser(get('url_params[user_id]'), get('email'));
  if (!uid) return new Response('no matching account (ok)', { status: 200 });

  const refunded = get('refunded') === 'true' || get('disputed') === 'true' || get('chargebacked') === 'true';
  const days = PERIOD_DAYS[get('recurrence') ?? 'monthly'] ?? 31;
  const until = new Date(Date.now() + (days + GRACE_DAYS) * DAY).toISOString();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(
      refunded
        ? { plan: 'free', plan_until: null }
        : { plan: 'pro', plan_until: until, customer_id: get('subscription_id') ?? get('sale_id') },
    ),
  });
  if (!res.ok) return new Response(`db error ${res.status}`, { status: 500 });
  return new Response('ok', { status: 200 });
});
