import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToWishlist,
  createSubmission,
  deleteSubmissions,
  logAlertOnce,
  removeFromWishlist,
  setPrefs,
  setWriteClient,
} from './sanity-write';

function mockClient() {
  const calls = {
    create: vi.fn(async (doc: { _id: string }) => doc),
    createIfNotExists: vi.fn(async (doc: { _id: string }) => doc),
    fetch: vi.fn(async () => false as boolean | string[]),
    patchArgs: [] as unknown[],
    setIfMissingArgs: [] as unknown[],
    unsetArgs: [] as unknown[],
    insertArgs: [] as unknown[],
    setArgs: [] as unknown[],
    commitOpts: [] as unknown[],
    txDeletes: [] as string[],
    txCommit: vi.fn(async () => ({})),
  };

  const builder: Record<string, unknown> = {};
  builder.setIfMissing = vi.fn((v: unknown) => {
    calls.setIfMissingArgs.push(v);
    return builder;
  });
  builder.unset = vi.fn((v: unknown) => {
    calls.unsetArgs.push(v);
    return builder;
  });
  builder.insert = vi.fn((pos: string, path: string, items: unknown) => {
    calls.insertArgs.push([pos, path, items]);
    return builder;
  });
  builder.set = vi.fn((v: unknown) => {
    calls.setArgs.push(v);
    return builder;
  });
  builder.commit = vi.fn(async (opts?: unknown) => {
    calls.commitOpts.push(opts);
    return {};
  });

  const client = {
    create: calls.create,
    createIfNotExists: calls.createIfNotExists,
    fetch: calls.fetch,
    patch: vi.fn((id: string) => {
      calls.patchArgs.push(id);
      return builder;
    }),
    transaction: vi.fn(() => ({
      delete: (id: string) => {
        calls.txDeletes.push(id);
        return client.transaction();
      },
      commit: calls.txCommit,
    })),
  };

  return { client: client as never, calls, builder };
}

describe('sanity-write helpers', () => {
  beforeEach(() => {
    process.env.COMMERCE_MOCK = '0';
    process.env.PUBLIC_SANITY_PROJECT_ID = 'j931aey9';
    process.env.SANITY_WRITE_TOKEN = 'test-token';
  });

  afterEach(() => {
    setWriteClient(undefined);
    vi.restoreAllMocks();
    delete process.env.COMMERCE_MOCK;
  });

  it('createSubmission uses a deterministic notify id and createIfNotExists', async () => {
    const m = mockClient();
    m.calls.fetch.mockResolvedValueOnce(false);
    setWriteClient(m.client);

    const first = await createSubmission({
      form: 'notify',
      email: 'Alex@Example.com',
      dropId: 'drop-style-001',
      pieceId: 'piece-definition-tee-white',
    });

    expect(first.created).toBe(true);
    expect(first.id).toMatch(/^submission\.notify\.[a-f0-9]{64}$/);
    expect(m.calls.createIfNotExists).toHaveBeenCalledOnce();
    const doc = m.calls.createIfNotExists.mock.calls[0]![0] as {
      _id: string;
      email: string;
      status: string;
      drop: { _ref: string; _weak: boolean };
    };
    expect(doc._id).toBe(first.id);
    expect(doc.email).toBe('alex@example.com');
    expect(doc.status).toBe('waiting');
    expect(doc.drop).toEqual({ _type: 'reference', _ref: 'drop-style-001', _weak: true });

    m.calls.fetch.mockResolvedValueOnce(true);
    const second = await createSubmission({
      form: 'notify',
      email: 'alex@example.com',
      dropId: 'drop-style-001',
      pieceId: 'piece-definition-tee-white',
    });
    expect(second.id).toBe(first.id);
    expect(second.created).toBe(false);
    expect(m.calls.createIfNotExists).toHaveBeenCalledOnce();
  });

  it('createSubmission uses a uuid id for contact forms', async () => {
    const m = mockClient();
    setWriteClient(m.client);
    const result = await createSubmission({
      form: 'contact',
      email: 'a@b.co',
      topic: 'Order',
      message: 'Hello',
    });
    expect(result.id).toMatch(/^submission\.[0-9a-f-]{36}$/);
    expect(m.calls.create).toHaveBeenCalledOnce();
    expect(m.calls.createIfNotExists).not.toHaveBeenCalled();
  });

  it('addToWishlist patches with setIfMissing + insert', async () => {
    const m = mockClient();
    setWriteClient(m.client);

    await addToWishlist('99', 'piece-definition-tee-white', 'a@b.co');

    expect(m.calls.createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'customer.99', customerId: '99' }),
    );
    expect(m.calls.patchArgs).toEqual(['customer.99']);
    expect(m.calls.setIfMissingArgs).toEqual([{ wishlist: [] }]);
    expect(m.calls.unsetArgs[0]).toEqual(['wishlist[piece._ref=="piece-definition-tee-white"]']);
    expect(m.calls.insertArgs[0]).toEqual([
      'after',
      'wishlist[-1]',
      expect.arrayContaining([
        expect.objectContaining({
          piece: { _type: 'reference', _ref: 'piece-definition-tee-white', _weak: true },
        }),
      ]),
    ]);
  });

  it('removeFromWishlist unsets by piece ref', async () => {
    const m = mockClient();
    setWriteClient(m.client);
    await removeFromWishlist('99', 'piece-definition-tee-white');
    expect(m.calls.patchArgs).toEqual(['customer.99']);
    expect(m.calls.unsetArgs[0]).toEqual(['wishlist[piece._ref=="piece-definition-tee-white"]']);
  });

  it('setPrefs writes dropAlerts and moments', async () => {
    const m = mockClient();
    setWriteClient(m.client);
    await setPrefs('99', { dropAlerts: true, moments: false }, 'a@b.co');
    expect(m.calls.setArgs[0]).toEqual(
      expect.objectContaining({
        prefs: { dropAlerts: true, moments: false },
        email: 'a@b.co',
      }),
    );
  });

  it('deleteSubmissions deletes matching ids in a transaction', async () => {
    const m = mockClient();
    m.calls.fetch.mockResolvedValueOnce(['submission.a', 'submission.b']);
    setWriteClient(m.client);
    const n = await deleteSubmissions('email == $email', { email: 'a@b.co' });
    expect(n).toBe(2);
    expect(m.calls.txDeletes).toEqual(['submission.a', 'submission.b']);
    expect(m.calls.txCommit).toHaveBeenCalledOnce();
  });

  it('logAlertOnce uses createIfNotExists and returns false when present', async () => {
    const m = mockClient();
    m.calls.fetch.mockResolvedValueOnce(false);
    setWriteClient(m.client);
    await expect(logAlertOnce('drop-open', 'style-001', { recipients: 3 })).resolves.toBe(true);
    expect(m.calls.createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'alert.drop-open.style-001', kind: 'drop-open', recipients: 3 }),
    );

    m.calls.fetch.mockResolvedValueOnce(true);
    await expect(logAlertOnce('drop-open', 'style-001')).resolves.toBe(false);
  });

  it('skips Sanity writes in COMMERCE_MOCK', async () => {
    process.env.COMMERCE_MOCK = '1';
    const m = mockClient();
    setWriteClient(m.client);
    await createSubmission({ form: 'contact', email: 'a@b.co' });
    await addToWishlist('1', 'piece-x');
    await expect(logAlertOnce('last-piece', 'h')).resolves.toBe(true);
    expect(m.calls.create).not.toHaveBeenCalled();
    expect(m.calls.createIfNotExists).not.toHaveBeenCalled();
    expect(m.calls.patchArgs).toEqual([]);
  });
});
