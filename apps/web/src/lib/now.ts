/** Server "now". Frozen by PUBLIC_FIXED_NOW when COMMERCE_MOCK=1. */

export function nowMs(): number {
  if (process.env.COMMERCE_MOCK === '1') {
    const fixed = process.env.PUBLIC_FIXED_NOW;
    if (fixed) {
      const t = Date.parse(fixed);
      if (!Number.isNaN(t)) return t;
    }
  }
  return Date.now();
}

export function nowDate(): Date {
  return new Date(nowMs());
}
