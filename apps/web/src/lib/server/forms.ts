import { z } from 'zod';
import { parseWithZod } from './http';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'invalid_email')
  .email('invalid_email')
  .transform((v) => v.toLowerCase());

export const notifySchema = z.object({
  email: emailSchema,
  dropId: z.string().trim().optional(),
  pieceId: z.string().trim().optional(),
  pieceHandle: z.string().trim().optional(),
  letterOptIn: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  'cf-turnstile-response': z.string().optional(),
  turnstileToken: z.string().optional(),
});

export const contactSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, 'name_required'),
  message: z.string().trim().min(1, 'message_required'),
  topic: z.string().trim().min(1, 'topic_required'),
  orderNumber: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  'cf-turnstile-response': z.string().optional(),
  turnstileToken: z.string().optional(),
});

export const subscribeSchema = z.object({
  email: emailSchema,
  company: z.string().optional(),
  website: z.string().optional(),
  'cf-turnstile-response': z.string().optional(),
  turnstileToken: z.string().optional(),
});

export function isHoneypot(body: Record<string, string>): boolean {
  return Boolean((body.company || body.website || '').trim());
}

export function turnstileTokenOf(body: Record<string, string>): string | undefined {
  return body['cf-turnstile-response'] || body.turnstileToken || undefined;
}

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: Record<string, string>,
): { ok: true; data: T } | { ok: false; error: string } {
  return parseWithZod(schema, body);
}

export function truthyFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'on';
}
