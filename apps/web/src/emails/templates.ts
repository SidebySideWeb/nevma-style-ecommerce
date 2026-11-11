import { emailCopy } from './copy';
import { brandHtml, textToParagraphs } from './layout';

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderNotifyConfirm(dropCode: string, dropName: string): RenderedEmail {
  const subject = emailCopy.notifyConfirm.subject(dropCode);
  const text = emailCopy.notifyConfirm.text(dropName, dropCode);
  return {
    subject,
    text,
    html: brandHtml({ title: subject, paragraphs: textToParagraphs(text) }),
  };
}

export function renderNewsletterConfirm(): RenderedEmail {
  const subject = emailCopy.newsletterConfirm.subject;
  const text = emailCopy.newsletterConfirm.text;
  return {
    subject,
    text,
    html: brandHtml({ title: subject, paragraphs: textToParagraphs(text) }),
  };
}

export function renderContactConfirm(): RenderedEmail {
  const subject = emailCopy.contactConfirm.subject;
  const text = emailCopy.contactConfirm.text;
  return {
    subject,
    text,
    html: brandHtml({ title: subject, paragraphs: textToParagraphs(text) }),
  };
}

export function renderContactCare(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
  orderNumber?: string;
  reference?: string;
}): RenderedEmail {
  const subject = emailCopy.contactCare.subject(input.topic);
  const text = emailCopy.contactCare.text(input);
  return {
    subject,
    text,
    html: brandHtml({ title: subject, paragraphs: textToParagraphs(text) }),
  };
}

export function renderDropOpen(dropCode: string, dropName: string, url: string): RenderedEmail {
  const subject = emailCopy.dropOpen.subject(dropCode, dropName);
  const text = emailCopy.dropOpen.text(dropCode, dropName, url);
  return {
    subject,
    text,
    html: brandHtml({
      title: subject,
      paragraphs: textToParagraphs(text),
      cta: { label: 'See the drop', href: url },
    }),
  };
}

export function renderLastPiece(title: string, url: string): RenderedEmail {
  const subject = emailCopy.lastPiece.subject(title);
  const text = emailCopy.lastPiece.text(title, url);
  return {
    subject,
    text,
    html: brandHtml({
      title: subject,
      paragraphs: textToParagraphs(text),
      cta: { label: 'See the piece', href: url },
    }),
  };
}
