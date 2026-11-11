import { assertServerOnly, isCommerceMock, serverEnv } from './env';

assertServerOnly('resend');

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Very small HTML wrapper so plain-text emails still render in clients that prefer HTML. */
export function textToSimpleHtml(text: string): string {
  const body = escapeHtml(text).replaceAll('\n', '<br>\n');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0B0B0C"><p>${body}</p></body></html>`;
}

export async function sendEmail(
  input: SendEmailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string | null; skipped: boolean }> {
  if (isCommerceMock()) return { id: null, skipped: true };

  const apiKey = serverEnv('RESEND_API_KEY');
  const from = serverEnv('MAIL_FROM');
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and MAIL_FROM are required');

  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? textToSimpleHtml(input.text),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}`);
  }
  const data = (await res.json()) as { id?: string };
  return { id: data.id ?? null, skipped: false };
}
