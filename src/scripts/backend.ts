/**
 * Client side of the optional backend (Supabase, free plan).
 *
 * Everything that needs an account — sign-in, cloud collections, the
 * newsletter flag, Pro, the member counter — goes through here. When
 * PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are not set at build time
 * `enabled` is false, nothing is loaded and those features stay hidden;
 * the rest of the site works exactly as before.
 *
 * The anon key is public by design: what it may do is limited by the row
 * level security rules in supabase/schema.sql.
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { SUPABASE } from '~/site.config';

const URL_ = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) || SUPABASE.url;
const KEY = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) || SUPABASE.anonKey;

export const enabled = !!(URL_ && KEY);

let client: Promise<SupabaseClient> | undefined;
/** The Supabase client, loaded on first use (keeps ~50 KB off pages that don't need it). */
export function sb(): Promise<SupabaseClient> {
  if (!enabled) return Promise.reject(new Error('backend not configured'));
  return (client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, KEY!, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }),
  ));
}

/** True if this browser has signed in before; lets pages skip loading the client for guests. */
export function maybeSignedIn() {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

export async function getSession(): Promise<Session | null> {
  if (!enabled) return null;
  const { data } = await (await sb()).auth.getSession();
  return data.session;
}

export interface Profile {
  id: string;
  email: string | null;
  lang: 'en' | 'ru';
  prefs: Prefs;
  newsletter: boolean;
  unsub_token: string;
  plan: 'free' | 'pro';
  plan_until: string | null;
  created_at?: string;
  display_name?: string | null;
  is_admin?: boolean;
}

export async function getProfile(): Promise<Profile | null> {
  const s = await getSession();
  if (!s) return null;
  const { data } = await (await sb()).from('profiles').select('*').eq('id', s.user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export function isPro(p: Profile | null) {
  return !!p && p.plan === 'pro' && (!p.plan_until || new Date(p.plan_until) > new Date());
}

export async function updateProfile(fields: Partial<Pick<Profile, 'lang' | 'prefs' | 'newsletter'>>) {
  const s = await getSession();
  if (!s) return;
  const { error } = await (await sb()).from('profiles').update(fields).eq('id', s.user.id);
  if (error) throw error;
}

/* ---- recommendation preferences ---------------------------------------
   Kept in localStorage `atlas:prefs` so they work without an account;
   copied to the profile when signed in. The home grid reads them inline
   (Gallery.astro) before first paint. */

export interface Prefs {
  /** category ids to show first */
  categories?: string[];
  /** 'any' | 'free' (free only first) | 'nopaid' (free + free plan first) */
  pricing?: 'any' | 'free' | 'nopaid';
  /** move sites already opened to the end */
  hideSeen?: boolean;
}

const PREFS_KEY = 'atlas:prefs';

export function readPrefs(): Prefs {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export async function writePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
  if (enabled && maybeSignedIn()) await updateProfile({ prefs }).catch(() => {});
}

/** Page URL inside this site, respecting base and language: path('account/') */
export function sitePath(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const lang = document.documentElement.lang === 'ru' ? '/ru' : '';
  return `${base}${lang}/${path.replace(/^\//, '')}`;
}
