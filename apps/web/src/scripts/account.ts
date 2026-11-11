/** Account side-nav buttons + preference switches. */
for (const el of document.querySelectorAll<HTMLElement>('[data-block="account"] [data-href]')) {
  el.addEventListener('click', () => {
    const href = el.getAttribute('data-href');
    if (href) location.assign(href);
  });
}

const switches = document.querySelectorAll<HTMLButtonElement>('[data-block="account"] [data-pref]');
for (const btn of switches) {
  btn.addEventListener('click', async () => {
    const on = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    const prefs: Record<string, string> = { action: 'prefs' };
    for (const s of switches) {
      const key = s.getAttribute('data-pref');
      if (key) prefs[key] = s.getAttribute('aria-checked') === 'true' ? 'true' : 'false';
    }
    try {
      await fetch('/api/account/profile', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch {
      /* keep UI state */
    }
  });
}

export {};

