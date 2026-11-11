import { describe, expect, it } from 'vitest';
import {
  renderContactCare,
  renderContactConfirm,
  renderDropOpen,
  renderLastPiece,
  renderNewsletterConfirm,
  renderNotifyConfirm,
} from './templates';
import { emailCopy } from './copy';

describe('email templates', () => {
  it('notify confirm uses shared copy', () => {
    const mail = renderNotifyConfirm('STYLE 002', 'Winter');
    expect(mail.subject).toBe(emailCopy.notifyConfirm.subject('STYLE 002'));
    expect(mail.text).toContain('STYLE 002');
    expect(mail.html).toContain('NEVMA · STYLE');
    expect(mail.html).toContain('#F0E81C');
  });

  it('drop open and last piece include links', () => {
    const drop = renderDropOpen('STYLE 002', 'Winter', 'https://style.nevma.test/drops/style-002');
    expect(drop.html).toContain('https://style.nevma.test/drops/style-002');
    expect(drop.text).toContain('STYLE 002 · Winter is open');

    const last = renderLastPiece('Suede Cap', 'https://style.nevma.test/pieces/suede-cap');
    expect(last.subject).toContain('Suede Cap');
    expect(last.html).toContain('See the piece');
  });

  it('contact and newsletter copy render', () => {
    expect(renderNewsletterConfirm().subject).toBe(emailCopy.newsletterConfirm.subject);
    expect(renderContactConfirm().text).toContain('client care');
    const care = renderContactCare({
      name: 'Alex',
      email: 'a@b.co',
      topic: 'Orders',
      message: 'Help',
      orderNumber: 'NS-1',
    });
    expect(care.text).toContain('Order: NS-1');
    expect(care.subject).toBe('Client care · Orders');
  });
});
