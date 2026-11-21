/**
 * Runs on every page when the backend is configured:
 *  - footer counter: members (public_stats RPC) and people online right now
 *    (Supabase Realtime Presence: every open tab joins one channel; nothing
 *    about the visitor is sent, just a random key)
 *  - header: the account button shows that you're signed in
 *  - recommendation prefs: copied from the profile into this browser
 * Waits for the browser to be idle so it never competes with the page.
 */
import { enabled, sb, maybeSignedIn, getProfile } from './backend';

function idle(fn: () => void) {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 1500);
}

async function stats() {
  const box = document.querySelector<HTMLElement>('[data-stats]');
  if (!box) return;
  const client = await sb();
  const fmt = new Intl.NumberFormat(document.documentElement.lang);
  const members = box.querySelector<HTMLElement>('[data-stats-members]');
  const online = box.querySelector<HTMLElement>('[data-stats-online]');

  const { data } = await client.rpc('public_stats');
  if (data && members) {
    members.textContent = (members.dataset.tpl ?? '{n}').replace('{n}', fmt.format(data.members ?? 0));
    members.hidden = false;
    box.hidden = false;
  }

  const channel = client.channel('atlas:online', { config: { presence: { key: crypto.randomUUID() } } });
  channel
    .on('presence', { event: 'sync' }, () => {
      if (!online) return;
      const n = Object.keys(channel.presenceState()).length;
      online.textContent = (online.dataset.tpl ?? '{n}').replace('{n}', fmt.format(Math.max(n, 1)));
      online.hidden = false;
      box.hidden = false;
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ at: Date.now() });
    });
}

async function account() {
  if (!maybeSignedIn()) return;
  const profile = await getProfile();
  if (!profile) return;
  document.querySelectorAll<HTMLElement>('[data-account-btn]').forEach((b) => {
    b.classList.add('is-signed-in');
    b.title = b.dataset.labelIn ?? b.title;
    b.setAttribute('aria-label', b.title);
  });
  if (profile.prefs && Object.keys(profile.prefs).length) {
    try {
      const before = localStorage.getItem('atlas:prefs');
      const after = JSON.stringify(profile.prefs);
      localStorage.setItem('atlas:prefs', after);
      // the home grid sorts by prefs before paint; refresh once if they just arrived
      if (!before && document.querySelector('[data-cards][data-prefs-sort]')) location.reload();
    } catch {}
  }
}

if (enabled) {
  idle(() => {
    stats().catch(() => {});
    account().catch(() => {});
  });
}
