/**
 * Runs on every page when the backend is configured:
 *  - header: the account button shows that you're signed in
 *  - recommendation prefs: copied from the profile into this browser
 * Waits for the browser to be idle so it never competes with the page.
 */
import { enabled, maybeSignedIn, getProfile } from './backend';

function idle(fn: () => void) {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 1500);
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
    account().catch(() => {});
  });
}
