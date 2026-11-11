import type { StructureResolver } from 'sanity/structure';
import { SINGLETONS } from './schemaTypes';

const single = (S: Parameters<StructureResolver>[0], id: string, title: string) =>
  S.listItem().title(title).id(id).child(S.document().schemaType(id).documentId(id).title(title));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('NEVMA Style')
    .items([
      S.listItem().title('Pages').child(
        S.list().title('Pages').items(SINGLETONS.filter((s) => s.group === 'pages').map((s) => single(S, s.id, s.title))),
      ),
      S.divider(),
      S.documentTypeListItem('drop').title('Drops'),
      S.documentTypeListItem('piece').title('Pieces'),
      S.documentTypeListItem('category').title('Categories'),
      S.divider(),
      S.listItem().title('Client care and legal').child(
        S.list().title('Client care and legal').items([
          single(S, 'clientCarePage', 'Client care page (FAQ, contact)'),
          S.documentTypeListItem('infoPage').title('Policy and legal pages'),
        ]),
      ),
      S.divider(),
      S.listItem().title('Requests and customers').child(
        S.list().title('Requests and customers').items([
          S.listItem().title('Contact messages').child(S.documentList().title('Contact messages').schemaType('formSubmission').filter('_type == "formSubmission" && form == "contact"').defaultOrdering([{ field: 'createdAt', direction: 'desc' }])),
          S.listItem().title('Contact messages · new').child(S.documentList().title('New').schemaType('formSubmission').filter('_type == "formSubmission" && form == "contact" && status == "new"')),
          S.listItem().title('Notify-me requests').child(S.documentList().title('Notify-me requests').schemaType('formSubmission').filter('_type == "formSubmission" && form == "notify"').defaultOrdering([{ field: 'createdAt', direction: 'desc' }])),
          S.listItem().title('Newsletter sign-ups').child(S.documentList().title('Newsletter').schemaType('formSubmission').filter('_type == "formSubmission" && form == "newsletter"')),
          S.divider(),
          S.documentTypeListItem('customerProfile').title('Customers (wishlist, preferences)'),
          S.documentTypeListItem('alertLog').title('Alerts sent'),
        ]),
      ),
      S.divider(),
      S.listItem().title('Shopify (synced, read-only)').child(
        S.list().title('Shopify (synced by Sanity Connect)').items([
          S.documentTypeListItem('product').title('Products'),
          S.documentTypeListItem('productVariant').title('Variants'),
          S.documentTypeListItem('collection').title('Collections'),
        ]),
      ),
      S.divider(),
      ...SINGLETONS.filter((s) => s.group === 'settings').map((s) => single(S, s.id, s.title)),
    ]);
