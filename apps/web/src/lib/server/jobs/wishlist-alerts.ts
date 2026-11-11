import { leftCount } from '../../commerce/edition';
import type { PieceCommerce } from '../../commerce/types';
import { renderLastPiece } from '../../../emails/templates';
import type { SendEmailInput } from '../resend';

export type WishlistPiece = {
  pieceId: string;
  handle: string;
  title: string;
  emails: string[];
};

export type WishlistAlertsDeps = {
  siteUrl: string;
  listWishlistedPieces: () => Promise<WishlistPiece[]>;
  getPieces: (handles: string[]) => Promise<PieceCommerce[]>;
  logAlertOnce: (
    kind: 'last-piece',
    handle: string,
    extra?: { recipients?: number; pieceId?: string },
  ) => Promise<boolean>;
  sendEmail: (input: SendEmailInput) => Promise<unknown>;
};

export type WishlistAlertsResult = {
  checked: number;
  alerted: string[];
  emailed: number;
};

export async function runWishlistAlertsJob(
  deps: WishlistAlertsDeps,
): Promise<WishlistAlertsResult> {
  const rows = await deps.listWishlistedPieces();
  const handles = [...new Set(rows.map((r) => r.handle).filter(Boolean))];
  const pieces = await deps.getPieces(handles);
  const byHandle = new Map(pieces.map((p) => [p.handle, p]));

  const result: WishlistAlertsResult = { checked: rows.length, alerted: [], emailed: 0 };

  for (const row of rows) {
    const commerce = byHandle.get(row.handle);
    if (!commerce) continue;
    if (leftCount(commerce.variants) !== 1) continue;

    const emails = [...new Set(row.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const first = await deps.logAlertOnce('last-piece', row.handle, {
      recipients: emails.length,
      pieceId: row.pieceId,
    });
    if (!first) continue;

    const url = `${deps.siteUrl.replace(/\/$/, '')}/pieces/${row.handle}`;
    const mail = renderLastPiece(row.title, url);
    for (const email of emails) {
      await deps.sendEmail({ to: email, ...mail });
      result.emailed += 1;
    }
    result.alerted.push(row.handle);
  }

  return result;
}
