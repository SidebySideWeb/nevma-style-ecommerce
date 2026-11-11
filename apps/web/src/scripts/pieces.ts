/** All-pieces archive: filter + view chips update DOM, URL, and live region. */

import { ui } from '../content/ui';

type Filter = 'all' | 'available' | 'coming' | 'sold-out';
type View = 'index' | 'gallery';

function hrefFor(filter: Filter, view: View): string {
  const q = new URLSearchParams();
  if (filter !== 'all') q.set('filter', filter);
  if (view === 'gallery') q.set('view', 'gallery');
  const s = q.toString();
  return s ? `/pieces?${s}` : '/pieces';
}

function setItems(panel: HTMLElement, filter: Filter): number {
  let shown = 0;
  for (const item of panel.querySelectorAll<HTMLElement>('[data-filter]')) {
    const match = filter === 'all' || item.dataset.filter === filter;
    item.hidden = !match;
    item.style.display = match ? '' : 'none';
    if (match) shown += 1;
  }
  return shown;
}

function apply(filter: Filter, view: View) {
  const root = document.querySelector<HTMLElement>('[data-pieces-root]');
  if (!root) return;

  root.dataset.filter = filter;
  root.dataset.view = view;

  let shown = 0;
  for (const panel of root.querySelectorAll<HTMLElement>('[data-view-panel]')) {
    const on = panel.dataset.viewPanel === view;
    panel.hidden = !on;
    panel.style.display = on ? '' : 'none';
    if (panel.dataset.viewPanel === 'gallery' && on) {
      panel.style.listStyle = 'none';
      panel.style.marginBlock = '0';
    }
    const n = setItems(panel, filter);
    if (on) shown = n;
  }

  const live = root.querySelector<HTMLElement>('[data-pieces-live]');
  if (live) live.textContent = ui.pieces.shown(shown);

  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-filter-chip]')) {
    const id = (chip.dataset.filterChip || 'all') as Filter;
    chip.setAttribute('aria-pressed', id === filter ? 'true' : 'false');
    chip.dataset.href = hrefFor(id, view);
  }
  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-view-chip]')) {
    const id = (chip.dataset.viewChip || 'index') as View;
    chip.setAttribute('aria-pressed', id === view ? 'true' : 'false');
    chip.dataset.href = hrefFor(filter, id);
  }

  history.replaceState(null, '', hrefFor(filter, view));
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-pieces-root]');
  if (!root) return;

  document.querySelectorAll<HTMLButtonElement>('[data-filter-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      apply((chip.dataset.filterChip || 'all') as Filter, (root.dataset.view || 'index') as View);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-view-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      apply((root.dataset.filter || 'all') as Filter, (chip.dataset.viewChip || 'index') as View);
    });
  });
}

init();

export {};

