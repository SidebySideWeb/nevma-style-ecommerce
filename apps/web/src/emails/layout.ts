import { emailCopy } from './copy';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Brand HTML shell: bone ground, black type, yellow accent rule. */
export function brandHtml(opts: { title: string; paragraphs: string[]; cta?: { label: string; href: string } }): string {
  const paras = opts.paragraphs
    .map((p) => {
      const withLinks = escapeHtml(p).replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#0B0B0C;text-decoration:underline">$1</a>',
      );
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#3E3B35">${withLinks}</p>`;
    })
    .join('');
  const cta = opts.cta
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;padding:14px 22px;background:#0B0B0C;color:#F5F2EC;text-decoration:none;font-family:Montserrat,Helvetica Neue,Arial,sans-serif;font-size:12px;letter-spacing:0.22em;text-transform:uppercase">${escapeHtml(opts.cta.label)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="en-GB">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#ECE7DE;color:#0B0B0C">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ECE7DE">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" style="max-width:560px;background:#F5F2EC;border:1px solid #CFC7B8">
        <tr><td style="padding:28px 28px 8px;font-family:Montserrat,Helvetica Neue,Arial,sans-serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#0B0B0C">NEVMA · STYLE</td></tr>
        <tr><td style="padding:0 28px"><div style="height:2px;width:48px;background:#F0E81C"></div></td></tr>
        <tr><td style="padding:24px 28px 8px;font-family:Montserrat,Helvetica Neue,Arial,sans-serif;font-size:22px;letter-spacing:0.12em;text-transform:uppercase;color:#0B0B0C">${escapeHtml(opts.title)}</td></tr>
        <tr><td style="padding:8px 28px 28px;font-family:'Nunito Sans',Helvetica Neue,Arial,sans-serif">${paras}${cta}</td></tr>
        <tr><td style="padding:18px 28px 28px;border-top:1px solid #CFC7B8;font-family:'Nunito Sans',Helvetica Neue,Arial,sans-serif;font-size:13px;color:#615D55">${escapeHtml(emailCopy.brand.footerNote)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}
