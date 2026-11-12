import { describe, expect, it, vi } from 'vitest';
import { runDropsJob } from './drops';
import { runRetentionJob } from './retention';
import { runWishlistAlertsJob } from './wishlist-alerts';
import type { PieceCommerce } from '../../commerce/types';

describe('cron jobs (mocked clock)', () => {
  it('drops: emails notify list once, deletes submissions, revalidates', async () => {
    const now = new Date('2026-12-04T18:00:00Z');
    const sendEmail = vi.fn(async () => ({}));
    const deleteByIds = vi.fn(async (ids: string[]) => ids.length);
    const revalidate = vi.fn(async () => undefined);
    const claimed = new Set<string>();

    const result = await runDropsJob({
      now,
      siteUrl: 'https://style.nevma.test',
      listOpenedDrops: async (nowIso) => {
        expect(nowIso).toBe(now.toISOString());
        return [
          {
            _id: 'drop.style-002',
            code: 'STYLE 002',
            name: 'Winter',
            slug: 'style-002',
            opensAt: '2026-12-04T18:00:00Z',
            pieceIds: ['piece.a'],
          },
        ];
      },
      listNotifySubs: async () => [
        { _id: 'submission.1', email: 'one@test' },
        { _id: 'submission.2', email: 'one@test' },
        { _id: 'submission.3', email: 'two@test' },
      ],
      logAlertOnce: async (_k, slug) => {
        if (claimed.has(slug)) return false;
        claimed.add(slug);
        return true;
      },
      deleteByIds,
      sendEmail,
      revalidate,
    });

    expect(result).toEqual({
      checked: 1,
      alerted: ['style-002'],
      emailed: 2,
      deleted: 3,
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'one@test',
        subject: expect.stringContaining('STYLE 002'),
      }),
    );
    expect(deleteByIds).toHaveBeenCalledWith(['submission.1', 'submission.2', 'submission.3']);
    expect(revalidate).toHaveBeenCalledWith(['/', '/drops/style-002', '/pieces']);

    const again = await runDropsJob({
      now,
      siteUrl: 'https://style.nevma.test',
      listOpenedDrops: async () => [
        {
          _id: 'drop.style-002',
          code: 'STYLE 002',
          name: 'Winter',
          slug: 'style-002',
          opensAt: '2026-12-04T18:00:00Z',
          pieceIds: [],
        },
      ],
      listNotifySubs: async () => [{ _id: 'submission.9', email: 'late@test' }],
      logAlertOnce: async (_k, slug) => !claimed.has(slug) && (claimed.add(slug), true),
      deleteByIds,
      sendEmail,
      revalidate,
    });
    expect(again.alerted).toEqual([]);
    expect(again.emailed).toBe(0);
  });

  it('retention: deletes contact submissions older than 24 months from mocked now', async () => {
    const now = new Date('2026-11-11T12:00:00Z');
    let seenCutoff = '';
    const result = await runRetentionJob({
      now,
      deleteOlderThan: async (cutoff) => {
        seenCutoff = cutoff;
        return 4;
      },
    });
    expect(result.deleted).toBe(4);
    expect(seenCutoff).toBe(new Date('2024-11-11T12:00:00Z').toISOString());
  });

  it('wishlist-alerts: emails once when left count is 1', async () => {
    const sendEmail = vi.fn(async () => ({}));
    const claimed = new Set<string>();
    const piece = (handle: string, left: number): PieceCommerce => ({
      handle,
      title: handle,
      published: true,
      editionSize: 5,
      price: { amount: '120.00', currency: 'EUR' },
      variants: [
        {
          id: `${handle}-m`,
          size: 'M',
          quantityAvailable: left,
          availableForSale: left > 0,
        },
      ],
    });

    const result = await runWishlistAlertsJob({
      siteUrl: 'https://style.nevma.test',
      listWishlistedPieces: async () => [
        {
          pieceId: 'piece.cap',
          handle: 'suede-cap-black',
          title: 'Suede Cap',
          emails: ['a@test', 'b@test', 'a@test'],
        },
        {
          pieceId: 'piece.tee',
          handle: 'tee',
          title: 'Tee',
          emails: ['c@test'],
        },
      ],
      getPieces: async () => [piece('suede-cap-black', 1), piece('tee', 3)],
      logAlertOnce: async (_k, handle) => {
        if (claimed.has(handle)) return false;
        claimed.add(handle);
        return true;
      },
      sendEmail,
    });

    expect(result.alerted).toEqual(['suede-cap-black']);
    expect(result.emailed).toBe(2);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Suede Cap'),
        to: 'a@test',
      }),
    );

    const again = await runWishlistAlertsJob({
      siteUrl: 'https://style.nevma.test',
      listWishlistedPieces: async () => [
        {
          pieceId: 'piece.cap',
          handle: 'suede-cap-black',
          title: 'Suede Cap',
          emails: ['a@test'],
        },
      ],
      getPieces: async () => [piece('suede-cap-black', 1)],
      logAlertOnce: async (_k, handle) => !claimed.has(handle) && (claimed.add(handle), true),
      sendEmail,
    });
    expect(again.emailed).toBe(0);
  });
});
