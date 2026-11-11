/** Piece buy box: size chips, add → bag drawer, wishlist toggle, film play. */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WISHLIST_KEY = 'ns_wishlist';

function readWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeWishlist(handles: string[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(handles));
  document.cookie = `ns_wishlist=${encodeURIComponent(JSON.stringify(handles))}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
}

function sizeNote(size: string | null, qty: number | undefined): string {
  if (!size) return 'Crossed-out sizes are sold out.';
  if (qty === 1) return `${size} · the last one in this size`;
  return `${size} · ${qty} left in this size`;
}

function updateBagCount(n: number) {
  const link = document.querySelector<HTMLAnchorElement>('a.s-ib[href="/bag"]');
  if (!link) return;
  link.setAttribute('aria-label', `Bag, ${n} ${n === 1 ? 'piece' : 'pieces'}`);
  let badge = link.querySelector<HTMLElement>('.s-count');
  if (n <= 0) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 's-count';
    badge.setAttribute('aria-hidden', 'true');
    link.appendChild(badge);
  }
  badge.textContent = String(n);
}

function initBuy(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-buy-form]');
  const note = root.querySelector<HTMLElement>('[data-size-note]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-size-chips] .s-chip')];
  if (!form || !addBtn) return;

  const price = root.dataset.price || '';
  let selected: { size: string; variantId: string; qty: number } | null = null;

  function select(chip: HTMLButtonElement) {
    if (chip.getAttribute('aria-disabled') === 'true' || chip.disabled) return;
    const size = chip.dataset.size || '';
    const variantId = chip.dataset.variant || '';
    const qty = Number(chip.dataset.qty || 0);
    for (const c of chips) c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
    selected = { size, variantId, qty };
    if (note) note.textContent = sizeNote(size, qty);
    addBtn!.textContent = `Add to bag · ${price}`;
    addBtn!.removeAttribute('disabled');
    addBtn!.setAttribute('aria-disabled', 'false');
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => select(chip));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(form);
    fd.set('variantId', selected.variantId);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        cart?: { count: number; checkoutUrl: string | null; subtotal: string };
        line?: {
          title: string;
          size: string;
          price: string;
          imageSrc: string;
          meta: string;
          note: string;
          quantityAvailable: number;
        };
      };
      if (!data.ok || !data.line || !data.cart) return;
      openDrawer(data.line, data.cart);
      updateBagCount(data.cart.count);
    } catch {
      form.submit();
    }
  });
}

function openDrawer(
  line: {
    title: string;
    size: string;
    price: string;
    imageSrc: string;
    meta: string;
    note: string;
  },
  cart: { checkoutUrl: string | null; subtotal: string },
) {
  const scrim = document.querySelector<HTMLElement>('[data-bag-scrim]');
  const drawer = document.querySelector<HTMLElement>('[data-bag-drawer]');
  if (!scrim || !drawer) return;

  const img = drawer.querySelector<HTMLImageElement>('[data-bag-img]');
  const title = drawer.querySelector<HTMLElement>('[data-bag-title]');
  const meta = drawer.querySelector<HTMLElement>('[data-bag-meta]');
  const price = drawer.querySelector<HTMLElement>('[data-bag-price]');
  const note = drawer.querySelector<HTMLElement>('[data-bag-note]');
  const sub = drawer.querySelector<HTMLElement>('[data-bag-subtotal]');
  const checkout = drawer.querySelector<HTMLAnchorElement>('[data-bag-checkout]');

  if (img) {
    const gallery = document.querySelector<HTMLImageElement>('.s-gal img');
    img.src = line.imageSrc || gallery?.src || '';
    img.alt = '';
  }
  if (title) title.textContent = line.title;
  if (meta) meta.textContent = line.meta;
  if (price) price.textContent = line.price;
  if (note) note.textContent = line.note;
  if (sub) sub.textContent = cart.subtotal;
  if (checkout) checkout.href = cart.checkoutUrl || '/bag';

  const lastFocus = document.activeElement as HTMLElement | null;
  scrim.hidden = false;
  drawer.hidden = false;
  drawer.style.display = 'flex';

  const focusables = () =>
    [...drawer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    );

  function close() {
    scrim!.hidden = true;
    drawer!.hidden = true;
    drawer!.style.display = 'none';
    document.removeEventListener('keydown', onKey);
    (lastFocus ?? document.body).focus();
  }

  function onKey(e: KeyboardEvent) {
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
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', onKey);
  scrim.onclick = () => close();
  drawer.querySelectorAll('[data-bag-close]').forEach((btn) => {
    btn.addEventListener('click', close, { once: true });
  });
  (focusables()[0] ?? drawer).focus();
}

function initWishlist(root: HTMLElement) {
  const btn = root.querySelector<HTMLButtonElement>('[data-wishlist]');
  const icon = root.querySelector<SVGElement>('[data-wishlist-icon]');
  if (!btn) return;
  const handle = root.dataset.handle || '';
  const pieceId = root.dataset.pieceId || '';
  let saved = readWishlist().includes(handle);

  function paint() {
    btn!.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn!.setAttribute('aria-label', saved ? 'Remove from wishlist' : 'Save to wishlist');
    if (icon) {
      icon.setAttribute('fill', saved ? 'currentColor' : 'none');
    }
  }
  paint();

  btn.addEventListener('click', async () => {
    const next = !saved;
    const list = readWishlist();
    const updated = next
      ? list.includes(handle)
        ? list
        : [...list, handle]
      : list.filter((h) => h !== handle);
    writeWishlist(updated);
    saved = next;
    paint();

    const fd = new FormData();
    fd.set('handle', handle);
    fd.set('pieceId', pieceId);
    fd.set('action', next ? 'add' : 'remove');
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      });
    } catch {
      /* local state already updated */
    }

    const wishLink = document.querySelector<HTMLAnchorElement>('a.s-ib[href="/wishlist"]');
    if (wishLink) {
      const n = updated.length;
      wishLink.setAttribute(
        'aria-label',
        `Wishlist, ${n} ${n === 1 ? 'piece' : 'pieces'}`,
      );
    }
  });
}

function initFilm() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-film]')) {
    const play = root.querySelector<HTMLButtonElement>('[data-film-play]');
    const video = root.querySelector<HTMLVideoElement>('[data-film-video]');
    if (!play) continue;
    play.addEventListener('click', () => {
      if (!video) return;
      video.hidden = false;
      play.hidden = true;
      void video.play();
    });
  }
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-piece-root]');
  if (root) {
    initBuy(root);
    initWishlist(root);
  }
  initFilm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};

