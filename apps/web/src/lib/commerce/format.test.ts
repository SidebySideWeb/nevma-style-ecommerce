import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  countdownAria,
  countdownParts,
  formatAnnounceDateTime,
  formatDateLong,
  formatDateShort,
  formatDayMonth,
  formatOpensLong,
  formatOrderPrice,
  formatReleasedLong,
  formatReleasedShort,
  formatSitePrice,
  formatTimeGmt,
} from './format';

const text = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../../../design/build/text.json'),
    'utf8',
  ),
) as Record<string, Record<string, string[]>>;

const NOW = Date.parse('2026-10-23T13:00:00Z');
const SIGNAL_OPENS = Date.parse('2026-12-04T18:00:00Z');
const STYLE001_OPENED = Date.parse('2026-10-02T00:00:00Z');

describe('format vs design/build/text.json', () => {
  it('formats site and order prices', () => {
    expect(formatSitePrice('85.00')).toBe('€85');
    expect(formatSitePrice(75)).toBe('€75');
    expect(text.home['the-pieces']).toContain('€85');
    expect(text.home['the-pieces']).toContain('€75');
    expect(formatOrderPrice('166.00')).toBe('€166.00');
  });

  it('formats London dates from the design', () => {
    expect(formatAnnounceDateTime(SIGNAL_OPENS)).toBe('Fri 4 Dec, 18:00 GMT');
    expect(text.home.announcement.join('')).toContain('Fri 4 Dec, 18:00 GMT');

    expect(formatReleasedShort(STYLE001_OPENED)).toBe('Released 2 Oct 2026');
    expect(text.home['the-pieces']).toContain('STYLE 001 · Definition · Released 2 Oct 2026');

    expect(formatReleasedLong(STYLE001_OPENED)).toBe('Released Friday 2 October 2026');
    expect(text.drop['drop-intro']).toContain('Drop · Released Friday 2 October 2026');

    expect(formatDateLong(SIGNAL_OPENS)).toBe('Friday 4 December 2026');
    expect(formatOpensLong(SIGNAL_OPENS)).toBe('Opens Friday 4 December 2026, 18:00 GMT');

    expect(formatDateShort(NOW)).toBe('23 Oct 2026');
    expect(formatDayMonth(SIGNAL_OPENS)).toBe('Fri 4 Dec');
    expect(text.product['wear-it-with']).toContain('Fri 4 Dec');
    expect(formatTimeGmt(SIGNAL_OPENS)).toBe('18:00');
  });

  it('countdown parts and aria match the home signal block', () => {
    const parts = countdownParts(SIGNAL_OPENS, NOW);
    expect(parts.days).toBe(42);
    expect(parts.hours).toBe(5);
    expect(parts.minutes).toBe(0);
    expect(parts.display.days).toBe('42');
    expect(parts.display.hours).toBe('05');
    expect(parts.display.minutes).toBe('00');
    expect(parts.display.time).toBe('18:00');
    expect(parts.display.zone).toBe('GMT');

    expect(text.home.signal).toContain('42');
    expect(text.home.signal).toContain('05');
    expect(text.home.signal).toContain('00');
    expect(text.home.signal).toContain('18:00');
    expect(text.home.signal).toContain('GMT');

    const aria = countdownAria('STYLE 002', parts);
    expect(aria).toBe('STYLE 002 opens in 42 days, 5 hours and 0 minutes');
  });
});
