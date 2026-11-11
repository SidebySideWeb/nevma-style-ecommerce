/**
 * Data written by the site (not by editors): form submissions, customer profiles (wishlist + preferences)
 * and the alert log. Replaces a separate database: Style's volumes are small (pieces of five).
 * IDs contain a "." (submission.<uuid>, customer.<shopify id>, alert.last-piece.<handle>) so they are
 * never readable without a token, even if the dataset were made public. The site writes with an Editor
 * robot token (SANITY_WRITE_TOKEN, server only). The revalidate webhook ignores these types.
 */
import { defineArrayMember, defineField, defineType } from 'sanity';

const ro = { readOnly: true } as const;

export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form submission',
  type: 'document',
  fields: [
    defineField({ name: 'form', type: 'string', ...ro, options: { list: [
      { title: 'Notify me (drop or piece)', value: 'notify' }, { title: 'Contact', value: 'contact' }, { title: 'Newsletter (footer)', value: 'newsletter' }] } }),
    defineField({ name: 'status', type: 'string', title: 'Status', description: 'Contact: new → replied. Notify: waiting → sent (sent requests are deleted by the drop job).',
      options: { list: ['new', 'replied', 'waiting', 'sent', 'spam'], layout: 'radio' }, initialValue: 'new' }),
    defineField({ name: 'createdAt', type: 'datetime', ...ro }),
    defineField({ name: 'email', type: 'string', ...ro }),
    defineField({ name: 'name', type: 'string', ...ro }),
    defineField({ name: 'topic', type: 'string', ...ro, description: 'Contact topic (Order, Return, A piece, Press, Other)' }),
    defineField({ name: 'orderNumber', type: 'string', ...ro }),
    defineField({ name: 'reference', type: 'string', ...ro, description: 'Piece reference when sent from a piece page' }),
    defineField({ name: 'message', type: 'text', rows: 6, ...ro }),
    defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }], weak: true, ...ro }),
    defineField({ name: 'piece', type: 'reference', to: [{ type: 'piece' }], weak: true, ...ro }),
    defineField({ name: 'letterOptIn', type: 'boolean', ...ro, title: 'Also wants the NEVMA Style letter' }),
    defineField({ name: 'sentAt', type: 'datetime', ...ro }),
    defineField({ name: 'internalNote', type: 'text', rows: 2, title: 'Internal note' }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'createdAt', direction: 'desc' }] }],
  preview: {
    select: { form: 'form', email: 'email', topic: 'topic', status: 'status', at: 'createdAt', drop: 'drop.code', piece: 'piece.title' },
    prepare: ({ form, email, topic, status, at, drop, piece }) => ({
      title: email || '(no email)',
      subtitle: [form === 'contact' ? topic : form === 'notify' ? piece || drop : form, status, at ? new Date(at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : ''].filter(Boolean).join(' · '),
    }),
  },
});

export const customerProfile = defineType({
  name: 'customerProfile',
  title: 'Customer (wishlist and preferences)',
  type: 'document',
  description: 'One per signed-in Shopify customer. Orders, addresses and names stay in Shopify.',
  fields: [
    defineField({ name: 'customerId', type: 'string', title: 'Shopify customer ID', ...ro }),
    defineField({ name: 'email', type: 'string', ...ro }),
    defineField({ name: 'wishlist', type: 'array', ...ro, of: [defineArrayMember({ type: 'object', name: 'wish', fields: [
      defineField({ name: 'piece', type: 'reference', to: [{ type: 'piece' }], weak: true }), defineField({ name: 'addedAt', type: 'datetime' })],
      preview: { select: { title: 'piece.title', subtitle: 'addedAt' } } })] }),
    defineField({ name: 'prefs', type: 'object', ...ro, fields: [
      defineField({ name: 'dropAlerts', type: 'boolean', title: 'Drop alerts' }), defineField({ name: 'moments', type: 'boolean', title: 'Pieces released at Moments' })] }),
    defineField({ name: 'updatedAt', type: 'datetime', ...ro }),
  ],
  preview: { select: { title: 'email', n: 'wishlist' }, prepare: ({ title, n }) => ({ title, subtitle: `${(n || []).length} saved` }) },
});

export const alertLog = defineType({
  name: 'alertLog',
  title: 'Alert sent',
  type: 'document',
  fields: [
    defineField({ name: 'kind', type: 'string', ...ro, options: { list: ['last-piece', 'drop-open'] } }),
    defineField({ name: 'piece', type: 'reference', to: [{ type: 'piece' }], weak: true, ...ro }),
    defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }], weak: true, ...ro }),
    defineField({ name: 'recipients', type: 'number', ...ro }),
    defineField({ name: 'sentAt', type: 'datetime', ...ro }),
  ],
  preview: { select: { kind: 'kind', piece: 'piece.title', drop: 'drop.code', at: 'sentAt', n: 'recipients' }, prepare: ({ kind, piece, drop, at, n }) => ({ title: `${kind}: ${piece || drop || ''}`, subtitle: `${n ?? 0} emails · ${at ?? ''}` }) },
});

export const SITE_WRITTEN_TYPES = ['formSubmission', 'customerProfile', 'alertLog'];
export const requestTypes = [formSubmission, customerProfile, alertLog];
