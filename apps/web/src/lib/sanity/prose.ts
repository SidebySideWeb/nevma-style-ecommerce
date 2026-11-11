import type {
  Prose,
  ProseBlock,
  ProseMarkDef,
  ProseNode,
  ProseNotice,
  ProseSpan,
  ProseTable,
} from './types';

export const NOTICE_STYLE =
  'padding: 14px 16px; background: #F5F2EC; border: 1px solid #CFC7B8; border-radius: 6px; font-size: 14px';

export const TABLE_WRAP_STYLE = 'overflow-x: auto; margin: 24px 0';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarks(text: string, marks: string[] | undefined, markDefs: ProseMarkDef[]): string {
  let html = escapeHtml(text);
  if (!marks?.length) return html;
  const defs = new Map(markDefs.map((d) => [d._key, d]));
  // First mark in the array becomes the outermost wrapper.
  for (const mark of marks) {
    if (mark === 'em') html = `<em>${html}</em>`;
    else if (mark === 'strong') html = `<strong>${html}</strong>`;
    else {
      const def = defs.get(mark);
      if (def?._type === 'link' && def.href) {
        const href = escapeHtml(def.href);
        html = `<a href="${href}">${html}</a>`;
      }
    }
  }
  return html;
}

function renderChildren(block: ProseBlock): string {
  const defs = block.markDefs || [];
  return (block.children || [])
    .map((child: ProseSpan) => renderMarks(child.text || '', child.marks, defs))
    .join('');
}

/** First `lineText` / block’s children only (no wrapping `<p>`) — drop intro, etc. */
export function lineTextToHtml(body: Prose): string {
  if (!body?.length) return '';
  for (const node of body) {
    if (node._type === 'block') return renderChildren(node as ProseBlock);
  }
  return '';
}

function isBullet(node: ProseNode): boolean {
  return node._type === 'block' && (node as ProseBlock).listItem === 'bullet';
}

function renderBlock(block: ProseBlock): string {
  const inner = renderChildren(block);
  if (block.style === 'h3') return `<h3>${inner}</h3>`;
  return `<p>${inner}</p>`;
}

function renderNotice(node: ProseNotice): string {
  const text = escapeHtml(node.text || '');
  return `<p style="${NOTICE_STYLE}">${text}</p>`;
}

function renderTable(node: ProseTable): string {
  const head = node.head || [];
  const th = head.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const rows = (node.rows || [])
    .map((row) => {
      const cells = (row.cells || []).map((c) => `<td>${escapeHtml(c)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');
  let html = `<div style="${TABLE_WRAP_STYLE}"><table class="s-tbl"><thead><tr>${th}</tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
  if (node.cta?.trim()) {
    const cta = node.cta.trim();
    const consent = /cookie settings/i.test(cta) ? ' data-consent-open' : '';
    html += `\n<button type="button" class="s-btn s-btn-o s-btn-sm"${consent}>${escapeHtml(cta)}</button>`;
  }
  return html;
}

/** Portable Text → exact `.s-prose` inner markup (no article wrapper). */
export function proseToHtml(body: Prose): string {
  if (!body?.length) return '';
  const out: string[] = [];
  let i = 0;
  while (i < body.length) {
    const node = body[i]!;
    if (isBullet(node)) {
      const items: string[] = [];
      while (i < body.length && isBullet(body[i]!)) {
        items.push(`<li>${renderChildren(body[i] as ProseBlock)}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (node._type === 'notice') out.push(renderNotice(node));
    else if (node._type === 'simpleTable') out.push(renderTable(node));
    else if (node._type === 'block') out.push(renderBlock(node));
    i += 1;
  }
  return out.join('');
}
