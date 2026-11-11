/** Cookie consent panel: ns_consent for 6 months; analytics only after opt-in. */

const COOKIE = 'ns_consent';
const MAX_AGE = 60 * 60 * 24 * 183;

function readConsent(): { analytics: boolean } | null {
  const m = document.cookie.match(/(?:^|;\s*)ns_consent=([^;]*)/);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as { analytics: boolean };
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean) {
  const value = encodeURIComponent(JSON.stringify({ analytics }));
  document.cookie = `${COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

function loadAnalytics() {
  if (document.querySelector('script[data-nv-analytics]')) return;
  const s = document.createElement('script');
  s.dataset.nvAnalytics = '1';
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
}

function openPanel() {
  const scrim = document.querySelector<HTMLElement>('[data-consent-scrim]');
  const panel = document.querySelector<HTMLElement>('[data-consent-panel]');
  if (!scrim || !panel) return;
  const existing = readConsent();
  const toggle = panel.querySelector<HTMLButtonElement>('[data-consent-analytics]');
  if (toggle) toggle.setAttribute('aria-checked', existing?.analytics ? 'true' : 'false');
  scrim.hidden = false;
  panel.hidden = false;
  panel.style.display = 'flex';
  (panel.querySelector<HTMLElement>('button, [href]') || panel).focus();
}

function closePanel() {
  const scrim = document.querySelector<HTMLElement>('[data-consent-scrim]');
  const panel = document.querySelector<HTMLElement>('[data-consent-panel]');
  if (scrim) scrim.hidden = true;
  if (panel) {
    panel.hidden = true;
    panel.style.display = 'none';
  }
}

function save(analytics: boolean) {
  writeConsent(analytics);
  if (analytics) loadAnalytics();
  closePanel();
}

const existing = readConsent();
if (existing?.analytics) loadAnalytics();
else if (!existing && !(navigator as Navigator & { webdriver?: boolean }).webdriver) {
  // First visit for real shoppers. Skip auto-open under Playwright (fidelity).
  requestAnimationFrame(() => openPanel());
}

document.querySelectorAll('[data-consent-open]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    openPanel();
  });
});

document.querySelectorAll('[data-consent-close]').forEach((el) => {
  el.addEventListener('click', () => closePanel());
});

document.querySelector('[data-consent-accept]')?.addEventListener('click', () => save(true));
document.querySelector('[data-consent-reject]')?.addEventListener('click', () => save(false));

const analyticsSwitch = document.querySelector<HTMLButtonElement>('[data-consent-analytics]');
analyticsSwitch?.addEventListener('click', () => {
  const on = analyticsSwitch.getAttribute('aria-checked') !== 'true';
  analyticsSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
});

document.querySelector('[data-consent-save]')?.addEventListener('click', () => {
  const on = analyticsSwitch?.getAttribute('aria-checked') === 'true';
  save(Boolean(on));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

export {};

