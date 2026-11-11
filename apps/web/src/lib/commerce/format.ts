const TZ = 'Europe/London';

function londonParts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...options }).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  return out;
}

function asDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(input);
}

/** Site price: whole pounds, no decimals — "£85". */
export function formatSitePrice(amount: string | number, currency = 'GBP'): string {
  const n = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (Number.isNaN(n)) return '';
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return formatted.replace(/\.00$/, '');
}

/** Order total: keep decimals — "£166.00". */
export function formatOrderPrice(amount: string | number, currency = 'GBP'): string {
  const n = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** "Fri 4 Dec, 18:00 GMT" */
export function formatAnnounceDateTime(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute} GMT`;
}

/** "Fri 4 Dec" */
export function formatDayMonth(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "Fri 4 Dec 2026" — other-drops next-drop eyebrow. */
export function formatDayMonthYear(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** "2 Oct 2026" / "23 Oct 2026" */
export function formatDateShort(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

/** "Friday 2 October 2026" */
export function formatDateLong(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** "Released 2 Oct 2026" */
export function formatReleasedShort(input: string | number | Date): string {
  return `Released ${formatDateShort(input)}`;
}

/** "Released Friday 2 October 2026" */
export function formatReleasedLong(input: string | number | Date): string {
  return `Released ${formatDateLong(input)}`;
}

/** "Opens Friday 4 December 2026, 18:00 GMT" */
export function formatOpensLong(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `Opens ${p.weekday} ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} GMT`;
}

/** "Opens Friday 4 December, 18:00 GMT" — piece upcoming stock subline. */
export function formatOpensDayTime(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `Opens ${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute} GMT`;
}

/** "Coming Fri 4 Dec" — piece upcoming eyebrow. */
export function formatComingShort(input: string | number | Date): string {
  return `Coming ${formatDayMonth(input)}`;
}

/** "Friday 4 December at 18:00 GMT" — empty-bag next-drop date. */
export function formatOpensDayAtTime(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${p.weekday} ${p.day} ${p.month} at ${p.hour}:${p.minute} GMT`;
}

/** "18:00" in London. */
export function formatTimeGmt(input: string | number | Date): string {
  const d = asDate(input);
  const p = londonParts(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  /** Display strings: days unpadded above 9, hours/minutes always 2 digits; time + GMT labels. */
  display: { days: string; hours: string; minutes: string; time: string; zone: 'GMT' };
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function countdownParts(
  target: string | number | Date,
  now: string | number | Date = Date.now(),
): CountdownParts {
  const diff = Math.max(0, asDate(target).getTime() - asDate(now).getTime());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000) % 24;
  const minutes = Math.floor(diff / 60_000) % 60;
  return {
    days,
    hours,
    minutes,
    display: {
      days: pad2(days),
      hours: pad2(hours),
      minutes: pad2(minutes),
      time: formatTimeGmt(target),
      zone: 'GMT',
    },
  };
}

/** "STYLE 002 opens in 42 days, 5 hours and 0 minutes" */
export function countdownAria(
  name: string,
  parts: CountdownParts,
): string {
  return `${name} opens in ${parts.days} days, ${parts.hours} hours and ${parts.minutes} minutes`;
}
