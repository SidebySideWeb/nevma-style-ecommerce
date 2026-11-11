import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOTICE_STYLE, TABLE_WRAP_STYLE, proseToHtml } from './prose';
import type { Prose } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../../');

/** Inner HTML of the prose content div in each care page block snippet. */
function snippetInner(page: string): string {
  const html = readFileSync(join(root, `design/build/blocks/${page}/03-care.html`), 'utf8');
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  const open = article.lastIndexOf('<div>');
  return article.slice(open + '<div>'.length, article.lastIndexOf('</div>')).trim();
}

function tagOrder(s: string): string[] {
  return [...s.matchAll(/<\/?(?:p|h3|ul|li|div|table|thead|tbody|tr|th|td|button)\b[^>]*>/gi)].map(
    (m) => m[0].replace(/\s+/g, ' '),
  );
}

describe('proseToHtml vs care snippets', () => {
  it('renders shipping: paragraph, table wrap, h3, p', () => {
    const body: Prose = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Every order is packed by hand in London and each piece is numbered when it goes in the box. We ship Monday to Thursday.',
            marks: [],
          },
        ],
      },
      {
        _type: 'simpleTable',
        head: ['Where', 'Service', 'Time', 'Cost'],
        rows: [
          { cells: ['United Kingdom', 'Tracked', '2 to 4 working days', '£6'] },
          { cells: ['United Kingdom', 'Next day', 'Order by 1 pm, Mon to Thu', '£12'] },
          { cells: ['London', 'Collect by appointment', 'From the next working day', 'Free'] },
          { cells: ['Europe', 'DHL Express', '2 to 4 working days', '[£18]'] },
          { cells: ['Rest of world', 'DHL Express', '3 to 6 working days', '[£25]'] },
        ],
      },
      {
        _type: 'block',
        style: 'h3',
        markDefs: [],
        children: [{ _type: 'span', text: 'Duties and taxes', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'UK prices include VAT. Outside the UK, [we pay duties for you (DDP) / your courier may ask for import duties on delivery (DAP)]. Final wording once NEVMA chooses.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h3',
        markDefs: [],
        children: [{ _type: 'span', text: 'Tracking', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'You get an email with tracking and the numbers of your pieces when your order ships. Signed-in clients see the same in their account.',
            marks: [],
          },
        ],
      },
    ];

    const html = proseToHtml(body);
    const design = snippetInner('care-shipping');

    expect(html).toContain('<p>Every order is packed by hand in London');
    expect(html).toContain(`<div style="${TABLE_WRAP_STYLE}"><table class="s-tbl">`);
    expect(html).toContain('<th scope="col">Where</th>');
    expect(html).toContain('<th scope="col">Cost</th>');
    expect(html).toContain('<h3>Duties and taxes</h3>');
    expect(html).toContain('<h3>Tracking</h3>');
    expect(tagOrder(html)).toEqual(tagOrder(design));
  });

  it('renders returns: ul/li bullets matching the snippet', () => {
    const body: Prose = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Limited does not mean final. You can return any piece within 14 days of delivery.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h3',
        markDefs: [],
        children: [{ _type: 'span', text: 'How to return', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Tell us within 14 days from the day it arrives: from your account, or by writing to client care with your order number.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Send it back within 14 more days, unworn, with its label and numbered card.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'We refund the piece and your original delivery cost to the same card through Viva, within 14 days of receiving it.',
            marks: [],
          },
        ],
      },
    ];

    const html = proseToHtml(body);
    expect(html).toContain('<ul><li>Tell us within 14 days');
    expect(html).toContain('</li><li>Send it back within 14 more days');
    expect(html).toContain('</li></ul>');
    const design = snippetInner('care-returns');
    expect(design).toContain('<ul><li>Tell us within 14 days');
  });

  it('renders notice box with exact inline style', () => {
    const html = proseToHtml([
      { _type: 'notice', text: 'Draft for NEVMA’s lawyer. Placeholders in brackets.' },
      {
        _type: 'block',
        style: 'h3',
        markDefs: [],
        children: [{ _type: 'span', text: '1. Who we are', marks: [] }],
      },
    ]);
    expect(html).toBe(
      `<p style="${NOTICE_STYLE}">Draft for NEVMA’s lawyer. Placeholders in brackets.</p><h3>1. Who we are</h3>`,
    );
    const design = snippetInner('care-terms');
    expect(design).toContain(`style="${NOTICE_STYLE}"`);
  });

  it('renders cookies table with Cookie settings button', () => {
    const html = proseToHtml([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'We use a few cookies to run the shop, and analytics only if you say yes.',
            marks: [],
          },
        ],
      },
      {
        _type: 'simpleTable',
        head: ['Cookie', 'Purpose', 'Type', 'Lasts'],
        rows: [{ cells: ['ns_cart', 'Remembers your bag', 'Essential', '14 days'] }],
        cta: 'Cookie settings',
      },
    ]);
    expect(html).toContain('class="s-tbl"');
    expect(html).toContain(
      '<button type="button" class="s-btn s-btn-o s-btn-sm" data-consent-open>Cookie settings</button>',
    );
    const design = snippetInner('care-cookies');
    expect(design).toContain(
      '<button type="button" class="s-btn s-btn-o s-btn-sm">Cookie settings</button>',
    );
  });

  it('escapes HTML in text and supports em/strong/link marks', () => {
    const html = proseToHtml([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [{ _key: 'l1', _type: 'link', href: '/client-care/contact' }],
        children: [
          { _type: 'span', text: 'See ', marks: [] },
          { _type: 'span', text: 'care', marks: ['em', 'l1'] },
          { _type: 'span', text: ' & ', marks: [] },
          { _type: 'span', text: 'more', marks: ['strong'] },
        ],
      },
    ]);
    expect(html).toBe(
      '<p>See <a href="/client-care/contact"><em>care</em></a> &amp; <strong>more</strong></p>',
    );
  });
});
