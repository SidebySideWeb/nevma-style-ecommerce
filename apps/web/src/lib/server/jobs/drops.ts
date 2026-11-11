import { renderDropOpen } from '../../../emails/templates';
import type { SendEmailInput } from '../resend';

export type OpenDrop = {
  _id: string;
  code: string;
  name: string;
  slug: string;
  opensAt: string;
  pieceIds: string[];
};

export type NotifySubmission = {
  _id: string;
  email: string;
};

export type DropsJobDeps = {
  now: Date;
  siteUrl: string;
  listOpenedDrops: (nowIso: string) => Promise<OpenDrop[]>;
  listNotifySubs: (dropId: string, pieceIds: string[]) => Promise<NotifySubmission[]>;
  logAlertOnce: (
    kind: 'drop-open',
    slug: string,
    extra?: { recipients?: number; dropId?: string },
  ) => Promise<boolean>;
  deleteByIds: (ids: string[]) => Promise<number>;
  sendEmail: (input: SendEmailInput) => Promise<unknown>;
  revalidate: (paths: string[]) => Promise<void>;
};

export type DropsJobResult = {
  checked: number;
  alerted: string[];
  emailed: number;
  deleted: number;
};

export async function runDropsJob(deps: DropsJobDeps): Promise<DropsJobResult> {
  const nowIso = deps.now.toISOString();
  const drops = await deps.listOpenedDrops(nowIso);
  const result: DropsJobResult = { checked: drops.length, alerted: [], emailed: 0, deleted: 0 };

  for (const drop of drops) {
    if (!drop.slug) continue;

    const subs = await deps.listNotifySubs(drop._id, drop.pieceIds || []);
    const emails = [
      ...new Set(subs.map((s) => s.email.trim().toLowerCase()).filter(Boolean)),
    ];

    const first = await deps.logAlertOnce('drop-open', drop.slug, {
      recipients: emails.length,
      dropId: drop._id,
    });
    if (!first) continue;

    const url = `${deps.siteUrl.replace(/\/$/, '')}/drops/${drop.slug}`;
    const mail = renderDropOpen(drop.code, drop.name, url);

    for (const email of emails) {
      await deps.sendEmail({ to: email, ...mail });
      result.emailed += 1;
    }

    const ids = subs.map((s) => s._id);
    if (ids.length) result.deleted += await deps.deleteByIds(ids);

    result.alerted.push(drop.slug);
    await deps.revalidate(['/', `/drops/${drop.slug}`, '/pieces']);
  }

  return result;
}
