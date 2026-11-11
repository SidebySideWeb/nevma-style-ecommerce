import type { EditionState, PieceCommerce, PieceVariant } from './types';

export type EditionInput = {
  published: boolean;
  editionSize?: number;
  variants: Pick<PieceVariant, 'quantityAvailable'>[];
  /** Drop opensAt ISO string. If in the future, state is upcoming. */
  opensAt?: string | null;
  now?: number | Date;
};

function asMs(now?: number | Date): number {
  if (now == null) return Date.now();
  return typeof now === 'number' ? now : now.getTime();
}

export function leftCount(variants: Pick<PieceVariant, 'quantityAvailable'>[]): number {
  return Math.max(
    0,
    variants.reduce((sum, v) => sum + Math.max(0, v.quantityAvailable || 0), 0),
  );
}

export function editionSizeOf(piece: { editionSize?: number } | null | undefined): number {
  return piece?.editionSize && piece.editionSize > 0 ? piece.editionSize : 5;
}

export function editionState(input: EditionInput): EditionState {
  const now = asMs(input.now);
  if (!input.published) return 'upcoming';
  if (input.opensAt) {
    const open = Date.parse(input.opensAt);
    if (!Number.isNaN(open) && open > now) return 'upcoming';
  }
  const left = leftCount(input.variants);
  if (left <= 0) return 'sold-out';
  if (left === 1) return 'last-piece';
  return 'available';
}

export function editionStateFromPiece(
  piece: PieceCommerce,
  opensAt?: string | null,
  now?: number | Date,
): EditionState {
  return editionState({
    published: piece.published,
    editionSize: piece.editionSize,
    variants: piece.variants,
    opensAt,
    now,
  });
}

/** Meter: how many pips are filled, and whether they are dashed (upcoming). */
export function meter(
  state: EditionState,
  left: number,
  size = 5,
): { filled: number; total: number; dashed: boolean } {
  if (state === 'upcoming') return { filled: size, total: size, dashed: true };
  if (state === 'sold-out') return { filled: 0, total: size, dashed: false };
  if (state === 'last-piece') return { filled: 1, total: size, dashed: false };
  return { filled: Math.min(left, size), total: size, dashed: false };
}

/** Card tag / chip — matches design/build (not the uppercase sketch in COMMERCE.md). */
export function cardTag(state: EditionState, left: number, size = 5): string {
  return shortLine(state, left, size);
}

/** Piece-page stock sentence (COMMERCE.md §4). */
export function stockLine(state: EditionState, left: number, size = 5): string {
  switch (state) {
    case 'upcoming':
      return `Edition of ${size}`;
    case 'last-piece':
      return size === 5 ? 'Last piece of five' : `Last piece of ${size}`;
    case 'sold-out':
      return 'Sold out';
    default:
      return `${left} of ${size} left`;
  }
}

/** Drop-page status under the meter (design: sold-out reads "Sold out · in the archive"). */
export function dropStockLine(state: EditionState, left: number, size = 5): string {
  if (state === 'sold-out') return 'Sold out · in the archive';
  return stockLine(state, left, size);
}

/** Short line for cards and lists. */
export function shortLine(state: EditionState, left: number, size = 5): string {
  switch (state) {
    case 'upcoming':
      return `Edition of ${size} · coming`;
    case 'last-piece':
      return 'Last piece';
    case 'sold-out':
      return 'Sold out';
    default:
      return `${left} of ${size} left`;
  }
}

/**
 * Line under the edition meter on home/cards.
 * Sold out uses "All five have found a home" (size 5) — design, not the table's "Sold out".
 */
export function meterLine(state: EditionState, left: number, size = 5): string {
  if (state === 'sold-out') {
    return size === 5 ? 'All five have found a home' : `All ${size} have found a home`;
  }
  return stockLine(state, left, size);
}

/** Sold-out piece page body line. */
export function soldOutDetail(size = 5): string {
  return size === 5
    ? 'All five have found a home. This piece will not be made again.'
    : `All ${size} have found a home. This piece will not be made again.`;
}

export function sizeChipAria(size: string, quantityAvailable: number): string {
  if (quantityAvailable <= 0) return `${size}, sold out`;
  if (quantityAvailable === 1) return `${size}, last one`;
  return `${size}, ${quantityAvailable} left`;
}

export function sizeNote(chosen: string | null | undefined, quantityAvailable?: number): string {
  if (!chosen) return 'Crossed-out sizes are sold out.';
  const qty = quantityAvailable ?? 0;
  if (qty === 1) return `${chosen} · the last one in this size`;
  return `${chosen} · ${qty} left in this size`;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Size summary under drop/category cards.
 * @param includeGone when true (drop page), append " S and XL are gone."
 */
export function sizeSummary(
  variants: Pick<PieceVariant, 'size' | 'quantityAvailable'>[],
  opts: { includeGone?: boolean } = {},
): string {
  const withStock = variants.filter((v) => v.quantityAvailable > 0);
  const gone = variants.filter((v) => v.quantityAvailable <= 0);
  const left = withStock.reduce((s, v) => s + v.quantityAvailable, 0);

  if (left <= 0) return 'No sizes left. This piece will not be made again.';
  if (left === 1) {
    const only = withStock[0]!;
    return `Last piece: size ${only.size}.`;
  }

  const available = joinAnd(withStock.map((v) => `${v.size} (${v.quantityAvailable})`));
  let line = `Available in ${available}.`;
  if (opts.includeGone && gone.length) {
    line += ` ${joinAnd(gone.map((v) => v.size))} are gone.`;
  }
  return line;
}

export function dropTotals(
  pieces: { left: number; editionSize?: number }[],
): { left: number; capacity: number; label: string } {
  const left = pieces.reduce((s, p) => s + Math.max(0, p.left), 0);
  const capacity = pieces.reduce((s, p) => s + editionSizeOf(p), 0);
  return { left, capacity, label: `${left} of ${capacity}` };
}

/** Convenience: compute left + state + copy for one piece. */
export function describeEdition(
  piece: PieceCommerce,
  opensAt?: string | null,
  now?: number | Date,
) {
  const size = editionSizeOf(piece);
  const left = leftCount(piece.variants);
  const state = editionStateFromPiece(piece, opensAt, now);
  return {
    state,
    left,
    size,
    meter: meter(state, left, size),
    cardTag: cardTag(state, left, size),
    stockLine: stockLine(state, left, size),
    dropStockLine: dropStockLine(state, left, size),
    shortLine: shortLine(state, left, size),
    meterLine: meterLine(state, left, size),
  };
}
