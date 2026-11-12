/**
 * All outbound email copy in one place for NEVMA to review.
 * Edit subjects and bodies here; templates pull from this file.
 */

export const emailCopy = {
  brand: {
    fromName: 'NEVMA Style',
    signOff: '- NEVMA Style · London',
    footerNote: 'NEVMA Style · London. Limited by design.',
  },

  /** Shopper confirmation after notify-me (home / piece). */
  notifyConfirm: {
    subject: (dropCode: string) => `You’re on the list · ${dropCode}`,
    text: (dropName: string, dropCode: string) =>
      [
        `You’re on the list.`,
        ``,
        `We’ll email you the moment ${dropCode} · ${dropName} opens.`,
        `No newsletter unless you asked for the letter.`,
        ``,
        `- NEVMA Style · London`,
      ].join('\n'),
  },

  /** Shopper confirmation after footer subscribe. */
  newsletterConfirm: {
    subject: 'NEVMA Style letter',
    text: [
      `You’re on the NEVMA Style letter.`,
      ``,
      `Stories and early looks, about once a month. Unsubscribe any time from the link in each email.`,
      ``,
      `- NEVMA Style · London`,
    ].join('\n'),
  },

  /** Shopper confirmation after contact form. */
  contactConfirm: {
    subject: 'We have your message',
    text: [
      `Thank you. Your message reached client care; we’ll reply by tomorrow evening.`,
      ``,
      `- NEVMA Style · London`,
    ].join('\n'),
  },

  /** Internal: new contact message to client care. */
  contactCare: {
    subject: (topic: string) => `Client care · ${topic}`,
    text: (input: {
      name: string;
      email: string;
      topic: string;
      message: string;
      orderNumber?: string;
      reference?: string;
    }) =>
      [
        `New message from the site.`,
        ``,
        `From: ${input.name} <${input.email}>`,
        `Topic: ${input.topic}`,
        input.orderNumber ? `Order: ${input.orderNumber}` : null,
        input.reference ? `Reference: ${input.reference}` : null,
        ``,
        input.message,
      ]
        .filter(Boolean)
        .join('\n'),
  },

  /** Drop has opened - sent once per notify request, then the request is deleted. */
  dropOpen: {
    subject: (dropCode: string, dropName: string) => `${dropCode} · ${dropName} is open`,
    text: (dropCode: string, dropName: string, url: string) =>
      [
        `${dropCode} · ${dropName} is open.`,
        ``,
        `See the pieces and buy while they last:`,
        url,
        ``,
        `This was the one email you asked for. We won’t write again about this drop.`,
        ``,
        `- NEVMA Style · London`,
      ].join('\n'),
  },

  /** Wishlist last-piece alert. */
  lastPiece: {
    subject: (title: string) => `Last one · ${title}`,
    text: (title: string, url: string) =>
      [
        `${title} is down to its last one.`,
        ``,
        `You saved it on your wishlist. If you still want it:`,
        url,
        ``,
        `- NEVMA Style · London`,
      ].join('\n'),
  },
} as const;
