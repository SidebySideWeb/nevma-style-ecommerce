import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStore, rateLimit } from './ratelimit';
import { handleContact, handleNotify, handleSubscribe } from './form-handlers';

function jsonRequest(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.9',
    },
    body: JSON.stringify(body),
  });
}

describe('form API handlers', () => {
  const store = createMemoryStore();
  const createSubmission = vi.fn(async () => ({ id: 'submission.x', created: true }));
  const sendEmail = vi.fn(async () => ({ id: 'mail_1', skipped: false }));
  const verifyTurnstile = vi.fn(async () => true);
  const lookupDrop = vi.fn(async () => ({ code: 'STYLE 002', name: 'Winter' }));

  const deps = {
    rateLimit: (ip: string, route: string, opts?: { limit?: number; windowMs?: number }) =>
      rateLimit(ip, route, { ...opts, store }),
    verifyTurnstile,
    createSubmission,
    sendEmail,
    isMock: () => false,
    careTo: () => 'care@nevma.test',
    lookupDrop,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    verifyTurnstile.mockResolvedValue(true);
    createSubmission.mockResolvedValue({ id: 'submission.x', created: true });
  });

  it('notify: good request stores submission and emails confirm', async () => {
    const res = await handleNotify(
      jsonRequest('/api/notify', {
        email: 'Alex@Example.com',
        dropId: 'drop.style-002',
        turnstileToken: 'tok',
      }),
      deps,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, form: 'notify' });
    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ form: 'notify', email: 'alex@example.com', dropId: 'drop.style-002' }),
    );
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('notify: invalid email', async () => {
    const res = await handleNotify(jsonRequest('/api/notify', { email: 'not-an-email' }), deps);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('notify: bad Turnstile', async () => {
    verifyTurnstile.mockResolvedValueOnce(false);
    const res = await handleNotify(
      jsonRequest('/api/notify', { email: 'a@b.co', turnstileToken: 'bad' }),
      deps,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: 'turnstile' });
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('notify: honeypot pretends success and stores nothing', async () => {
    const res = await handleNotify(
      jsonRequest('/api/notify', { email: 'a@b.co', company: 'Spam Co' }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, form: 'notify' });
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('notify: rate limit', async () => {
    const limStore = createMemoryStore();
    const tight = {
      ...deps,
      rateLimit: (ip: string, route: string) =>
        rateLimit(ip, route, { limit: 1, windowMs: 60_000, store: limStore }),
    };
    await handleNotify(jsonRequest('/api/notify', { email: 'a@b.co', turnstileToken: 't' }), tight);
    const res = await handleNotify(
      jsonRequest('/api/notify', { email: 'b@b.co', turnstileToken: 't' }),
      tight,
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, error: 'rate_limited' });
  });

  it('contact: good request notifies care and confirms shopper', async () => {
    const res = await handleContact(
      jsonRequest('/api/contact', {
        email: 'alex@nevma.test',
        name: 'Alex',
        topic: 'A piece',
        message: 'Hello',
        turnstileToken: 'tok',
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ form: 'contact', name: 'Alex', topic: 'A piece' }),
    );
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('contact: honeypot', async () => {
    const res = await handleContact(
      jsonRequest('/api/contact', {
        email: 'a@b.co',
        name: 'A',
        topic: 'T',
        message: 'M',
        website: 'http://spam',
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('subscribe: invalid email and good path', async () => {
    const bad = await handleSubscribe(jsonRequest('/api/subscribe', { email: '' }), deps);
    expect(bad.status).toBe(400);

    const good = await handleSubscribe(
      jsonRequest('/api/subscribe', { email: 'letter@nevma.test', turnstileToken: 't' }),
      deps,
    );
    expect(good.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith({
      form: 'newsletter',
      email: 'letter@nevma.test',
    });
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('no-JS success redirects with ?sent=1', async () => {
    const req = new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'a@b.co', turnstileToken: 't' }),
    });
    const res = await handleSubscribe(req, deps);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/?sent=1');
  });
});
