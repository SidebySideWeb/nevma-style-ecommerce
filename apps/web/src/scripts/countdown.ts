/** Countdown timers: tick every 30s, refresh aria-label + day/hour/minute digits. */

const TICK_MS = 30_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parts(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000) % 24;
  const minutes = Math.floor(diff / 60_000) % 60;
  return { days, hours, minutes };
}

function aria(name: string, p: { days: number; hours: number; minutes: number }): string {
  return `${name} opens in ${p.days} days, ${p.hours} hours and ${p.minutes} minutes`;
}

function paint(root: HTMLElement) {
  const target = Number(root.dataset.opensAt);
  const name = root.dataset.dropCode || '';
  if (!Number.isFinite(target)) return;
  const p = parts(target, Date.now());
  root.setAttribute('aria-label', aria(name, p));
  const nums = root.querySelectorAll<HTMLElement>('[data-cd]');
  const map: Record<string, string> = {
    days: String(p.days),
    hours: pad2(p.hours),
    minutes: pad2(p.minutes),
  };
  for (const el of nums) {
    const key = el.dataset.cd;
    if (key && key in map) el.textContent = map[key]!;
  }
}

function init() {
  const nodes = document.querySelectorAll<HTMLElement>('.s-cd[data-opens-at]');
  if (!nodes.length) return;
  const tick = () => {
    for (const n of nodes) paint(n);
  };
  tick();
  window.setInterval(tick, TICK_MS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};

