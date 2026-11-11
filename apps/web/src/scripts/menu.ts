/** Phone menu: toggle, aria-expanded, Escape, focus trap, return focus. */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  let lastFocus: HTMLElement | null = null;

  const focusables = () =>
    [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    );

  function open() {
    lastFocus = document.activeElement as HTMLElement | null;
    menu!.hidden = false;
    toggle!.setAttribute('aria-expanded', 'true');
    const items = focusables();
    (items[0] ?? menu!).focus();
  }

  function close() {
    menu!.hidden = true;
    toggle!.setAttribute('aria-expanded', 'false');
    (lastFocus ?? toggle!).focus();
  }

  function isOpen() {
    return toggle!.getAttribute('aria-expanded') === 'true' && !menu!.hidden;
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) close();
    else open();
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === toggle)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenu);
} else {
  initMenu();
}

export {};

