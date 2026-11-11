import { createHash, randomUUID } from 'node:crypto';
import { createClient, type SanityClient } from '@sanity/client';
import { assertServerOnly, isCommerceMock, serverEnv } from './env';

assertServerOnly('sanity-write');

export type FormKind = 'notify' | 'contact' | 'newsletter';

export type SubmissionInput = {
  form: FormKind;
  email: string;
  name?: string;
  topic?: string;
  orderNumber?: string;
  reference?: string;
  message?: string;
  dropId?: string;
  pieceId?: string;
  letterOptIn?: boolean;
};

export type CustomerPrefs = { dropAlerts?: boolean; moments?: boolean };

export type AlertKind = 'last-piece' | 'drop-open';

let clientOverride: SanityClient | null | undefined;

/** Test seam: inject a mock client, or `null` to force the real factory on next call. */
export function setWriteClient(client: SanityClient | null | undefined): void {
  clientOverride = client;
}

function projectConfig() {
  const projectId = serverEnv('PUBLIC_SANITY_PROJECT_ID') || serverEnv('SANITY_STUDIO_PROJECT_ID');
  const dataset = serverEnv('PUBLIC_SANITY_DATASET') || serverEnv('SANITY_STUDIO_DATASET') || 'production';
  const token = serverEnv('SANITY_WRITE_TOKEN');
  if (!projectId || !token) throw new Error('SANITY_WRITE_TOKEN and project id are required');
  return { projectId, dataset, token };
}

export function getWriteClient(): SanityClient {
  if (clientOverride) return clientOverride;
  const { projectId, dataset, token } = projectConfig();
  return createClient({
    projectId,
    dataset,
    apiVersion: '2026-10-01',
    token,
    useCdn: false,
  });
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function notifyId(email: string, dropId?: string, pieceId?: string): string {
  return `submission.notify.${sha256(`${email.trim().toLowerCase()}|${dropId ?? ''}|${pieceId ?? ''}`)}`;
}

function weakRef(id: string) {
  return { _type: 'reference' as const, _ref: id, _weak: true };
}

function now(): string {
  return new Date().toISOString();
}

export async function createSubmission(
  input: SubmissionInput,
  client?: SanityClient,
): Promise<{ id: string; created: boolean }> {
  // Mock before getWriteClient — default-arg evaluation would throw without a write token.
  if (isCommerceMock()) {
    return {
      id:
        input.form === 'notify'
          ? notifyId(input.email, input.dropId, input.pieceId)
          : `submission.${randomUUID()}`,
      created: true,
    };
  }

  const c = client ?? getWriteClient();
  const id =
    input.form === 'notify'
      ? notifyId(input.email, input.dropId, input.pieceId)
      : `submission.${randomUUID()}`;

  const doc = {
    _id: id,
    _type: 'formSubmission' as const,
    form: input.form,
    status: input.form === 'notify' ? 'waiting' : 'new',
    createdAt: now(),
    email: input.email.trim().toLowerCase(),
    ...(input.name ? { name: input.name } : {}),
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.orderNumber ? { orderNumber: input.orderNumber } : {}),
    ...(input.reference ? { reference: input.reference } : {}),
    ...(input.message ? { message: input.message } : {}),
    ...(input.dropId ? { drop: weakRef(input.dropId) } : {}),
    ...(input.pieceId ? { piece: weakRef(input.pieceId) } : {}),
    ...(input.letterOptIn != null ? { letterOptIn: input.letterOptIn } : {}),
  };

  if (input.form === 'notify') {
    const existed = await c.fetch<boolean>('count(*[_id == $id]) > 0', { id });
    if (existed) return { id, created: false };
    await c.createIfNotExists(doc);
    return { id, created: true };
  }

  await c.create(doc);
  return { id, created: true };
}

export type CustomerProfile = {
  _id: string;
  customerId: string;
  email?: string;
  wishlist?: { _key: string; piece?: { _ref: string }; addedAt?: string }[];
  prefs?: CustomerPrefs;
  updatedAt?: string;
};

export async function getProfile(
  customerId: string,
  client: SanityClient = getWriteClient(),
): Promise<CustomerProfile | null> {
  if (isCommerceMock()) return null;
  return client.fetch<CustomerProfile | null>('*[_id == $id][0]', {
    id: `customer.${customerId}`,
  });
}

async function ensureProfile(
  customerId: string,
  email: string | undefined,
  client: SanityClient,
): Promise<string> {
  const id = `customer.${customerId}`;
  await client.createIfNotExists({
    _id: id,
    _type: 'customerProfile',
    customerId,
    ...(email ? { email } : {}),
    wishlist: [],
    prefs: { dropAlerts: false, moments: false },
    updatedAt: now(),
  });
  return id;
}

export async function addToWishlist(
  customerId: string,
  pieceId: string,
  email?: string,
  client: SanityClient = getWriteClient(),
): Promise<void> {
  if (isCommerceMock()) return;
  const id = await ensureProfile(customerId, email, client);
  const key = pieceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  await client
    .patch(id)
    .setIfMissing({ wishlist: [] })
    .unset([`wishlist[piece._ref=="${pieceId}"]`])
    .insert('after', 'wishlist[-1]', [
      {
        _key: key,
        piece: weakRef(pieceId),
        addedAt: now(),
      },
    ])
    .set({ updatedAt: now(), ...(email ? { email } : {}) })
    .commit({ autoGenerateArrayKeys: false });
}

export async function removeFromWishlist(
  customerId: string,
  pieceId: string,
  client: SanityClient = getWriteClient(),
): Promise<void> {
  if (isCommerceMock()) return;
  const id = `customer.${customerId}`;
  await client
    .patch(id)
    .unset([`wishlist[piece._ref=="${pieceId}"]`])
    .set({ updatedAt: now() })
    .commit();
}

export async function setPrefs(
  customerId: string,
  prefs: CustomerPrefs,
  email?: string,
  client: SanityClient = getWriteClient(),
): Promise<void> {
  if (isCommerceMock()) return;
  const id = await ensureProfile(customerId, email, client);
  await client
    .patch(id)
    .set({
      prefs: {
        dropAlerts: Boolean(prefs.dropAlerts),
        moments: Boolean(prefs.moments),
      },
      updatedAt: now(),
      ...(email ? { email } : {}),
    })
    .commit();
}

/** Delete formSubmission docs matching a GROQ filter fragment (already scoped to the type). */
export async function deleteSubmissions(
  filter: string,
  params: Record<string, unknown> = {},
  client: SanityClient = getWriteClient(),
): Promise<number> {
  if (isCommerceMock()) return 0;
  const ids = await client.fetch<string[]>(`*[_type == "formSubmission" && (${filter})]._id`, params);
  if (!ids.length) return 0;
  const tx = client.transaction();
  for (const id of ids) tx.delete(id);
  await tx.commit();
  return ids.length;
}

export async function logAlertOnce(
  kind: AlertKind,
  slug: string,
  extra: { recipients?: number; pieceId?: string; dropId?: string } = {},
  client: SanityClient = getWriteClient(),
): Promise<boolean> {
  const id = `alert.${kind}.${slug}`;
  if (isCommerceMock()) return true;

  const existed = await client.fetch<boolean>('count(*[_id == $id]) > 0', { id });
  if (existed) return false;

  await client.createIfNotExists({
    _id: id,
    _type: 'alertLog',
    kind,
    sentAt: now(),
    recipients: extra.recipients ?? 0,
    ...(extra.pieceId ? { piece: weakRef(extra.pieceId) } : {}),
    ...(extra.dropId ? { drop: weakRef(extra.dropId) } : {}),
  });
  return true;
}
