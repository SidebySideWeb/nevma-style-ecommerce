import {
  clientIp,
  formError,
  formSuccess,
  parseForm,
} from './http';
import { isCommerceMock, serverEnv } from './env';
import { createSubmission } from './sanity-write';
import { rateLimit } from './ratelimit';
import { verifyTurnstile } from './turnstile';
import { sendEmail } from './resend';
import {
  contactSchema,
  isHoneypot,
  notifySchema,
  parseBody,
  subscribeSchema,
  truthyFlag,
  turnstileTokenOf,
} from './forms';
import {
  renderContactCare,
  renderContactConfirm,
  renderNewsletterConfirm,
  renderNotifyConfirm,
} from '../../emails/templates';

export type FormHandlerDeps = {
  rateLimit: typeof rateLimit;
  verifyTurnstile: typeof verifyTurnstile;
  createSubmission: typeof createSubmission;
  sendEmail: typeof sendEmail;
  isMock: () => boolean;
  careTo: () => string | undefined;
  lookupDrop: (dropId: string) => Promise<{ code: string; name: string } | null>;
};

const defaultDeps: FormHandlerDeps = {
  rateLimit,
  verifyTurnstile,
  createSubmission,
  sendEmail,
  isMock: isCommerceMock,
  careTo: () => serverEnv('CLIENT_CARE_TO'),
  lookupDrop: async () => null,
};

async function requireHuman(
  body: Record<string, string>,
  ip: string,
  deps: FormHandlerDeps,
): Promise<boolean> {
  if (deps.isMock()) return true;
  return deps.verifyTurnstile(turnstileTokenOf(body), ip);
}

export async function handleNotify(
  request: Request,
  overrides: Partial<FormHandlerDeps> = {},
): Promise<Response> {
  const deps = { ...defaultDeps, ...overrides };
  const ip = clientIp(request);
  const limited = await deps.rateLimit(ip, 'notify', { limit: 10, windowMs: 60_000 });
  if (!limited.ok) return formError(request, 'rate_limited', 429, '/');

  const body = await parseForm(request);
  if (isHoneypot(body)) return formSuccess(request, '/', { form: 'notify' });

  const parsed = parseBody(notifySchema, body);
  if (!parsed.ok) return formError(request, parsed.error, 400, '/');

  if (!(await requireHuman(body, ip, deps))) {
    return formError(request, 'turnstile', 400, '/');
  }

  const data = parsed.data;
  await deps.createSubmission({
    form: 'notify',
    email: data.email,
    dropId: data.dropId || undefined,
    pieceId: data.pieceId || undefined,
    letterOptIn: truthyFlag(data.letterOptIn),
  });

  if (data.dropId) {
    const drop = await deps.lookupDrop(data.dropId);
    if (drop) {
      const mail = renderNotifyConfirm(drop.code, drop.name);
      await deps.sendEmail({ to: data.email, ...mail }).catch(() => null);
    }
  }

  const pieceHandle = (data.pieceHandle || '').trim();
  const redirect = pieceHandle ? `/pieces/${pieceHandle}` : '/';
  return formSuccess(request, redirect, { form: 'notify' });
}

export async function handleContact(
  request: Request,
  overrides: Partial<FormHandlerDeps> = {},
): Promise<Response> {
  const deps = { ...defaultDeps, ...overrides };
  const ip = clientIp(request);
  const redirect = '/client-care/contact';
  const limited = await deps.rateLimit(ip, 'contact', { limit: 8, windowMs: 60_000 });
  if (!limited.ok) return formError(request, 'rate_limited', 429, redirect);

  const body = await parseForm(request);
  if (isHoneypot(body)) return formSuccess(request, redirect, { form: 'contact' });

  const parsed = parseBody(contactSchema, body);
  if (!parsed.ok) return formError(request, parsed.error, 400, redirect);

  if (!(await requireHuman(body, ip, deps))) {
    return formError(request, 'turnstile', 400, redirect);
  }

  const data = parsed.data;
  await deps.createSubmission({
    form: 'contact',
    email: data.email,
    name: data.name,
    topic: data.topic,
    message: data.message,
    orderNumber: data.orderNumber || undefined,
    reference: data.reference || undefined,
  });

  const care = renderContactCare({
    name: data.name,
    email: data.email,
    topic: data.topic,
    message: data.message,
    orderNumber: data.orderNumber,
    reference: data.reference,
  });
  const careTo = deps.careTo();
  if (careTo) {
    await deps.sendEmail({ to: careTo, ...care }).catch(() => null);
  }

  const confirm = renderContactConfirm();
  await deps.sendEmail({ to: data.email, ...confirm }).catch(() => null);

  return formSuccess(request, redirect, { form: 'contact' });
}

export async function handleSubscribe(
  request: Request,
  overrides: Partial<FormHandlerDeps> = {},
): Promise<Response> {
  const deps = { ...defaultDeps, ...overrides };
  const ip = clientIp(request);
  const limited = await deps.rateLimit(ip, 'subscribe', { limit: 10, windowMs: 60_000 });
  if (!limited.ok) return formError(request, 'rate_limited', 429, '/');

  const body = await parseForm(request);
  if (isHoneypot(body)) return formSuccess(request, '/', { form: 'newsletter' });

  const parsed = parseBody(subscribeSchema, body);
  if (!parsed.ok) return formError(request, parsed.error, 400, '/');

  if (!(await requireHuman(body, ip, deps))) {
    return formError(request, 'turnstile', 400, '/');
  }

  await deps.createSubmission({ form: 'newsletter', email: parsed.data.email });

  const mail = renderNewsletterConfirm();
  await deps.sendEmail({ to: parsed.data.email, ...mail }).catch(() => null);

  return formSuccess(request, '/', { form: 'newsletter' });
}
