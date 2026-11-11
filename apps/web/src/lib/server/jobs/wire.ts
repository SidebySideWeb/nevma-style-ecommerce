import { createCommerceProvider } from '../../commerce/provider';
import { sanityFetch } from '../../sanity/client';
import { isCommerceMock, serverEnv } from '../env';
import { deleteSubmissions, getWriteClient, logAlertOnce } from '../sanity-write';
import { sendEmail } from '../resend';
import { runDropsJob, type OpenDrop, type NotifySubmission } from './drops';
import { runRetentionJob } from './retention';
import { runWishlistAlertsJob, type WishlistPiece } from './wishlist-alerts';

function siteUrl(): string {
  return (serverEnv('PUBLIC_SITE_URL') || 'http://localhost:4321').replace(/\/$/, '');
}

async function revalidatePaths(paths: string[]): Promise<void> {
  if (isCommerceMock()) return;
  const secret = serverEnv('SANITY_REVALIDATE_SECRET') || serverEnv('CRON_SECRET');
  if (!secret) return;
  const origin = siteUrl();
  await fetch(`${origin}/api/revalidate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ paths }),
  }).catch(() => null);
}

export async function executeDropsJob(now = new Date()) {
  return runDropsJob({
    now,
    siteUrl: siteUrl(),
    listOpenedDrops: async (nowIso) => {
      if (isCommerceMock()) return [];
      return sanityFetch<OpenDrop[]>(
        `*[_type == "drop" && defined(opensAt) && opensAt <= $now]{
          _id, code, name, "slug": slug.current, opensAt,
          "pieceIds": *[_type == "piece" && drop._ref == ^._id]._id
        }`,
        { now: nowIso },
      );
    },
    listNotifySubs: async (dropId, pieceIds) => {
      if (isCommerceMock()) return [];
      return sanityFetch<NotifySubmission[]>(
        `*[_type == "formSubmission" && form == "notify" && (
          drop._ref == $dropId || piece._ref in $pieceIds
        )]{_id, email}`,
        { dropId, pieceIds },
      );
    },
    logAlertOnce,
    deleteByIds: async (ids) => {
      if (!ids.length || isCommerceMock()) return 0;
      const client = getWriteClient();
      const tx = client.transaction();
      for (const id of ids) tx.delete(id);
      await tx.commit();
      return ids.length;
    },
    sendEmail,
    revalidate: revalidatePaths,
  });
}

export async function executeRetentionJob(now = new Date()) {
  return runRetentionJob({
    now,
    deleteOlderThan: (cutoffIso) =>
      deleteSubmissions('form == "contact" && createdAt < $cutoff', { cutoff: cutoffIso }),
  });
}

export async function executeWishlistAlertsJob() {
  return runWishlistAlertsJob({
    siteUrl: siteUrl(),
    listWishlistedPieces: async () => {
      if (isCommerceMock()) return [];
      type Row = {
        pieceId: string;
        handle?: string;
        title?: string;
        emails?: (string | null)[];
      };
      const rows = await sanityFetch<Row[]>(
        `*[_type == "piece" && count(*[_type == "customerProfile" && references(^._id)]) > 0]{
          "pieceId": _id,
          title,
          "handle": coalesce(product->store.slug.current, handle.current),
          "emails": *[_type == "customerProfile" && references(^._id)].email
        }`,
      );
      return rows
        .filter((r): r is WishlistPiece => Boolean(r.handle && r.title))
        .map((r) => ({
          pieceId: r.pieceId,
          handle: r.handle!,
          title: r.title!,
          emails: (r.emails || []).filter((e): e is string => Boolean(e)),
        }));
    },
    getPieces: async (handles) => createCommerceProvider().getPieces(handles),
    logAlertOnce,
    sendEmail,
  });
}
